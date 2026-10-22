"""Capture runtime values with gdb in batch mode.

Changes from the original: feeds the test case's stdin, uses a unique temp
script instead of ./script.gdb, has a timeout, anchors the parse on "$N = "
(so program output containing " = " is not mistaken for the value), and adds
capture_loop_count() for the loop_iteration_count checkpoint type.
"""
import os
import re
import subprocess
import tempfile
from pathlib import Path

GDB_TIMEOUT = 15


def _run_gdb(executable, commands):
    with tempfile.NamedTemporaryFile("w", suffix=".gdb", delete=False) as f:
        f.write("\n".join(["set pagination off", "set confirm off", *commands, "quit"]) + "\n")
        script = f.name
    try:
        r = subprocess.run(
            ["gdb", "-batch", "-x", script, str(executable)],
            capture_output=True, text=True, timeout=GDB_TIMEOUT, stdin=subprocess.DEVNULL,
        )
        return r.stdout
    except subprocess.TimeoutExpired:
        return ""
    finally:
        os.unlink(script)


def _run_cmd(stdin_file):
    return f'run < "{Path(stdin_file).as_posix()}"'


def _parse(text):
    for cast in (int, float):
        try:
            return cast(text)
        except ValueError:
            pass
    return text.strip()


def capture_value(executable, line, variable, stdin_file):
    """Value of `variable` the first time execution reaches `line` (before it runs)."""
    out = _run_gdb(executable, [f"break {line}", _run_cmd(stdin_file), f"print {variable}"])
    m = re.search(r"^\$\d+ = (.+)$", out, re.M)
    return _parse(m.group(1).strip()) if m else None


def capture_loop_count(executable, body_line, after_line, stdin_file):
    """How many times the loop body ran, by counting hits on its first line."""
    out = _run_gdb(executable, [
        f"break {body_line}",        # breakpoint 1
        "ignore 1 1000000",          # count hits without stopping
        f"break {after_line}",       # breakpoint 2
        _run_cmd(stdin_file),
        "info breakpoints",
    ])
    hits, current = {}, None
    for ln in out.splitlines():
        m = re.match(r"^(\d+)\s+breakpoint", ln)
        if m:
            current = int(m.group(1))
            continue
        m = re.search(r"breakpoint already hit (\d+) times?", ln)
        if m and current is not None:
            hits[current] = int(m.group(1))
    return hits.get(1, 0)  # breakpoint 1 absent from `hits` means the body never ran