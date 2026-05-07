from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class SourceSpan(BaseModel):
    page: int
    start: int
    end: int

class OrderDate(BaseModel):
    value: date
    confidence: str
    source_span: SourceSpan

class Parties(BaseModel):
    petitioner: str
    respondent: str
    government_role: str

class ResponsibleDepartment(BaseModel):
    value: str
    confidence: str
    reason: str
    source_span: SourceSpan

class Deadline(BaseModel):
    type: str # 'explicit' or 'inferred'
    base_date: date
    expression: str
    computed: date
    confidence: str

class Direction(BaseModel):
    id: str
    text: str
    classification: str
    responsible_department: ResponsibleDepartment
    deadline: Optional[Deadline] = None
    source_span: SourceSpan

class AppealWindow(BaseModel):
    court_type: str
    limitation_days: int
    appeal_deadline: date
    condonation_applicable: bool

class ExtractionMeta(BaseModel):
    pdf_type: str
    ocr_used: bool
    passes: int
    pass_agreement: str
    disagreement_fields: List[str]

class JudgmentExtraction(BaseModel):
    case_id: str
    court: str
    order_date: OrderDate
    parties: Parties
    directions: List[Direction]
    appeal_window: AppealWindow
    extraction_meta: ExtractionMeta
