"""CV Structured Data Extraction Service.

Uses regex and rule-based logic to extract structured sections from CV text.
"""
import re
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Regex patterns
EMAIL_REGEX = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
PHONE_REGEX = r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}'
URL_REGEX = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'

# Section headers keywords
SECTIONS = {
    "experience": ["experience", "work history", "employment", "career history"],
    "education": ["education", "academic background", "qualifications"],
    "skills": ["skills", "technical skills", "competencies", "technologies"],
    "projects": ["projects", "personal projects"],
    "certifications": ["certifications", "certificates", "licenses"],
    "languages": ["languages"],
    "summary": ["summary", "objective", "profile", "about me"]
}

def extract_structured_data(text: str) -> Dict[str, Any]:
    """Extract structured data from CV text using regex and rules.
    
    Args:
        text: Raw CV text
        
    Returns:
        Dict containing structured CV data.
    """
    if not text:
        return _empty_structure()
        
    # 1. Personal Info
    personal_info = {
        "name": "", # Hard to extract reliably with regex alone, often first line
        "email": _extract_first(text, EMAIL_REGEX),
        "phone": _extract_first(text, PHONE_REGEX),
        "location": "", # Requires NER or list matching
        "linkedin": "",
        "website": "",
        "github": ""
    }
    
    # Extract URLs and categorize
    urls = re.findall(URL_REGEX, text)
    for url in urls:
        if "linkedin.com" in url:
            personal_info["linkedin"] = url
        elif "github.com" in url:
            personal_info["github"] = url
        elif not personal_info["website"]:
            personal_info["website"] = url

    # Attempt to guess name from first line if it's short and not a header
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if lines:
        first_line = lines[0]
        if len(first_line.split()) < 5 and "@" not in first_line:
            personal_info["name"] = first_line

    # 2. Section Extraction
    # Split text into sections based on headers
    sections_content = _split_into_sections(text, lines)
    
    return {
        "personal_info": personal_info,
        "summary": sections_content.get("summary", ""),
        "experience": _parse_list_items(sections_content.get("experience", "")),
        "education": _parse_list_items(sections_content.get("education", "")),
        "skills": _parse_skills(sections_content.get("skills", "")),
        "certifications": _parse_list_items(sections_content.get("certifications", "")),
        "languages": _parse_list_items(sections_content.get("languages", "")),
        "projects": _parse_list_items(sections_content.get("projects", ""))
    }

def _empty_structure() -> Dict[str, Any]:
    return {
        "personal_info": {"name": "", "email": "", "phone": "", "location": ""},
        "summary": "",
        "experience": [],
        "education": [],
        "skills": [],
        "certifications": [],
        "languages": [],
        "projects": []
    }

def _extract_first(text: str, pattern: str) -> str:
    match = re.search(pattern, text)
    return match.group(0) if match else ""

def _split_into_sections(text: str, lines: List[str]) -> Dict[str, str]:
    """Split text into sections based on known headers."""
    found_sections = {}
    current_section = None
    buffer = []
    
    for line in lines:
        line_lower = line.lower()
        # Check if line is a header
        is_header = False
        for section, keywords in SECTIONS.items():
            if any(keyword == line_lower or f"{keyword}:" == line_lower for keyword in keywords):
                # Save previous section
                if current_section:
                    found_sections[current_section] = "\n".join(buffer).strip()
                
                current_section = section
                buffer = []
                is_header = True
                break
        
        if not is_header:
            if current_section:
                buffer.append(line)
            elif not found_sections: 
                # If no section found yet, might be summary or personal info
                # We'll ignore for now or treat as implicit summary if at top
                pass
                
    # Save last section
    if current_section:
        found_sections[current_section] = "\n".join(buffer).strip()
        
    return found_sections

def _parse_list_items(text: str) -> List[Any]:
    """Parse a section text into a list of items (strings or dicts).
    
    For now, returning list of strings (lines or blocks).
    """
    if not text:
        return []
    # Split by newlines, filter empty
    return [line.strip() for line in text.split('\n') if line.strip()]

def _parse_skills(text: str) -> List[str]:
    """Parse skills section into a list of strings."""
    if not text:
        return []
    # Skills are often comma separated or bulleted
    if "," in text:
        return [s.strip() for s in text.split(",") if s.strip()]
    return [line.strip() for line in text.split('\n') if line.strip()]
