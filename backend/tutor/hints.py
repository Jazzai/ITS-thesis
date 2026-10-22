"""Hint-level bookkeeping.

The old TUTOR templates and TutorSession are replaced:
- hint wording now comes from llm_tutor.get_hint (with its own template fallback
  built from each exercise's seeded_bug, not a hardcoded "i<3 -> i<=3" string)
- attempts are counted per (session, key) instead of one counter per object
"""
from collections import defaultdict
from threading import Lock


class AttemptTracker:
    """Counts failed attempts per (session_id, key).

    key = checkpoint id in the EED condition, "control" in the control condition.
    next() returns 1, 2, 3, ... ; the caller maps >= 4 to the direct explanation
    (hint-exhausted).
    """

    def __init__(self):
        self._counts = defaultdict(int)
        self._lock = Lock()  # FastAPI runs sync endpoints in a thread pool

    def next(self, session_id: str, key: str) -> int:
        with self._lock:
            self._counts[(session_id, key)] += 1
            return self._counts[(session_id, key)]

    def reset(self, session_id: str) -> None:
        with self._lock:
            for k in [k for k in self._counts if k[0] == session_id]:
                del self._counts[k]