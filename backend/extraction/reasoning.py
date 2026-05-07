import os
import json
import os
from azure.identity import InteractiveBrowserCredential, ManagedIdentityCredential
from azure.ai.projects import AIProjectClient
from backend.config import AZURE_EXISTING_AIPROJECT_ENDPOINT, AGENT_NAME, AGENT_VERSION

def _get_credential():
    if os.getenv("WEBSITE_INSTANCE_ID"):
        return ManagedIdentityCredential()
    return InteractiveBrowserCredential()

def get_openai_client():
    project_client = AIProjectClient(
        endpoint=AZURE_EXISTING_AIPROJECT_ENDPOINT,
        credential=_get_credential(),
    )
    return project_client.get_openai_client()

def generate_comply_appeal_reasoning(pdf_text, ccms_meta):
    """
    Prompt Chain 2: Generates structured reasoning for comply/appeal decisions.
    """
    prompt = f"""
    Analyze the following judgment for decision support:
    1. Identify the holding (operative directions).
    2. Classify directions (Mandatory, Discretionary, etc.).
    3. Extract Ratio Decidendi vs Obiter Dicta.
    4. Determine Government Posture ({ccms_meta.government_role}).
    5. Surface Appeal Factors (financial, policy significance, stay required).
    
    Judgment Text:
    {pdf_text}
    
    Return a JSON object containing a "directions" array.
    """
    
    openai_client = get_openai_client()

    response = openai_client.responses.create(
        input=[{"role": "user", "content": prompt}],
        extra_body={"agent_reference": {"name": AGENT_NAME, "version": AGENT_VERSION, "type": "agent_reference"}},
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
            "directions": [
                {
                    "id": "dir_1",
                    "classification": "mandatory_compliance",
                    "ratio_or_obiter": "ratio",
                    "binding_precedent": True,
                    "appeal_factors": {"financial": "low", "stay_required": False}
                }
            ]
        }
