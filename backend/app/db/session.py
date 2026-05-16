"""Database session management."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi import HTTPException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

try:
    db_url = settings.DATABASE_URL
    if ("supabase" in db_url or "postgresql" in db_url) and "sslmode" not in db_url:
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}sslmode=require"
        engine = create_engine(db_url, pool_pre_ping=True, pool_timeout=5, pool_recycle=300)
    elif db_url.startswith("sqlite"):
        engine = create_engine(db_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    else:
        engine = create_engine(db_url, pool_pre_ping=True)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    DB_AVAILABLE = True
    logger.info("Database engine created successfully")

except Exception as e:
    logger.warning(f"Database connection failed: {e} — running in limited mode")
    engine = None
    SessionLocal = None
    DB_AVAILABLE = False


def get_db() -> Session:
    if not DB_AVAILABLE:
        raise HTTPException(status_code=503, detail="Database is not available")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if DB_AVAILABLE:
    try:
        from app.db.models.user import User  # noqa
        from app.db.models.cv import CV  # noqa
        from app.db.models.cv_builder import CVDraft  # noqa
        from app.db.models.recruiter import JobPosting, CandidateCard  # noqa
        from app.db.models.tracker import SavedJob  # noqa
        from app.db.models.outreach import OutreachMessage  # noqa
        logger.info("All models registered with SQLAlchemy")
    except Exception as e:
        logger.warning(f"Could not import some models: {e}")


def init_db() -> None:
    if not DB_AVAILABLE:
        logger.warning("Skipping database initialization — DB not available")
        return
    try:
        from app.db.base_class import Base
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
