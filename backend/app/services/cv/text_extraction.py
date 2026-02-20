"""Utilities to extract text from uploaded CV files."""
from pathlib import Path
from typing import Optional

import docx2txt
from PyPDF2 import PdfReader


def extract_text_from_file(path: str, file_type: str) -> str:
    """Extract raw text from a CV file based on its type.

    Supported types: pdf, docx, doc, txt.
    """
    file_type = file_type.lower()
    p = Path(path)

    if file_type == "pdf":
        return _extract_from_pdf(p)
    if file_type in {"docx", "doc"}:
        return _extract_from_docx(p)
    if file_type == "txt":
        return p.read_text(encoding="utf-8", errors="ignore")

    raise ValueError(f"Unsupported file type for extraction: {file_type}")


def _extract_from_pdf(path: Path) -> str:
    reader = PdfReader(path)
    texts = []
    for page in reader.pages:
        try:
            texts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(texts)


def _extract_from_docx(path: Path) -> str:
    # docx2txt can also handle .doc reasonably in many cases
    return docx2txt.process(str(path)) or ""
