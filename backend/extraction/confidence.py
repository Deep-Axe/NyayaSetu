def score_extraction(pass1_result, pass2_result, ocr_confidence=None):
    """
    Compares two structurally different extraction passes to assign confidence scores.
    """
    import json
    # Simple agreement check - using json serialization to compare dicts stably
    # In a real system, this would be field-by-field semantic comparison
    
    pass1_str = json.dumps(pass1_result, sort_keys=True)
    pass2_str = json.dumps(pass2_result, sort_keys=True)
    agreement = (pass1_str == pass2_str)
    
    confidence = "high" if agreement else "low"
    
    # OCR Linkage: Cap confidence if OCR is shaky
    if ocr_confidence and ocr_confidence < 85:
        if confidence == "high":
            confidence = "medium"
            
    return {
        "confidence": confidence,
        "reason": "Agreement between two extraction passes" if agreement else "Divergent extraction results",
        "low_confidence_fields": [] if agreement else ["all"]
    }

def apply_confidence_to_judgment(judgment_data, ocr_meta=None):
    """
    Iterates through all fields and applies confidence scores.
    """
    # This would be the main entry point to refine the JudgmentExtraction object
    return judgment_data
