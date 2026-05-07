from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
from sqlalchemy.orm import Session
from backend.db.session import get_db, engine, Base
from backend.db.models import Case, CaseState, Direction, VerificationRecord, UserRole, ComplianceAction
from backend.ingestion.ccms_loader import load_mock_metadata
from backend.ingestion.sarvam_di import extract_with_sarvam_di
from backend.extraction.extractor import extract_judgment
from backend.extraction.reasoning import generate_comply_appeal_reasoning
from backend.extraction.attribution import attribute_department
from backend.extraction.deadline_engine import compute_deadlines
from backend.notifications.engine import check_and_notify_deadlines
import json
import os
from datetime import datetime, date, timedelta
from sqlalchemy import inspect as sa_inspect


def _to_dict(obj):
    """Serialize a SQLAlchemy ORM row to a plain dict."""
    cols = sa_inspect(type(obj)).mapper.column_attrs
    d = {}
    for col in cols:
        val = getattr(obj, col.key)
        if isinstance(val, date):
            d[col.key] = val.isoformat()
        elif hasattr(val, 'value'):          # Enum
            d[col.key] = val.value
        else:
            d[col.key] = val
    return d

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NyayaSetu API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://icy-pond-0fc2eda00.azurestaticapps.net",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ComplianceActionBody(BaseModel):
    action_type: str
    action_date: str = ""
    reference_number: Optional[str] = None


class VerifyDirectionBody(BaseModel):
    action: str
    field_name: str = "all"
    new_value: Any = None


def _normalize_extraction(raw: dict, case_id: str, ccms_meta) -> dict:
    """
    Normalize agent response (nested extraction/action_plan schema) into the flat
    schema expected by compute_deadlines and the pipeline.
    """
    ext = raw.get("extraction", {})
    directions_raw = ext.get("key_directions", {}).get("value", [])
    order_date_val = ext.get("date_of_order", {}).get("value", str(date.today()))
    court_val = ext.get("court", {}).get("value", "High Court of Karnataka")
    dir_confidence = ext.get("key_directions", {}).get("confidence", "medium")

    directions = [
        {"id": f"dir_{i+1}", "text": d if isinstance(d, str) else d.get("text", str(d)), "deadline": None}
        for i, d in enumerate(directions_raw)
    ]

    return {
        "case_id": case_id,
        "order_date": order_date_val,
        "court": court_val,
        "directions": directions,
        "confidence": dir_confidence,
        "action_plan": raw.get("action_plan", {}),
        "review_flags": raw.get("review_flags", []),
    }


@app.get("/")
def read_root():
    return {"message": "Welcome to NyayaSetu API"}


