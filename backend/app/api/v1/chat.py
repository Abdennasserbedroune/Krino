"""Recruiter chatbot endpoints powered by Groq + Llama."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_supabase_user
from app.db.models.cv import CV
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.ai.groq_client import recruiter_chat
from app.services.cv.text_extraction import extract_text_from_file

router = APIRouter(prefix="/chat", tags=["chat"])


def _build_cv_context(cv: CV) -> str:
    """Build a comprehensive context string from CV data.
    
    Prioritizes extracted_cv (raw text) which contains all the actual CV content,
    combined with analysis results for scoring and feedback.
    """
    import json
    
    context_parts = []
    
    # PRIORITY 1: Use extracted_cv raw text (this has all the actual CV content)
    if cv.extracted_cv:
        context_parts.append("=== CV CONTENT ===")
        try:
            extracted = cv.extracted_cv if isinstance(cv.extracted_cv, dict) else json.loads(cv.extracted_cv)
            
            # Get the raw text which contains all CV information
            if "raw_text" in extracted and extracted["raw_text"]:
                raw_text = extracted["raw_text"]
                context_parts.append(raw_text)
            else:
                # If raw_text key doesn't exist, dump the whole extracted_cv
                context_parts.append(json.dumps(extracted, indent=2))
        except Exception as e:
            context_parts.append(f"Error parsing extracted_cv: {str(e)}")
    
    # PRIORITY 2: Add analysis results if available
    if cv.analysis_result:
        context_parts.append("\n=== CV ANALYSIS ===")
        try:
            analysis = cv.analysis_result if isinstance(cv.analysis_result, dict) else json.loads(cv.analysis_result)
            
            if cv.score is not None:
                context_parts.append(f"Overall Score: {cv.score}/100")
            
            if "readability_score" in analysis:
                context_parts.append(f"Readability Score: {analysis['readability_score']}")
            
            if "grade_level" in analysis:
                context_parts.append(f"Grade Level: {analysis['grade_level']}")
            
            if "weak_sections" in analysis and analysis["weak_sections"]:
                context_parts.append(f"Weak Sections: {', '.join(analysis['weak_sections'])}")
            
            # Include detected entities (names, companies, etc.) if available
            if "detected_entities" in analysis:
                entities = analysis["detected_entities"]
                if "companies" in entities and entities["companies"]:
                    # Filter out common false positives like "State"
                    companies = [c for c in entities["companies"] if c not in ["State", "GPA", "City"]]
                    if companies:
                        context_parts.append(f"Detected Companies: {', '.join(companies[:5])}")  # Top 5
        except Exception as e:
            context_parts.append(f"Error parsing analysis_result: {str(e)}")
    
    # PRIORITY 3: Check structured_data (usually empty but check anyway)
    if cv.structured_data and not cv.extracted_cv:
        context_parts.append("\n=== STRUCTURED DATA ===")
        try:
            structured = cv.structured_data if isinstance(cv.structured_data, dict) else json.loads(cv.structured_data)
            context_parts.append(json.dumps(structured, indent=2)[:2000])
        except Exception as e:
            context_parts.append(f"Error parsing structured_data: {str(e)}")
    
    # Fallback: try to extract raw text from file
    if not context_parts:
        context_parts.append("=== RAW CV TEXT ===")
        try:
            text = extract_text_from_file(cv.file_path, cv.file_type)
            context_parts.append(text[:5000])  # truncate for safety
        except Exception:
            context_parts.append("No CV data available.")
    
    return "\n".join(context_parts)


@router.post("", response_model=ChatResponse)
async def recruiter_chat_endpoint(
    payload: ChatRequest,
    current_user: User = Depends(get_current_supabase_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """Chat with an AI recruiter about a specific CV.

    The CV must belong to the current user. The conversation is stateless
    on the backend: the frontend sends the full message history each time.
    """
    cv = db.query(CV).filter(CV.id == payload.cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    cv_context = _build_cv_context(cv)

    # Convert ChatMessage list to Groq-compatible dict list
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]

    reply = recruiter_chat(cv_summary=cv_context, messages=messages)

    return ChatResponse(reply=reply)
