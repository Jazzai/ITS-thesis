"""Llama-backed Hint Planner, NL Generator and Response Evaluator.

The EED engine, the hint level and the fallback decision stay deterministic.
Llama only chooses the focus and the wording inside those limits.

condition = "eed"     -> context includes checkpoint line, predicted, actual, taxonomy
condition = "control" -> context includes only the code and the test-output diff
Both conditions use the same pipeline, prompts and sampling settings, so the
only manipulated variable is the information the model receives.
"""
import re
import time

from .llm import MODEL, LLMError, chat

PROMPT_VERSION = "v1"

PLAN_SCHEMA = {
    "type": "object",
    "properties": {"focus": {"type": "string"}, "concept": {"type": "string"}},
    "required": ["focus", "concept"],
}
EVAL_SCHEMA = {
    "type": "object",
    "properties": {"identifies_cause": {"type": "boolean"}, "feedback": {"type": "string"}},
    "required": ["identifies_cause", "feedback"],
}

PLAN = (
    "You are the planning step of a Socratic C++ tutor. From the data, pick the single "
    "line or construct the next hint should focus on, and the concept behind it "
    "(e.g. 'loop boundary', 'return value', 'integer division'). Do not propose a fix."
)
TUTOR = (
    "You are a Socratic C++ tutor for first-year students. Never write corrected code "
    "and never state the exact fix. Reply with 1-2 plain-text sentences ending in a question."
)
LEVELS = {
    1: "Ask one open question that gets the student to describe what they expected this part of the code to do.",
    2: "Direct attention to the relevant construct ({concept}) and ask whether it behaves as they intended.",
    3: "Point to the evidence in the data below and ask the student why the two values differ.",
}
EXPLAIN = (
    "You are a C++ tutor. The student has not found the bug after several hints. "
    "Explain the bug directly in 2-3 sentences and show the one-line fix."
)
EVALUATE = (
    "You judge whether a novice's explanation correctly identifies the cause of a bug. "
    "Set identifies_cause accordingly. feedback: one encouraging sentence, no code, "
    "do not reveal the fix if identifies_cause is false."
)

FALLBACK = {
    1: "What did you expect this part of the program to do?",
    2: "Look closely at the line that produces this value. Does it do what you intended?",
}


def _context_block(condition, code, ctx):
    if condition == "eed":
        return (
            f"Student code:\n{code}\n\n"
            f"Checkpoint at line {ctx['line']}: the student predicted {ctx['predicted']}, "
            f"the program actually produced {ctx['actual']}. Error category: {ctx['taxonomy']}."
        )
    return (
        f"Student code:\n{code}\n\n"
        f"Test result: expected output {ctx['expected_output']!r}, "
        f"program printed {ctx['actual_output']!r}."
    )


def _norm(s):
    return re.sub(r"\s+", "", s).rstrip(";")


def _leaks_fix(text, exercise):
    """Levels 1-3 must not reveal the fix or contain code blocks."""
    return "```" in text or _norm(exercise["seeded_bug"]["fixed"]) in _norm(text)


def _fallback(level, exercise, ctx):
    if level >= 4:
        bug = exercise["seeded_bug"]
        return f"{bug['root_cause']} Fix: {bug['fixed']}"
    if level == 3:
        if "predicted" in ctx:
            return f"Your code produced {ctx['actual']}, but you expected {ctx['predicted']}."
        return "Compare the expected output with what your program printed. Where do they first differ?"
    return FALLBACK[level]


def get_hint(condition, level, exercise, code, ctx):
    """level 1-3 = Socratic, 4 = direct explanation (hint-exhausted)."""
    started = time.time()
    block = _context_block(condition, code, ctx)
    text, source = None, "template"
    try:
        if level >= 4:
            text = chat(EXPLAIN, f"{block}\n\nGround truth: {exercise['seeded_bug']['root_cause']}")
            source = "llm"
        else:
            plan = chat(PLAN, block, schema=PLAN_SCHEMA)
            system = TUTOR + " " + LEVELS[level].format(concept=plan["concept"])
            for _ in range(2):  # one retry if the hint leaks the fix
                candidate = chat(system, f"{block}\n\nFocus: {plan['focus']}")
                if not _leaks_fix(candidate, exercise):
                    text, source = candidate, "llm"
                    break
    except (LLMError, KeyError):
        pass
    if text is None:
        text = _fallback(level, exercise, ctx)
    return {
        "text": text,
        "source": source,  # log this: "template" means Llama failed or leaked
        "model": MODEL,
        "prompt_version": PROMPT_VERSION,
        "latency_ms": int((time.time() - started) * 1000),
    }


def evaluate_reply(exercise, student_text):
    """Response Evaluator: did the student's free-text explanation find the cause?"""
    user = (
        f"Ground truth cause: {exercise['seeded_bug']['root_cause']}\n"
        f"Student said: {student_text}"
    )
    try:
        result = chat(EVALUATE, user, schema=EVAL_SCHEMA)
        if not result["identifies_cause"] and _leaks_fix(result["feedback"], exercise):
            raise LLMError("feedback leaked the fix")
        return result
    except (LLMError, KeyError):
        return {"identifies_cause": False, "feedback": "Thanks. Keep tracing the code against your prediction."}