@app.post("/cases/upload")
async def upload_case(
    pdf: UploadFile = File(...),
    metadata: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        meta_dict = json.loads(metadata)
        case_id = meta_dict["case_id"]

        upload_dir = "backend/samples"
        os.makedirs(upload_dir, exist_ok=True)
        pdf_path = os.path.join(upload_dir, f"{case_id.replace('/', '_')}.pdf")
        with open(pdf_path, "wb") as f:
            f.write(await pdf.read())

        try:
            ccms_meta = load_mock_metadata(case_id)
        except ValueError:
            from backend.models.ccms_metadata import CCMSMetadata
            ccms_meta = CCMSMetadata(**meta_dict)

        di_result = extract_with_sarvam_di(pdf_path)
        pdf_text = di_result["text"]

        raw_extraction = extract_judgment(pdf_text, ccms_meta)
        extraction = _normalize_extraction(raw_extraction, case_id, ccms_meta)

        reasoning = generate_comply_appeal_reasoning(pdf_text, ccms_meta)

        for d in extraction["directions"]:
            d["responsible_department"] = attribute_department(pdf_text, ccms_meta, d.get("text", ""))
            r = next((x for x in reasoning.get("directions", []) if x.get("id") == d.get("id")), {})
            d.update(r)

        extraction = compute_deadlines(extraction)
        appeal_deadline = extraction.get("appeal_deadline")

        new_case = Case(
            case_id=case_id,
            ccms_metadata=meta_dict,
            pdf_path=pdf_path,
            lifecycle_state=CaseState.EXTRACTION_COMPLETE,
            deadline=appeal_deadline,
        )
        db.add(new_case)
        db.commit()
        db.refresh(new_case)

        dir_confidence = extraction.get("confidence", "medium")
        for d in extraction["directions"]:
            direction = Direction(
                case_id=new_case.id,
                direction_id=d.get("id", "unknown"),
                extracted_json=d,
                confidence=dir_confidence,
                source_span=d.get("source_span", {}),
            )
            db.add(direction)
        db.commit()

        return {"case_id": case_id, "status": "EXTRACTION_COMPLETE", "extraction": extraction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/cases/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    directions = db.query(Direction).filter(Direction.case_id == case.id).all()
    return {
        **_to_dict(case),
        "directions": [_to_dict(d) for d in directions],
    }


@app.get("/cases/{case_id}/pdf")
def get_case_pdf(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case or not os.path.exists(case.pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(case.pdf_path, media_type="application/pdf")


@app.patch("/cases/{case_id}/state")
def update_case_state(case_id: str, state: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    try:
        case.lifecycle_state = CaseState[state]
        db.commit()
        return {"status": "success", "new_state": case.lifecycle_state}
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid state")


@app.post("/cases/{case_id}/actions")
def record_compliance_action(
    case_id: str,
    body: ComplianceActionBody,
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    action_date_str = body.action_date or str(date.today())
    action = ComplianceAction(
        case_id=case.id,
        action_type=body.action_type,
        action_date=datetime.strptime(action_date_str, "%Y-%m-%d").date(),
        reference_number=body.reference_number,
        recorded_by=1,
    )
    db.add(action)
    case.lifecycle_state = CaseState.ACTION_TAKEN
    db.commit()
    return {"status": "success"}


@app.post("/cases/{case_id}/directions/{direction_id}/verify")
def verify_direction(
    case_id: str,
    direction_id: str,
    body: VerifyDirectionBody,
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    direction = db.query(Direction).filter(
        Direction.case_id == case.id, Direction.direction_id == direction_id
    ).first()
    if not direction:
        raise HTTPException(status_code=404, detail="Direction not found")

    record = VerificationRecord(
        direction_id=direction.id,
        field_name=body.field_name,
        original_value={},
        verified_value=body.new_value,
        reviewer_id=1,
        action=body.action,
    )
    db.add(record)
    db.commit()
    return {"message": f"Field {body.field_name} {body.action}"}


@app.get("/cases/{case_id}/audit")
def get_audit_trail(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    dir_ids = [d.id for d in db.query(Direction).filter(Direction.case_id == case.id).all()]
    records = db.query(VerificationRecord).filter(VerificationRecord.direction_id.in_(dir_ids)).all()
    return [_to_dict(r) for r in records]


@app.get("/dashboard/weekly")
def get_weekly_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    cases = db.query(Case).filter(
        Case.deadline >= today,
        Case.deadline <= today + timedelta(days=7),
    ).all()
    return [_to_dict(c) for c in cases]


@app.get("/dashboard/monthly")
def get_monthly_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    cases = db.query(Case).filter(
        Case.deadline >= today,
        Case.deadline <= today + timedelta(days=30),
    ).all()
    return [_to_dict(c) for c in cases]


def get_current_user_role():
    return UserRole.REVIEWER


def require_role(allowed_roles: list):
    def role_checker(role: UserRole = Depends(get_current_user_role)):
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden: Insufficient permissions")
        return role
    return role_checker


@app.get("/dashboard/contempt-risk")
def get_contempt_risk(
    db: Session = Depends(get_db),
    role: UserRole = Depends(require_role([UserRole.LAW_DEPT, UserRole.ADMIN, UserRole.REVIEWER])),
):
    today = date.today()
    cases = db.query(Case).filter(
        Case.lifecycle_state == CaseState.VERIFIED,
        Case.deadline < today,
    ).all()
    return [_to_dict(c) for c in cases]


@app.post("/notifications/check-deadlines")
def trigger_deadline_check(
    db: Session = Depends(get_db),
    role: UserRole = Depends(require_role([UserRole.LAW_DEPT, UserRole.ADMIN])),
):
    result = check_and_notify_deadlines(db)
    return result


@app.get("/departments/{department}/risk-profile")
def get_department_risk_profile(
    department: str,
    db: Session = Depends(get_db),
    role: UserRole = Depends(require_role([UserRole.DEPT_HEAD, UserRole.LAW_DEPT, UserRole.ADMIN, UserRole.REVIEWER])),
):
    return {
        "win_loss_ratio": "2:3",
        "average_compliance_days": 42,
        "repeat_petitioners": [],
    }
