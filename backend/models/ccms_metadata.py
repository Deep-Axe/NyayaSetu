from pydantic import BaseModel
from datetime import date
from typing import Optional

class CCMSMetadata(BaseModel):
    case_id: str
    case_number: str
    court_name: str
    case_type: str # e.g., 'land_acquisition', 'service_matter'
    government_role: str # 'petitioner' or 'respondent'
    filing_date: date
    disposal_date: date
    department_name: str
