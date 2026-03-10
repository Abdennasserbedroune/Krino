"""Service for extracting structured information from CV text using Groq AI."""
from typing import Any, Dict
import json

from app.services.ai.groq_client import get_groq_client
from app.services.ai.language_utils import detect_text_language


def _compute_years_experience(experience: list) -> int:
    """Compute total years of experience from structured experience array.

    Iterates over each role and sums durations derived from start_date /
    end_date strings.  Falls back to 0 when dates cannot be parsed.
    """
    from datetime import datetime
    import re

    MONTH_MAP = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        "janvier": 1, "février": 2, "mars": 3, "avril": 4, "mai": 5,
        "juin": 6, "juillet": 7, "août": 8, "septembre": 9,
        "octobre": 10, "novembre": 11, "décembre": 12,
    }

    def _parse_date(raw: str) -> datetime | None:
        if not raw:
            return None
        raw = raw.strip().lower()
        if raw in ("present", "current", "aujourd'hui", "maintenant", "en cours"):
            return datetime.now()
        # Try YYYY-MM
        m = re.match(r"(\d{4})[-/](\d{1,2})", raw)
        if m:
            return datetime(int(m.group(1)), int(m.group(2)), 1)
        # Try "Month YYYY" or "Month, YYYY"
        m = re.match(r"([a-zéûôàâèù]+)[,\s]+(\d{4})", raw)
        if m:
            month_str = m.group(1)[:4]  # first 4 chars enough for most
            year = int(m.group(2))
            month = MONTH_MAP.get(month_str, None) or MONTH_MAP.get(m.group(1), None)
            if month:
                return datetime(year, month, 1)
        # Try plain YYYY
        m = re.match(r"(\d{4})", raw)
        if m:
            return datetime(int(m.group(1)), 1, 1)
        return None

    if not isinstance(experience, list):
        return 0

    total_months = 0
    for role in experience:
        if not isinstance(role, dict):
            continue
        start = _parse_date(role.get("start_date", ""))
        end = _parse_date(role.get("end_date", ""))
        if start and end and end >= start:
            delta = (end.year - start.year) * 12 + (end.month - start.month)
            total_months += max(0, delta)

    return round(total_months / 12)


def extract_cv_data(cv_text: str) -> Dict[str, Any]:
    """Extract structured CV information from raw text using Groq AI.

    Also computes:
    - cv_language: 'fr' | 'en'  detected from the raw text
    - total_years_experience: canonical integer derived from experience dates
      (not a regex guess on raw text — avoids the inconsistency bug where
      different pages showed 2, 4, or 10 years for the same candidate)
    """
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
            "cv_language": "fr",
            "total_years_experience": 0,
            "error": "No text content found in CV",
        }

    # Detect language BEFORE any AI call so we always have it
    cv_language = detect_text_language(cv_text)

    client = get_groq_client()

    prompt = f"""You are a CV parsing expert. Extract structured information from the following CV text.

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):

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
- Dates MUST be in "Month YYYY" format (e.g. "January 2020") or "Present"
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
                    "content": "You are a CV parsing expert. Extract structured information from CVs and return ONLY valid JSON. Never include markdown code blocks or any text outside the JSON object.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=4000,
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        extracted_data = json.loads(content)

        required_keys = ["personal_info", "summary", "experience", "education", "skills"]
        for key in required_keys:
            if key not in extracted_data:
                extracted_data[key] = (
                    {} if key in ("personal_info", "skills")
                    else [] if key in ("experience", "education")
                    else ""
                )

        # ── Canonical values stored once, read everywhere ──────────────────
        extracted_data["cv_language"] = cv_language
        extracted_data["total_years_experience"] = _compute_years_experience(
            extracted_data.get("experience", [])
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
            "error": f"Failed to parse AI response as JSON: {str(e)}",
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
            "cv_language": cv_language,
            "total_years_experience": 0,
            "error": f"CV extraction failed: {str(e)}",
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
            "cv_language": "fr",
            "total_years_experience": 0,
            "error": f"File extraction failed: {str(e)}",
        }
