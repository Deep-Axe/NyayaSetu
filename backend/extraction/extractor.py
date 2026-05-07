import json
import os
import os
from azure.identity import InteractiveBrowserCredential, ManagedIdentityCredential
from azure.ai.projects import AIProjectClient
from backend.config import AZURE_EXISTING_AIPROJECT_ENDPOINT, AGENT_NAME, AGENT_VERSION

def _get_credential():
    # WEBSITE_INSTANCE_ID is set automatically by Azure App Service
    if os.getenv("WEBSITE_INSTANCE_ID"):
        return ManagedIdentityCredential()
    return InteractiveBrowserCredential()

def get_openai_client():
    project_client = AIProjectClient(
        endpoint=AZURE_EXISTING_AIPROJECT_ENDPOINT,
        credential=_get_credential(),
    )
    return project_client.get_openai_client()

def extract_judgment(pdf_text, ccms_meta):
    """
    Calls Azure OpenAI via AIProjectClient to extract structured data from judgment text.
    """
    prompt = f"""
    You are an expert legal assistant. Extract structured information from the following court judgment.
    
    CCMS Context:
    Case ID: {ccms_meta.case_id}
    Government Role: {ccms_meta.government_role}
    Department: {ccms_meta.department_name}
    
    Judgment Text:
    {pdf_text}
    
    Return a JSON object matching the required structure exactly. Do not include markdown formatting like ```json in the output.
    """

    openai_client = get_openai_client()

    response = openai_client.responses.create(
        input=[{"role": "user", "content": prompt}],
        extra_body={"agent_reference": {"name": AGENT_NAME, "version": AGENT_VERSION, "type": "agent_reference"}},
    )
    
    response_text = response.output_text
    
    # Strip markdown formatting if present
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]

    try:
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError as e:
        print(f"JSON Parsing Error: {e}\nResponse: {response_text}")
        return {
            "case_id": ccms_meta.case_id,
            "court": ccms_meta.court_name,
            "order_date": {"value": "2024-01-01", "confidence": "low", "source_span": {"page": 1, "start": 0, "end": 0}},
            "parties": {"petitioner": "Unknown", "respondent": "Unknown", "government_role": ccms_meta.government_role},
            "directions": [],
            "appeal_window": {"court_type": "Unknown", "limitation_days": 90, "appeal_deadline": "2024-04-01", "condonation_applicable": False},
            "extraction_meta": {"pdf_type": "unknown", "ocr_used": False, "passes": 1, "pass_agreement": "unknown", "disagreement_fields": []}
        }
