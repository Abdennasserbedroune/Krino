"""Service layer that ties together text extraction and Groq analysis."""
from datetime import datetime
from typing import Any, Dict

from app.db.models.cv import CV
from app.services.ai.groq_client import analyze_cv_with_groq
from app.services.cv.text_extraction import extract_text_from_file


def analyze_cv_entity(cv: CV) -> Dict[str, Any]:
    """Run full analysis on a CV entity: extract text and call Groq.

    Returns the structured analysis payload.
    """
    text = extract_text_from_file(cv.file_path, cv.file_type)
    if not text.strip():
        return {
            "overall_score": 0,
            "strengths": [],
            "weaknesses": ["Could not extract text from CV"],
            "recommendations": ["Upload a clearer PDF/DOCX version of your CV."],
            "interview_prep_questions": [],
        }

    analysis = analyze_cv_with_groq(text)
    return analysis
