"""Versioned v1 API routes for Pathwise backend."""
from fastapi import APIRouter

from app.api.v1 import auth, cv, chat, recruiter

router = APIRouter()

# Mount sub-routers
router.include_router(auth.router)
router.include_router(cv.router)
router.include_router(chat.router)
router.include_router(recruiter.router)


@router.get("/status", tags=["meta"], summary="API status")
def read_status() -> dict[str, str]:
    """Return a simple status payload for the versioned API."""
    return {"status": "ok"}
