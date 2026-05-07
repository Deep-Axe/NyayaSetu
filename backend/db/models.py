from sqlalchemy import Column, Integer, String, Date, JSON, Enum, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .session import Base
import enum

class CaseState(enum.Enum):
    JUDGMENT_RECEIVED = "JUDGMENT_RECEIVED"
    EXTRACTION_COMPLETE = "EXTRACTION_COMPLETE"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    ACTION_TAKEN = "ACTION_TAKEN"
    CLOSED = "CLOSED"
    DISPUTED = "DISPUTED"

class UserRole(enum.Enum):
    REVIEWER = "REVIEWER"
    APPROVER = "APPROVER"
    DEPT_HEAD = "DEPT_HEAD"
    LAW_DEPT = "LAW_DEPT"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    role = Column(Enum(UserRole))
    department = Column(String)

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, unique=True, index=True)
    ccms_metadata = Column(JSON)
    pdf_path = Column(String)
    lifecycle_state = Column(Enum(CaseState), default=CaseState.JUDGMENT_RECEIVED)
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    directions = relationship("Direction", back_populates="case")

class Direction(Base):
    __tablename__ = "directions"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    direction_id = Column(String) # e.g. 'dir_1'
    extracted_json = Column(JSON)
    confidence = Column(String)
    source_span = Column(JSON)
    
    case = relationship("Case", back_populates="directions")

class VerificationRecord(Base):
    __tablename__ = "verification_records"
    id = Column(Integer, primary_key=True, index=True)
    direction_id = Column(Integer, ForeignKey("directions.id"))
    field_name = Column(String)
    original_value = Column(JSON)
    verified_value = Column(JSON)
    reviewer_id = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime(timezone=True), server_default=func.now())
    action = Column(String) # approved, edited, rejected

class ComplianceAction(Base):
    __tablename__ = "compliance_actions"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    action_type = Column(String)
    action_date = Column(Date)
    reference_number = Column(String)
    recorded_by = Column(Integer, ForeignKey("users.id"))
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

class NotificationLog(Base):
    __tablename__ = "notifications_log"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    trigger_event = Column(String)
    sent_to = Column(String)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
