"""Service for extracting structured information from CV text using Groq AI."""
from typing import Any, Dict
import json

from app.services.ai.groq_client import get_groq_client


def extract_cv_data(cv_text: str) -> Dict[str, Any]:
    """Extract structured CV information from raw text using Groq AI.
    
    This parses the CV and extracts:
    - Personal information (name, email, phone, location, etc.)
    - Professional summary
    - Work experience
    - Education
    - Skills
    - Certifications
    - Languages
    - Projects
    
    Args:
        cv_text: Raw text extracted from CV file
        
    Returns:
        Dictionary containing structured CV data
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
            "error": "No text content found in CV"
        }
    
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
- Ensure dates are in a consistent format
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
                    "content": "You are a CV parsing expert. Extract structured information from CVs and return ONLY valid JSON. Never include markdown code blocks or any text outside the JSON object."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,  # Low temperature for consistent extraction
            max_tokens=4000,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        # Parse JSON
        extracted_data = json.loads(content)
        
        # Validate structure
        required_keys = ["personal_info", "summary", "experience", "education", "skills"]
        for key in required_keys:
            if key not in extracted_data:
                extracted_data[key] = {} if key in ["personal_info", "skills"] else [] if key in ["experience", "education"] else ""
        
        return extracted_data
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Response content: {content}")
        return {
            "personal_info": {},
            "summary": "",
            "experience": [],
            "education": [],
            "skills": {},
            "certifications": [],
            "languages": [],
            "projects": [],
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
            "error": f"CV extraction failed: {str(e)}"
        }


def extract_cv_from_file(file_path: str, file_type: str) -> Dict[str, Any]:
    """Extract structured CV data from a file.
    
    Args:
        file_path: Path to the CV file
        file_type: Type of file (pdf, docx, doc, txt)
        
    Returns:
        Dictionary containing structured CV data
    """
    from app.services.cv.text_extraction import extract_text_from_file
    
    try:
        # Extract text from file
        cv_text = extract_text_from_file(file_path, file_type)
        
        # Parse text into structured data
        extracted_data = extract_cv_data(cv_text)
        
        return extracted_data
        
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
            "error": f"File extraction failed: {str(e)}"
        }
