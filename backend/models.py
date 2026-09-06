from pydantic import BaseModel
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
import datetime

Base = declarative_base()

class LeadInput(BaseModel):
    source: str = "FORM"
    source_file: str | None = None
    name: str
    email: str
    company: str
    job_title: str
    company_size: str
    budget: str
    message: str

class LeadDB(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    source = Column(String, default="FORM")
    source_file = Column(String, nullable=True)
    
    name = Column(String)
    email = Column(String)
    company = Column(String)
    job_title = Column(String)
    company_size = Column(String)
    budget = Column(String)
    message = Column(String)
    
    bant_score = Column(Integer)
    
    budget_score = Column(Integer)
    budget_confidence = Column(String)
    budget_evidence = Column(String)
    
    authority_score = Column(Integer)
    authority_confidence = Column(String)
    authority_evidence = Column(String)
    
    need_score = Column(Integer)
    need_confidence = Column(String)
    need_evidence = Column(String)
    
    timeline_score = Column(Integer)
    timeline_confidence = Column(String)
    timeline_evidence = Column(String)
    tier = Column(String)
    
    research_summary = Column(String)
    reasoning = Column(JSON)
    recommendation = Column(String)
    suggested_action = Column(String)
    
    action_status = Column(String, default="pending_draft")
    draft_action = Column(JSON, nullable=True)
