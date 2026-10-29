"""FastAPI entry point the React frontend talks to.

Run from the repo root:  uvicorn backend.app:app --host 0.0.0.0 --port 8000

/run      compile + run tests; in EED mode also trace and pick the checkpoint to ask about
/predict  compare the student's prediction with the traced value, then Llama hint
/hint     control condition: generic Socratic hint from the same Llama pipeline
/reply    Response Evaluator for a student's free-text explanation
"""
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.analysis.ast_parser import loop_body_line
from backend.eed.engine import evaluate_divergence, values_match
from backend.logger import init_db, log_event
from backend.tracing.gdb_script import capture_loop_count, capture_value
from backend.tutor.hints import AttemptTracker
from backend.tutor.llm_tutor import evaluate_reply, get_hint

ROOT = Path(__file__).resolve().parent.parent
WORK = Path(tempfile.gettempdir()) / "its-work"
SESSION_RE = re.compile(r"^[A-Za-z0-9_-]{1,40}$")
MAX_CODE = 20_000
PUBLIC_FIELDS = ("id", "title", "category", "difficulty", "description", "starter_code")

EXERCISES = {}
for _f in sorted((ROOT / "exercises").glob("*_exercise.json")):  # skips the old ex1_loop.json stub
    _ex = json.loads(_f.read_text(encoding="utf-8"))
    EXERCISES[_ex["id"]] = _ex

SESSIONS = {}  # session_id -> {"code", "last_fail", "pending"}  (single-process only)
ATTEMPTS = AttemptTracker()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
os.makedirs("data", exist_ok=True)  # logger.py writes data/sessions.db relative to the cwd
init_db()


# ---------------------------------------------------------------- helpers
def _exercise(exercise_id):
    ex = EXERCISES.get(exercise_id)
    if not ex:
        raise HTTPException(404, "Unknown exercise")
    return ex


def _session(session_id):
    if not SESSION_RE.match(session_id):  # the id becomes a directory name
        raise HTTPException(400, "Bad session id")
    return SESSIONS.setdefault(session_id, {})


def _norm(s):
    return " ".join(s.split())


def _compile(code, session_id):
    d = WORK / session_id
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    src = d / "main.cpp"
    src.write_text(code, encoding="utf-8")
    exe = d / ("prog.exe" if os.name == "nt" else "prog")
    r = subprocess.run(
        ["g++", "-g", "-O0", "-std=c++17", str(src), "-o", str(exe)],
        capture_output=True, text=True, timeout=30,
    )
    return src, (exe if r.returncode == 0 else None), r.stderr


def _run_tests(exe, exercise):
    results = []
    for tc in exercise["test_cases"]:
        try:
            r = subprocess.run([str(exe)], input=tc["input"], capture_output=True, text=True, timeout=5)
        except subprocess.TimeoutExpired:
            return None
        results.append({
            "id": tc["id"], "input": tc["input"], "expected": tc["expected_output"],
            "stdout": r.stdout, "stderr": r.stderr, "exit_code": r.returncode,
            "passed": r.returncode == 0 and _norm(r.stdout) == _norm(tc["expected_output"]),
        })
    return results


def _pick_checkpoint(exercise, src, exe, tc):
    """Earliest checkpoint (by order) where the code's actual value != the correct value."""
    stdin_file = src.parent / "stdin.txt"
    stdin_file.write_text(tc["input"], encoding="utf-8")
    for cp in sorted(exercise["checkpoints"], key=lambda c: c["order"]):
        obs = cp["observe"]
        actual = None
        if obs["type"] == "variable_value":
            actual = capture_value(exe, cp["line"], obs["name"], stdin_file)
        elif obs["type"] == "loop_iteration_count":
            body = loop_body_line(str(src), obs["loop_line"])
            if body:
                actual = capture_loop_count(exe, body, cp["line"], stdin_file)
        correct = cp["values_by_test"][tc["id"]]["correct_value"]
        if actual is not None and not values_match(actual, correct, cp["tolerance"]):
            return cp, actual
    return None, None


# ---------------------------------------------------------------- endpoints
@app.get("/exercises")
def exercises():
    return [{k: ex[k] for k in PUBLIC_FIELDS} for ex in EXERCISES.values()]


class RunIn(BaseModel):
    code: str
    exercise_id: str
    session_id: str
    stdin: str = ""  # ignored: each test case supplies its own input


