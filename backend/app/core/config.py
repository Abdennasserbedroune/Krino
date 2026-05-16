"""Application configuration settings."""
from pydantic_settings import BaseSettings
from pydantic import field_validator, ConfigDict
from typing import Union
import os
from pathlib import Path

_DEFAULT_SECRET = "your_secret_key_here_at_least_32_chars"


class Settings(BaseSettings):
    model_config = ConfigDict(
        case_sensitive=True,
        env_file=(".env.local", ".env"),
        extra="allow",
    )

    PROJECT_NAME: str = "Krino"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = _DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    FRONTEND_URL: str = "http://localhost:3000"

    DATABASE_URL: str = "sqlite:///./pathwise.db"

    UPLOAD_DIR: str = "/tmp/uploads" if os.environ.get("VERCEL") or os.environ.get("RENDER") else "uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024
    ALLOWED_FILE_TYPES: Union[str, list[str]] = "pdf,docx,doc,txt"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    HF_API_TOKEN: str = ""
    NVIDIA_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_not_be_default(cls, v: str) -> str:
        if v == _DEFAULT_SECRET:
            raise ValueError(
                "SECRET_KEY is still the default placeholder. "
                "Set a real secret in your .env file."
            )
        return v

    @field_validator("ALLOWED_FILE_TYPES")
    @classmethod
    def parse_allowed_file_types(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",")]
        return v


settings = Settings()

try:
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
except OSError:
    pass
