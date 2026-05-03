"""Application configuration settings."""
from pydantic_settings import BaseSettings
from pydantic import field_validator, ConfigDict
from typing import Optional, Union
import os
from pathlib import Path

class Settings(BaseSettings):
    model_config = ConfigDict(
        case_sensitive=True,
        env_file=(".env.local", ".env"),  # Try .env.local first, then .env
        extra="allow"  # Allow extra environment variables
    )
    
    # Application
    PROJECT_NAME: str = "Krino"
    API_V1_STR: str = ""
    SECRET_KEY: str = "your_secret_key_here_at_least_32_chars"  # Required - Change this in production!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Database
    DATABASE_URL: str = "sqlite:///./pathwise.db"
    
    # File Storage
    UPLOAD_DIR: str = "/tmp/uploads" if os.environ.get("VERCEL") or os.environ.get("RENDER") else "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_FILE_TYPES: Union[str, list[str]] = "pdf,docx,doc,txt"
    
    # Groq API
    GROQ_API_KEY: str = ""  # Required - set in .env or .env.local
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    
    @field_validator('ALLOWED_FILE_TYPES')
    @classmethod
    def parse_allowed_file_types(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(',')]
        return v
        
settings = Settings()

# Create uploads directory if it doesn't exist (may fail on serverless/read-only filesystems)
try:
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
except OSError:
    pass  # Read-only filesystem (e.g., Vercel) - /tmp/uploads will be created on demand