@app.post("/run")
def run(p: RunIn):
    ex = _exercise(p.exercise_id)
    sess = _session(p.session_id)
    if len(p.code) > MAX_CODE:
        raise HTTPException(413, "Code too long")

    src, exe, err = _compile(p.code, p.session_id)
    sess.clear()
    sess["code"] = p.code
    if exe is None:
        return {"error": "Compile Error", "stderr": err, "stdout": "", "exit_code": 1, "tests": [], "checkpoint": None}

    results = _run_tests(exe, ex)
    if results is None:
        return {"error": "Timeout (5 s). Check for an infinite loop.", "stdout": "", "stderr": "",
                "exit_code": -1, "tests": [], "checkpoint": None}

    failing = next((r for r in results if not r["passed"]), None)
    shown = failing or results[0]
    resp = {
        "stdout": shown["stdout"], "stderr": shown["stderr"], "exit_code": shown["exit_code"],
        "tests": [{"id": r["id"], "passed": r["passed"]} for r in results],
        "checkpoint": None,
    }
    if failing is None:
        ATTEMPTS.reset(p.session_id)
        return resp

    sess["last_fail"] = {"expected_output": failing["expected"], "actual_output": failing["stdout"]}
    cp, actual = _pick_checkpoint(ex, src, exe, failing)
    if cp:
        sess["pending"] = {"cp_id": cp["id"], "tc_id": failing["id"], "actual": actual}
        resp["checkpoint"] = {k: cp[k] for k in ("id", "line", "prediction_prompt", "answer_type")}
    return resp

MAX_OUT = 20_000

class FreeRunIn(BaseModel):
    code: str
    stdin: str = ""
    session_id: str


@app.post("/run-free")
def run_free(p: FreeRunIn):
    _session(p.session_id)  # validates the id
    if len(p.code) > MAX_CODE:
        raise HTTPException(413, "Code too long")
    if not p.code.strip():
        return {"error": "Write some code first.", "stdout": "", "stderr": "", "exit_code": 1}

    _, exe, err = _compile(p.code, p.session_id + "-free")
    if exe is None:
        return {"error": "Compile Error", "stderr": err[:MAX_OUT], "stdout": "", "exit_code": 1}
    try:
        r = subprocess.run([str(exe)], input=p.stdin, capture_output=True, text=True, timeout=5)
    except subprocess.TimeoutExpired:
        return {"error": "Timeout (5 s). Check for an infinite loop.", "stdout": "", "stderr": "", "exit_code": -1}

    log_event(p.session_id, "any", "free_run", {"exit_code": r.returncode})
    return {"stdout": r.stdout[:MAX_OUT], "stderr": r.stderr[:MAX_OUT], "exit_code": r.returncode}

class PredictIn(BaseModel):
    session_id: str
    exercise_id: str
    checkpoint_id: str
    predicted: str


@app.post("/predict")
def predict(p: PredictIn):
    ex = _exercise(p.exercise_id)
    sess = _session(p.session_id)
    pending = sess.get("pending")
    if not pending or pending["cp_id"] != p.checkpoint_id:
        raise HTTPException(409, "No pending checkpoint for this session. Run the code first.")
    cp = next(c for c in ex["checkpoints"] if c["id"] == p.checkpoint_id)
    correct = cp["values_by_test"][pending["tc_id"]]["correct_value"]

    v = evaluate_divergence(p.predicted, pending["actual"], correct, cp["tolerance"], cp["taxonomy_if_divergent"])
    out = {"match": v["match"], "meaningful": v["meaningful"], "actual": pending["actual"]}
    if v["match"] or not v["meaningful"]:
        return out  # encouragement / prediction noise: no Socratic intervention

    n = ATTEMPTS.next(p.session_id, cp["id"])
    ctx = {"line": cp["line"], "predicted": p.predicted, "actual": pending["actual"], "taxonomy": v["taxonomy"]}
    hint = get_hint("eed", min(n, 4), ex, sess["code"], ctx)
    log_event(p.session_id, "eed", "hint_generated", {"cp": cp["id"], "attempt": n, **hint})
    out.update(taxonomy=v["taxonomy"], level=min(n, 3), exhausted=n >= 4, hint=hint["text"])
    return out


class HintIn(BaseModel):
    session_id: str
    exercise_id: str


@app.post("/hint")
def hint(p: HintIn):
    ex = _exercise(p.exercise_id)
    sess = _session(p.session_id)
    fail = sess.get("last_fail")
    if not fail:
        return {"hint": "Run your code first so I can compare it with the tests.", "level": 0, "exhausted": False}
    n = ATTEMPTS.next(p.session_id, "control")
    ctx = {"expected_output": fail["expected_output"], "actual_output": fail["actual_output"]}
    out = get_hint("control", min(n, 4), ex, sess["code"], ctx)
    log_event(p.session_id, "control", "hint_generated", {"attempt": n, **out})
    return {"hint": out["text"], "level": min(n, 3), "exhausted": n >= 4}


class ReplyIn(BaseModel):
    session_id: str
    exercise_id: str
    text: str


@app.post("/reply")
def reply(p: ReplyIn):
    ex = _exercise(p.exercise_id)
    _session(p.session_id)
    result = evaluate_reply(ex, p.text[:1000])
    log_event(p.session_id, "any", "reply_evaluated", result)
    return result


class LogIn(BaseModel):
    session_id: str
    condition: str
    event: str
    details: dict = {}


@app.post("/log")
def log(p: LogIn):
    log_event(p.session_id, p.condition, p.event, p.details)
    return {"ok": True}