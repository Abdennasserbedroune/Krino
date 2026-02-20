"""Pydantic schemas for CV metadata and analysis."""
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class CVRead(BaseModel):
    id: int
    original_filename: str
    file_path: str
    file_type: str
    file_size: int
    extracted_cv: Optional[Dict[str, Any]] = None
    score: Optional[int] = None
    analysis_result: Optional[Dict[str, Any]] = None
    suggestions: Optional[Any] = None
    analyzed_at: Optional[datetime] = None
    structured_data: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True
