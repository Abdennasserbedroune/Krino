"""Service for extracting structured information from CV text using Groq AI."""
from typing import Any, Dict, List
import json
import logging
import re
from datetime import date

from app.core.config import settings
from app.services.ai.groq_client import get_groq_client
from app.services.ai.language_utils import detect_text_language

logger = logging.getLogger(__name__)

# ── Month name tables (EN + FR) ────────────────────────────────────────────────
_MONTHS_EN = {
    "january": 1, "february": 2, "march": 3, "april": 4,
    "may": 5, "june": 6, "july": 7, "august": 8,
    "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4,
    "jun": 6, "jul": 7, "aug": 8, "sep": 9,
    "oct": 10, "nov": 11, "dec": 12,
}
_MONTHS_FR = {
    "janvier": 1, "février": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "août": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12,
    "janv": 1, "févr": 2, "avr": 4, "juil": 7,
}
_ALL_MONTHS = {**_MONTHS_EN, **_MONTHS_FR}


def _parse_date(raw: str) -> date | None:
    if not raw:
        return None
    s = raw.strip().lower()
    if s in ("present", "current", "now", "aujourd'hui", "actuel", "en cours"):
        return date.today()
    m = re.match(r"(\d{4})-(\d{1,2})", s)
    if m:
        return date(int(m.group(1)), int(m.group(2)), 1)
    parts = re.split(r"[\s,/]+", s)
    year, month = None, None
    for part in parts:
        if re.match(r"^\d{4}$", part):
            year = int(part)
        elif part in _ALL_MONTHS:
            month = _ALL_MONTHS[part]
    if year and month:
        return date(year, month, 1)
    if year:
        return date(year, 1, 1)
    return None


def _compute_years_experience(experience_list: List[Any]) -> int:
    if not experience_list:
        return 0
    intervals: List[tuple[date, date]] = []
    for item in experience_list:
        if not isinstance(item, dict):
            continue
        start = _parse_date(str(item.get("start_date", "") or ""))
        end_raw = str(item.get("end_date", "") or "")
        end = _parse_date(end_raw) if end_raw else date.today()
        if start and end and end >= start:
            intervals.append((start, end))
    if not intervals:
        return 0
    intervals.sort(key=lambda x: x[0])
    merged: List[tuple[date, date]] = [intervals[0]]
    for start, end in intervals[1:]:
        prev_start, prev_end = merged[-1]
        if start <= prev_end:
            merged[-1] = (prev_start, max(prev_end, end))
        else:
            merged.append((start, end))
    total_days = sum((e - s).days for s, e in merged)
    return max(0, int(total_days / 365.25))


def extract_cv_data(cv_text: str) -> Dict[str, Any]:
    """Extract structured CV information from raw text using Groq AI."""
    _empty = {
        "personal_info": {}, "summary": "", "experience": [],
        "education": [], "skills": {}, "certifications": [],
        "languages": [], "projects": [], "cv_language": "en",
        "total_years_experience": 0,
    }
    if not cv_text or not cv_text.strip():
        return {**_empty, "error": "No text content found in CV"}

    client = get_groq_client()
    cv_language = detect_text_language(cv_text)

    lang_instruction = (
        "IMPORTANT: This CV is written in French. Extract all fields exactly as they appear. "
        "Do NOT translate any content.\n" if cv_language == "fr" else ""
    )

    prompt = f"""You are a CV parsing expert. Extract structured information from the following CV text.

{lang_instruction}Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):

{{
  "personal_info": {{"name": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": "", "github": ""}},
  "summary": "",
  "experience": [{{"title": "", "company": "", "location": "", "start_date": "", "end_date": "", "description": "", "responsibilities": []}}],
  "education": [{{"degree": "", "institution": "", "location": "", "graduation_date": "", "gpa": "", "honors": ""}}],
  "skills": {{"technical": [], "soft": [], "languages_programming": [], "tools": []}},
  "certifications": [{{"name": "", "issuer": "", "date": "", "credential_id": ""}}],
  "languages": [{{"language": "", "proficiency": ""}}],
  "projects": [{{"name": "", "description": "", "technologies": [], "url": ""}}]
}}

Rules: extract ALL information present; use "" or [] for missing fields; return ONLY the JSON object.

CV Text:
{cv_text}
"""

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a CV parsing expert. Return ONLY valid JSON, no markdown."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        extracted = json.loads(content)
        for key in ["personal_info", "summary", "experience", "education", "skills"]:
            if key not in extracted:
                extracted[key] = {} if key in ("personal_info", "skills") else ([] if key != "summary" else "")
        extracted["cv_language"] = cv_language
        extracted["total_years_experience"] = _compute_years_experience(extracted.get("experience") or [])
        return extracted
    except json.JSONDecodeError as e:
        logger.error(f"CV extraction JSON parse error: {e}")
        return {**_empty, "cv_language": cv_language, "error": f"Failed to parse AI response: {e}"}
    except Exception as e:
        logger.error(f"CV extraction failed: {e}")
        return {**_empty, "error": f"CV extraction failed: {e}"}


def extract_cv_from_file(file_path: str, file_type: str) -> Dict[str, Any]:
    from app.services.cv.text_extraction import extract_text_from_file
    try:
        return extract_cv_data(extract_text_from_file(file_path, file_type))
    except Exception as e:
        logger.error(f"Error extracting CV from file: {e}")
        return {
            "personal_info": {}, "summary": "", "experience": [], "education": [],
            "skills": {}, "certifications": [], "languages": [], "projects": [],
            "cv_language": "en", "total_years_experience": 0,
            "error": f"File extraction failed: {e}",
        }
