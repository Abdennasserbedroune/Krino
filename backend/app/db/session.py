"""Database session management."""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine with lazy initialization
try:
    # Configure connection arguments based on backend
    if settings.DATABASE_URL.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    elif "supabase" in settings.DATABASE_URL or "postgresql" in settings.DATABASE_URL:
        connect_args = {"sslmode": "require"}
    else:
        connect_args = {}

    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        connect_args=connect_args,
        pool_timeout=5,
        pool_recycle=300,
    )

    # Session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    DB_AVAILABLE = True
    logger.info("✅ Database engine created successfully")

except Exception as e:
    logger.warning(f"⚠️  Database connection failed: {e}")
    logger.warning("⚠️  Running in limited mode without database")
    engine = None
    SessionLocal = None
    DB_AVAILABLE = False

def get_db() -> Session:
    """Get a database session."""
    if not DB_AVAILABLE:
        raise RuntimeError("Database is not available")
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Import all models here to ensure they are registered with SQLAlchemy
if DB_AVAILABLE:
    try:
        from app.db.models.user import User  # noqa
        from app.db.models.cv import CV  # noqa
    except Exception as e:
        logger.warning(f"⚠️  Could not import models: {e}")

# Create tables
def init_db() -> None:
    """Initialize the database."""
    if not DB_AVAILABLE:
        logger.warning("⚠️  Skipping database initialization (DB not available)")
        return
    
    try:
        from app.db.base_class import Base
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
