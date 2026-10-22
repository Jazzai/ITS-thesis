"""Expectation-Execution Divergence (EED) evaluation.

Per checkpoint_policy in the exercise JSON:
  match      = student's prediction equals what the code actually produced
  meaningful = what the code actually produced differs from the correct value
               (the code itself is wrong at this checkpoint)
Intervene only when NOT match and meaningful.
"""


def _num(v):
    try:
        return float(str(v).strip())
    except ValueError:
        return None


def values_match(a, b, tolerance=0):
    x, y = _num(a), _num(b)
    if x is not None and y is not None:
        return abs(x - y) <= tolerance + 1e-9
    # text: ignore leading/trailing/extra spaces, case-sensitive
    return " ".join(str(a).split()) == " ".join(str(b).split())


def evaluate_divergence(predicted, actual, correct, tolerance, taxonomy):
    match = values_match(predicted, actual, tolerance)
    meaningful = not values_match(actual, correct, tolerance)
    return {
        "match": match,
        "meaningful": meaningful,
        # taxonomy comes from checkpoint["taxonomy_if_divergent"], not a hardcoded "Loop"
        "taxonomy": taxonomy if (meaningful and not match) else None,
        "predicted": predicted,
        "actual": actual,
        "correct": correct,
    }