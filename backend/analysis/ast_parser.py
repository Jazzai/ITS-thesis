"""libclang helpers.  Install with:  pip install libclang

Fixes over the original:
- no hardcoded variable "sum" (callers pass the variable, or use the JSON checkpoints)
- only nodes from the student's file are visited; before, every for-loop inside
  <iostream> and other headers was reported as a checkpoint
- loop_body_line() lets the tracer count loop iterations without assuming the
  body starts on loop_line + 1 (breaks if the student moves the brace)
"""
import os

import clang.cindex as ci

_LOOPS = (ci.CursorKind.FOR_STMT, ci.CursorKind.WHILE_STMT, ci.CursorKind.DO_STMT)


def find_loops(filepath):
    """One dict per loop in the file: loop_line, body_line, after_line."""
    path = os.path.normpath(os.path.abspath(filepath))
    tu = ci.Index.create().parse(path, args=["-std=c++17"])
    loops = []

    def in_file(node):
        f = node.location.file
        return f is not None and os.path.normpath(os.path.abspath(f.name)) == path

    def walk(node):
        if node.location.file is not None and not in_file(node):
            return  # skip system headers
        if node.kind in _LOOPS:
            kids = list(node.get_children())
            body = kids[-1] if kids else node
            inner = list(body.get_children())
            first = inner[0] if body.kind == ci.CursorKind.COMPOUND_STMT and inner else body
            loops.append({
                "loop_line": node.extent.start.line,
                "body_line": first.extent.start.line,
                "after_line": node.extent.end.line + 1,
            })
        for child in node.get_children():
            walk(child)

    walk(tu.cursor)
    return loops


def loop_body_line(filepath, loop_line):
    """First statement line of the loop that starts on loop_line (None if not found)."""
    for lp in find_loops(filepath):
        if lp["loop_line"] == loop_line:
            return lp["body_line"]
    return None


def find_checkpoints(filepath, variable, rule="loop_end"):
    """Original API, now parameterised: a checkpoint on the line after each loop."""
    return [{"line": lp["after_line"], "variable": variable, "rule": rule} for lp in find_loops(filepath)]