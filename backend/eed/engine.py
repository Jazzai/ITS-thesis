def evaluate_divergence(predicted, actual, test_case_passed):
    if test_case_passed:
        return None # Not a meaningful divergence
        
    if str(predicted) != str(actual):
        return {
            "status": "divergence_detected",
            "taxonomy": "Loop", # Simplified mapping
            "predicted": predicted,
            "actual": actual
        }
    return None
