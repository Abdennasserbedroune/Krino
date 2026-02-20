"""File storage helpers for CV uploads."""
from pathlib import Path
from typing import Tuple

from fastapi import UploadFile

from app.core.config import settings


def ensure_upload_dir() -> Path:
    """Ensure the upload directory exists and return its path."""
    base = Path(settings.UPLOAD_DIR)
    base.mkdir(parents=True, exist_ok=True)
    return base


async def save_cv_file(user_id: int, file: UploadFile) -> Tuple[str, int, str]:
    """Save an uploaded CV file for a user.

    Returns (file_path, file_size_bytes, file_extension).
    """
    upload_dir = ensure_upload_dir() / str(user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename).suffix  # includes leading dot
    safe_name = Path(file.filename).name
    target_path = upload_dir / safe_name

    size = 0
    with target_path.open("wb") as out:
        while True:
            chunk = await file.read(8192)
            if not chunk:
                break
            size += len(chunk)
            out.write(chunk)

    ext = suffix.lstrip(".").lower()
    return str(target_path), size, ext


def delete_cv_file(file_path: str) -> None:
    """Delete a CV file from the filesystem."""
    path = Path(file_path)
    if path.exists():
        path.unlink()
