TEMPLATES = {
    "Loop": {
        1: "What did you expect the loop to do here?",
        2: "Look at your boundary condition. Is it looping the right amount of times?",
        3: "Your variable reached {actual}, but you expected {predicted}.",
        "fallback": "The loop condition stops too early. Change i<3 to i<=3."
    }
}

class TutorSession:
    def __init__(self):
        self.attempts = 0

    def get_next_hint(self, category, actual, predicted):
        self.attempts += 1
        if self.attempts >= 4:
            return TEMPLATES[category]["fallback"]
        
        hint = TEMPLATES[category][self.attempts]
        return hint.format(actual=actual, predicted=predicted)
