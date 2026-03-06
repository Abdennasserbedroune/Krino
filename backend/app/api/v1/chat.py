"""Recruiter chatbot endpoints powered by Groq + Llama."""
import json

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

    Priority order:
    1. extracted_cv.raw_text  — full CV text stored at upload time
    2. Direct file re-extraction — fallback when raw_text is empty/missing
    3. analysis_result        — scores and detected entities (appended)

    Raises HTTPException(503) if no text can be obtained at all, so the
    caller can return a meaningful error instead of sending a blank prompt
    to Groq.
    """
    context_parts: list[str] = []

    # ── Priority 1: stored raw text ──────────────────────────────────────────
    raw_text = ""
    if cv.extracted_cv:
        try:
            extracted = (
                cv.extracted_cv
                if isinstance(cv.extracted_cv, dict)
                else json.loads(cv.extracted_cv)
            )
            raw_text = (extracted.get("raw_text", "") or "").strip()
        except Exception:
            raw_text = ""

    # ── Priority 2: re-extract from file if stored text is missing ───────────
    if not raw_text:
        try:
            raw_text = (extract_text_from_file(cv.file_path, cv.file_type) or "").strip()
        except Exception:
            raw_text = ""

    if raw_text:
        context_parts.append("=== CV CONTENT ===")
        context_parts.append(raw_text[:8000])  # cap to avoid token overflow

    # ── Priority 3: append analysis metadata if available ───────────────────
    if cv.analysis_result:
        try:
            analysis = (
                cv.analysis_result
                if isinstance(cv.analysis_result, dict)
                else json.loads(cv.analysis_result)
            )
            meta_lines: list[str] = []
            if cv.score is not None:
                meta_lines.append(f"Overall Score: {cv.score}/100")
            if analysis.get("readability_score"):
                meta_lines.append(f"Readability: {analysis['readability_score']}")
            if analysis.get("grade_level"):
                meta_lines.append(f"Grade Level: {analysis['grade_level']}")
            if analysis.get("weak_sections"):
                meta_lines.append(f"Weak Sections: {', '.join(analysis['weak_sections'])}")
            detected = analysis.get("detected_entities", {})
            companies = [
                c for c in (detected.get("companies") or [])
                if c not in {"State", "GPA", "City"}
            ][:5]
            if companies:
                meta_lines.append(f"Detected Companies: {', '.join(companies)}")
            if meta_lines:
                context_parts.append("\n=== CV ANALYSIS ===")
                context_parts.extend(meta_lines)
        except Exception:
            pass

    # ── Guard: no usable text at all ─────────────────────────────────────────
    if not context_parts:
        raise HTTPException(
            status_code=503,
            detail=(
                "Your CV could not be read. "
                "It may be a scanned image or the file is no longer available. "
                "Please delete this CV and upload a text-based PDF or DOCX."
            ),
        )

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
    cv = db.query(CV).filter(
        CV.id == payload.cv_id,
        CV.user_id == current_user.id,
    ).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    cv_context = _build_cv_context(cv)  # raises 503 if no text available

    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    reply = recruiter_chat(cv_summary=cv_context, messages=messages)

    return ChatResponse(reply=reply)
