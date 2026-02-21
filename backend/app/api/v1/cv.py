"""CV upload, listing, and analysis endpoints."""
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash, get_current_supabase_user
from app.db.models.cv import CV
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.cv import CVRead
from app.services.storage.file_storage import save_cv_file
from app.services.cv.parsing import parse_cv_file
from app.services.cv.analysis import analyze_cv_local
from app.services.cv.structure import extract_structured_data
from app.services.ai.groq_client import review_cv_with_groq, rewrite_cv_with_groq
from app.services.cv.pdf_generator import generate_cv_pdf_bytes

router = APIRouter(prefix="/cv", tags=["cv"])

@router.get("/db-test")
def test_db():
    from app.db.session import SessionLocal
    from sqlalchemy import text
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            users_count = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
            cvs_count = db.execute(text("SELECT COUNT(*) FROM cvs")).scalar()
            return {"status": "ok", "users": users_count, "cvs": cvs_count}
        except Exception as e:
            return {"status": "error", "detail": str(e), "type": "query_error"}
        finally:
            db.close()
    except Exception as e:
        return {"status": "error", "detail": str(e), "type": "connection_error"}

@router.post("/upload", response_model=CVRead, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> CVRead:
    """Upload a CV file and perform local processing pipeline.
    
    Pipeline:
    1. Validate file (type, size)
    2. Check for duplicates (filename)
    3. Save file locally
    4. Parse file (extract text, OCR if needed) -> extracted_cv
    5. Analyze text (readability, entities, score) -> analysis_result
    6. Extract structure (regex/rules) -> structured_data
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # 1. Validate file type
    ext = file.filename.split(".")[-1].lower()
    if ext not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {settings.ALLOWED_FILE_TYPES}")

    # 2. Check for duplicates
    existing_cv = db.query(CV).filter(
        CV.user_id == current_user.id,
        CV.original_filename == file.filename
    ).first()
    if existing_cv:
        raise HTTPException(
            status_code=409, 
            detail=f"A file with the name '{file.filename}' already exists. Please rename or delete the existing file."
        )

    # 3. Save file
    # Note: file_size is returned by save_cv_file
    file_path, file_size, ext = await save_cv_file(current_user.id, file)
    
    # Validate file size (5MB limit)
    if file_size > settings.MAX_UPLOAD_SIZE:
        # In a real app we might want to delete the file if it's too big, 
        # but save_cv_file already wrote it. For now just error.
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # Create initial DB record
    cv = CV(
        user_id=current_user.id,
        original_filename=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    
    try:
        # 4. Parsing Stage
        extracted_data = parse_cv_file(file_path, ext)
        cv.extracted_cv = extracted_data
        
        # Validate page count (max 5 pages)
        if extracted_data.get("page_count", 0) > 5:
             db.delete(cv)
             db.commit()
             raise HTTPException(status_code=400, detail="File has too many pages (max 5)")

        raw_text = extracted_data.get("raw_text", "")
        
        # 5. Local NLP Analysis Stage
        analysis_result = analyze_cv_local(raw_text)
        cv.analysis_result = analysis_result
        cv.score = analysis_result.get("score", 0)
        
        # 6. Structured Data Stage
        structured_data = extract_structured_data(raw_text)
        cv.structured_data = structured_data
        
        db.add(cv)
        db.commit()
        db.refresh(cv)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Pipeline processing failed: {e}")
        pass
    
    return cv


@router.delete("/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> None:
    """Delete a CV from database and filesystem."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
        
    # Delete file from filesystem
    from app.services.storage.file_storage import delete_cv_file
    delete_cv_file(cv.file_path)
    
    # Delete from DB
    db.delete(cv)
    db.commit()
    return None


@router.get("/{cv_id}/pdf")
async def download_cv_pdf(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
    template: str = "classic",
) -> Response:
    """Generate and download a branded CV PDF."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    structured = cv.structured_data or {
        "personal_info": {"name": current_user.full_name or current_user.email},
        "summary": "",
        "experience": [],
        "education": [],
        "skills": {},
    }

    pdf_bytes = generate_cv_pdf_bytes(structured, template=template)

    filename = f"cv_{cv_id}_{template}.pdf"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.get("/mine", response_model=list[CVRead])
async def list_my_cvs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> list[CVRead]:
    """List CVs uploaded by the current user."""
    cvs = db.query(CV).filter(CV.user_id == current_user.id).all()
    return cvs


@router.get("/{cv_id}", response_model=CVRead)
async def get_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> CVRead:
    """Fetch a single CV belonging to the current user."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv


@router.post("/{cv_id}/analyze", response_model=CVRead)
async def analyze_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> CVRead:
    """Trigger Groq AI review (Stage 5).
    
    Uses the already extracted and structured data to generate suggestions.
    """
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
        
    # Ensure we have data to analyze
    if not cv.extracted_cv or not cv.structured_data:
        # If data is missing (e.g. old CV), try to re-process locally first
        try:
            extracted_data = parse_cv_file(cv.file_path, cv.file_type)
            cv.extracted_cv = extracted_data
            raw_text = extracted_data.get("raw_text", "")
            
            analysis_result = analyze_cv_local(raw_text)
            cv.analysis_result = analysis_result
            cv.score = analysis_result.get("score", 0)
            
            structured_data = extract_structured_data(raw_text)
            cv.structured_data = structured_data
            
            db.add(cv)
            db.commit()
            db.refresh(cv) # Refresh to ensure fields are loaded
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process CV data: {e}")

    # Double check data availability
    if not cv.extracted_cv:
         raise HTTPException(status_code=500, detail="Failed to extract CV text.")

    # Call Groq Review
    suggestions = review_cv_with_groq(
        cv.extracted_cv,
        cv.structured_data,
        cv.analysis_result
    )
    
    cv.suggestions = suggestions
    cv.analyzed_at = datetime.utcnow()
    
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


@router.post("/{cv_id}/rewrite", response_model=Dict[str, str])
async def rewrite_cv(
    cv_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_supabase_user),
) -> Dict[str, str]:
    """Generate an improved version of the CV (Stage 7)."""
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
        
    if not cv.structured_data or not cv.suggestions:
        raise HTTPException(status_code=400, detail="CV must be analyzed before rewriting.")
        
    rewritten_content = rewrite_cv_with_groq(cv.structured_data, cv.suggestions)
    
    return {"rewritten_cv": rewritten_content}
