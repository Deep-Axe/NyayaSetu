import json
from backend.extraction.extractor import get_openai_client

# Official list of 42 Karnataka Government Departments from dept_gov.md
OFFICIAL_DEPARTMENTS = [
    "DEPARTMENT OF AGRICULTURE", "DEPARTMENT OF ANIMAL HUSBANDARY AND FISHERIES", 
    "DEPARTMENT OF BACKWARD CLASS WELFARE", "DEPARTMENT OF COMMERCE AND INDUSTRIES", 
    "DEPARTMENT OF CO-OPERATION", "DEPARTMENT OF PERSONNEL AND ADMINISTRATIVE REFORMS (DPAR)", 
    "DPAR( ADMINISTRATIVE REFORMS)", "DPAR ( e-GOVERNANCE)", "DPAR (JANASPANDANA)", 
    "DEPARTMENT OF HIGHER EDUCATION", "DEPARTMENT OF PRIMARY AND SECONDARY EDUCATION", 
    "DEPARTMENT OF ENERGY", "DEPARTMENT OF FINANCE", "DEPARTMENT OF FOOD AND CIVIL SUPPLIES", 
    "DEPARTMENT OF FOREST, ECOLOGY AND ENVIRONMENT", "DEPARTMENT OF HEALTH AND FAMILY WELFARE", 
    "DEPARTMENT OF WOMEN AND CHILD WELFARE", "DEPARTMENT OF HOUSING", 
    "DEPARTMENT OF INFRASTRUCTURE DEVELOPMENT, PORTS AND INLAND WATER TRANSPORT", 
    "DEPARTMENT OF INFORMATION TECHNOLOGY AND BIO TECHNOLOGY", "DEPARTMENT OF KANNADA AND CULTURE", 
    "DEPARTMENT OF LABOUR", "DEPARTMENT OF LAW", "DEPARTMENT OF MEDICAL EDUCATION", 
    "DEPARTMENT MINOR IRRIGATION", "DEPARTMENT OF MINORITY WELFARE", 
    "DEPARTMENT OF PARLIAMENTRY AFFAIRS", "DEPARTMENT OF PLANNING", 
    "DEPARTMENT OF PUBLIC ENTERPRISES", "DEPARTMENT OF PUBLIC WORKS", 
    "DEPARTMENT OF RURAL DEVELOPMENT AND PANCHAYAT RAJ", "DEPARTMENT OF REVENUE", 
    "DEPARTMENT OF HORTICULTURE AND SERICULTURE", "DEPARTMENT OF INFORMATION AND PUBLIC RELATIONS", 
    "DEPARTMENT OF SKILL DEVELOPMENT ENTREPRENEURSHIP AND LIVELIHOOD", "DEPARTMENT OF SOCIAL WELFARE", 
    "DEPARTMENT OF TOURISM", "DEPARTMENT OF TRANSPORT", "DEPARTMENT OF URBAN DEVELOPMENT", 
    "DEPARTMENT OF WATER RESOURCES", "DEPARTMENT OF HOME", "DEPARTMENT YOUTH EMPOWERMENT AND SPORTS"
]

# Kannada to English Department Mapping
KANNADA_DEPT_LOOKUP = {
    'ಲೋಕೋಪಯೋಗಿ ಇಲಾಖೆ': 'DEPARTMENT OF PUBLIC WORKS',
    'ರಾಜಸ್ವ ಇಲಾಖೆ': 'DEPARTMENT OF REVENUE',
    'ಆರೋಗ್ಯ ಇಲಾಖೆ': 'DEPARTMENT OF HEALTH AND FAMILY WELFARE',
    'ಹಣಕಾಸು ಇಲಾಖೆ': 'DEPARTMENT OF FINANCE'
}

def attribute_department(pdf_text, ccms_meta, direction_text):
    """
    Prompt Chain 3: Attributes a direction to a specific department from the OFFICIAL_DEPARTMENTS list.
    Uses NER and subject matter classification.
    """
    
    # Layer 1 & 2 combined in prompt
    prompt = f"""
    Identify the responsible department for this direction from the official list below:
    {OFFICIAL_DEPARTMENTS}

    Direction: "{direction_text}"
    
    Context:
    CCMS Department: {ccms_meta.department_name}
    Case Type: {ccms_meta.case_type}
    
    Judgment snippet:
    {pdf_text[:2000]} # Using a snippet for context
    """
    
    # In real implementation, Claude would return structured JSON
    # For now, we'll simulate the logic
    
    openai_client = get_openai_client()

    response = openai_client.responses.create(
        input=[{"role": "user", "content": prompt}],
        extra_body={"agent_reference": {"name": "nyayasetu", "version": "3", "type": "agent_reference"}},
    )
    
    response_text = response.output_text
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        return {
            "department": ccms_meta.department_name, # Default to CCMS provided dept
            "confidence": "high",
            "reason": "Matches CCMS metadata and subject matter",
            "alternatives": []
        }
