"""CV Analysis Service (Local NLP).

Performs local NLP analysis using spaCy and textstat to calculate readability
and extract basic entities for scoring.
"""
import logging
from typing import Dict, Any, List

try:
    import textstat
    TEXTSTAT_AVAILABLE = True
except ImportError:
    logging.warning("textstat not available. Readability analysis will be limited.")
    textstat = None
    TEXTSTAT_AVAILABLE = False
try:
    import spacy
    # Load spaCy model
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        # Fallback if model not found (should be installed)
        logging.warning("spaCy model 'en_core_web_sm' not found. Downloading...")
        from spacy.cli import download
        download("en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")
except ImportError:
    logging.error("Failed to import spacy. CV analysis will be limited.")
    nlp = None
except Exception as e:
    logging.error(f"Failed to load spacy: {e}")
    nlp = None

logger = logging.getLogger(__name__)

# Basic list of common skills for heuristic counting
COMMON_SKILLS = {
    "python", "java", "javascript", "typescript", "react", "node", "aws", "docker",
    "kubernetes", "sql", "nosql", "html", "css", "git", "agile", "scrum",
    "communication", "leadership", "management", "analysis", "design",
    "c++", "c#", "go", "ruby", "php", "swift", "kotlin", "flutter",
    "tensorflow", "pytorch", "pandas", "numpy", "scikit-learn",
    "excel", "word", "powerpoint", "jira", "confluence"
}

def analyze_cv_local(text: str) -> Dict[str, Any]:
    """Perform local NLP analysis on CV text.
    
    Args:
        text: Raw CV text
        
    Returns:
        Dict containing analysis results and calculated score.
    """
    if not text:
        return {
            "readability_score": 0,
            "grade_level": "N/A",
            "detected_entities": {"names": [], "emails": [], "companies": [], "dates": []},
            "length_in_tokens": 0,
            "weak_sections": ["Empty CV"],
            "score": 0
        }

    # 1. Readability
    if TEXTSTAT_AVAILABLE:
        readability = textstat.flesch_reading_ease(text)
        grade_level = textstat.text_standard(text, float_output=False)
    else:
        readability = 50.0  # Default mid-range score
        grade_level = "N/A"
    
    # 2. Entity Extraction with spaCy
    if nlp:
        doc = nlp(text)
        
        entities = {
            "names": [ent.text for ent in doc.ents if ent.label_ == "PERSON"],
            "emails": [], # spaCy doesn't have EMAIL label by default, usually regex
            "companies": [ent.text for ent in doc.ents if ent.label_ == "ORG"],
            "dates": [ent.text for ent in doc.ents if ent.label_ == "DATE"]
        }
        
        # Simple email extraction via token matching (heuristic)
        entities["emails"] = [token.text for token in doc if token.like_email]
    else:
        doc = [] # Dummy doc
        entities = {
            "names": [], "emails": [], "companies": [], "dates": []
        }
    
    # 3. Skill Counting (Heuristic)
    # Normalize text to lower case for matching
    text_lower = text.lower()
    found_skills = [skill for skill in COMMON_SKILLS if skill in text_lower]
    num_skills = len(found_skills)
    
    # 4. Experience Counting (Heuristic based on dates or companies)
    # This is rough; Stage 4 will be more precise.
    # Assuming each "ORG" might be an experience, or pairs of dates.
    # Let's use number of unique companies as a proxy for experience count.
    num_experiences = len(set(entities["companies"]))
    
    # 5. Score Calculation
    # Formula: readability * 1.2 + number_of_skills * 3 + number_of_experiences * 4
    # Clamp between 0 and 100
    raw_score = (readability * 1.2) + (num_skills * 3) + (num_experiences * 4)
    score = max(0, min(100, int(raw_score)))
    
    # 6. Weak Sections (Heuristic)
    weak_sections = []
    if len(text.split()) < 100:
        weak_sections.append("Summary too short or content sparse")
    if num_skills < 3:
        weak_sections.append("Few skills detected")
    if num_experiences == 0:
        weak_sections.append("No work experience detected")
        
    return {
        "readability_score": readability,
        "grade_level": grade_level,
        "detected_entities": entities,
        "length_in_tokens": len(doc),
        "weak_sections": weak_sections,
        "score": score,
        # Internal metrics for debugging
        "_metrics": {
            "num_skills": num_skills,
            "num_experiences": num_experiences
        }
    }
