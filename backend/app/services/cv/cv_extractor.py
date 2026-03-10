"""Service for extracting structured information from CV text using Groq AI."""
from typing import Any, Dict, List
import json
import re
from datetime import date

from app.services.ai.groq_client import get_groq_client
from app.services.ai.language_utils import detect_text_language


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
    "janvier": 1, "f\u00e9vrier": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "ao\u00fbt": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "d\u00e9cembre": 12,
    "janv": 1, "f\u00e9vr": 2, "avr": 4, "juil": 7,
}
_ALL_MONTHS = {**_MONTHS_EN, **_MONTHS_FR}


def _parse_date(raw: str) -> date | None:
    """Parse a loose date string such as 'March 2021', 'jan 2020', '2018' into a date."""
    if not raw:
        return None
    s = raw.strip().lower()
    if s in ("present", "current", "now", "aujourd'hui", "actuel", "en cours"):
        return date.today()

    # Try ISO YYYY-MM
    m = re.match(r"(\d{4})-(\d{1,2})", s)
    if m:
        return date(int(m.group(1)), int(m.group(2)), 1)

    # Try "Month YYYY" or "YYYY Month"
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
    """Compute total years of professional experience from a list of experience dicts.

    Each item is expected to have at least ``start_date`` and optionally
    ``end_date``.  Overlapping periods are handled by merging intervals.
    Returns 0 if the list is empty or dates cannot be parsed.
    """
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

    # Merge overlapping intervals to avoid double-counting
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


# ── Main extraction function ───────────────────────────────────────────────────

def extract_cv_data(cv_text: str) -> Dict[str, Any]:
    """Extract structured CV information from raw text using Groq AI."""
    if not cv_text or not cv_text.strip():
        return {
            "personal_info": {},
            "summary": "",
            "experience": [],
            "education": [],
            "skills": [],
            "certifications": [],
            "languages": [],
            "projects": [],
            "cv_language": "en",
            "total_years_experience": 0,
            "error": "No text content found in CV"
        }

    client = get_groq_client()

    # Detect language ONCE here and store it — all downstream features read this
    cv_language = detect_text_language(cv_text)

    lang_instruction = (
        "IMPORTANT: This CV is written in French. Extract all fields exactly as they appear. "
        "Do NOT translate any content.\n"
        if cv_language == "fr"
        else ""
    )

    prompt = f"""You are a CV parsing expert. Extract structured information from the following CV text.

{lang_instruction}Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):

{{
  "personal_info": {{
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, Country",
    "linkedin": "LinkedIn URL if present",
    "website": "Personal website if present",
    "github": "GitHub URL if present"
  }},
  "summary": "Professional summary or objective statement",
  "experience": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country",
      "start_date": "Month Year",
      "end_date": "Month Year or Present",
      "description": "Job description and achievements",
      "responsibilities": ["responsibility 1", "responsibility 2"]
    }}
  ],
  "education": [
    {{
      "degree": "Degree Name",
      "institution": "University/School Name",
      "location": "City, Country",
      "graduation_date": "Month Year",
      "gpa": "GPA if mentioned",
      "honors": "Honors or distinctions if any"
    }}
  ],
  "skills": {{
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "languages_programming": ["language1", "language2"],
    "tools": ["tool1", "tool2"]
  }},
  "certifications": [
    {{
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "Month Year",
      "credential_id": "ID if present"
    }}
  ],
  "languages": [
    {{
      "language": "Language Name",
      "proficiency": "Native/Fluent/Professional/Basic"
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "description": "Project description",
      "technologies": ["tech1", "tech2"],
      "url": "Project URL if present"
    }}
  ]
}}

Important:
- Extract ALL information present in the CV
- If a field is not present, use empty string "" or empty array []
- Ensure dates are in a consistent format (Month Year)
- Be thorough and accurate
- Return ONLY the JSON object, no other text

CV Text:
{cv_text}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a CV parsing expert. Extract structured information from CVs "
                        "and return ONLY valid JSON. Never include markdown code blocks or any "
                        "text outside the JSON object."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            max_tokens=4000,
        )

        content = response.choices[0].message.content.strip()

        # Strip markdown fences if the model added them despite instructions
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        extracted_data = json.loads(content)

        # Ensure required top-level keys are present
        required_keys = ["personal_info", "summary", "experience", "education", "skills"]
        for key in required_keys:
            if key not in extracted_data:
                extracted_data[key] = (
                    {} if key in ("personal_info", "skills")
                    else [] if key in ("experience", "education")
                    else ""
                )

        # Store detected language + canonical experience years
        extracted_data["cv_language"] = cv_language
        extracted_data["total_years_experience"] = _compute_years_experience(
            extracted_data.get("experience") or []
        )

        return extracted_data

    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        return {
            "personal_info": {},
            "summary": "",
            "experience": [],
            "education": [],
            "skills": {},
            "certifications": [],
            "languages": [],
            "projects": [],
            "cv_language": cv_language,
            "total_years_experience": 0,
            "error": f"Failed to parse AI response as JSON: {str(e)}"
        }
    except Exception as e:
        print(f"CV extraction error: {e}")
        return {
            "personal_info": {},
            "summary": "",
            "experience": [],
            "education": [],
            "skills": {},
            "certifications": [],
            "languages": [],
            "projects": [],
            "cv_language": "en",
            "total_years_experience": 0,
            "error": f"CV extraction failed: {str(e)}"
        }


def extract_cv_from_file(file_path: str, file_type: str) -> Dict[str, Any]:
    """Extract structured CV data from a file."""
    from app.services.cv.text_extraction import extract_text_from_file

    try:
        cv_text = extract_text_from_file(file_path, file_type)
        return extract_cv_data(cv_text)
    except Exception as e:
        print(f"Error extracting CV from file: {e}")
        return {
            "personal_info": {},
            "summary": "",
            "experience": [],
            "education": [],
            "skills": {},
            "certifications": [],
            "languages": [],
            "projects": [],
            "cv_language": "en",
            "total_years_experience": 0,
            "error": f"File extraction failed: {str(e)}"
        }
