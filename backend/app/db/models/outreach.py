"""Recruiter outreach message drafts."""
from __future__ import annotations
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class OutreachMessage(Base):
    __tablename__ = "outreach_messages"

    id           = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("candidate_cards.id"), nullable=True)
    job_id       = Column(Integer, ForeignKey("job_postings.id"), nullable=True)

    # intro / interview / followup / rejection / offer
    message_type            = Column(String(50), nullable=False)
    subject                 = Column(String(300), nullable=True)
    body                    = Column(Text, nullable=False)
    # signals the AI used when generating
    personalization_signals = Column(JSON, nullable=True)
    status                  = Column(String(20), default="draft")  # draft/sent/archived

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    recruiter = relationship("User")
