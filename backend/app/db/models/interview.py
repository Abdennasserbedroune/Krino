"""Interview prep session model."""
from __future__ import annotations
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id       = Column(Integer, primary_key=True, index=True)
    user_id  = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    cv_id    = Column(Integer, ForeignKey("cvs.id"), nullable=True)
    job_id   = Column(Integer, ForeignKey("saved_jobs.id"), nullable=True)

    title            = Column(String(200), nullable=True)  # e.g. "Senior DA @ Stripe"
    # [{id, type, question, answer, score, feedback}]
    questions        = Column(JSON, nullable=True)
    weak_points      = Column(JSON, nullable=True)
    star_stories     = Column(JSON, nullable=True)
    feedback_summary = Column(Text, nullable=True)
    overall_score    = Column(Integer, nullable=True)
    status           = Column(String(20), default="active")  # active / completed

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
