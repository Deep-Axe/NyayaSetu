import json
from backend.models.ccms_metadata import CCMSMetadata

def load_mock_metadata(case_id):
    with open("backend/samples/mock_ccms.json", "r") as f:
        data = json.load(f)
        for item in data:
            if item["case_id"] == case_id:
                return CCMSMetadata(**item)
    raise ValueError(f"Case ID {case_id} not found in mock data")
