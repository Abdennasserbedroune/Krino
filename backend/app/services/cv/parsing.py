"""CV Parsing Service.

Handles text extraction from PDF and DOCX files, including OCR fallback for scanned PDFs.
"""
import logging
from pathlib import Path
from typing import Dict, Any, Union

import docx2txt
from PyPDF2 import PdfReader
logger = logging.getLogger(__name__)

try:
    from pdf2image import convert_from_path
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    logger.warning("OCR dependencies (pdf2image, pytesseract) not found. OCR fallback disabled.")
    OCR_AVAILABLE = False

def parse_cv_file(file_path: Union[str, Path], file_type: str) -> Dict[str, Any]:
    """Parse a CV file and extract raw text and metadata.
    
    Args:
        file_path: Path to the file
        file_type: File extension (pdf, docx, doc)
        
    Returns:
        Dict containing:
        - raw_text: Extracted text
        - is_scanned: Boolean indicating if OCR was used
        - page_count: Number of pages
    """
    file_path = Path(file_path)
    file_type = file_type.lower().replace(".", "")
    
    if file_type == "pdf":
        return _parse_pdf(file_path)
    elif file_type in ["docx", "doc"]:
        return _parse_docx(file_path)
    elif file_type == "txt":
        text = file_path.read_text(encoding="utf-8", errors="ignore")
        return {
            "raw_text": text,
            "is_scanned": False,
            "page_count": 1
        }
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def _parse_pdf(file_path: Path) -> Dict[str, Any]:
    """Extract text from PDF, using OCR if necessary."""
    try:
        reader = PdfReader(str(file_path))
        page_count = len(reader.pages)
        text = ""
        
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        
        is_scanned = False
        
        # If text is very short or empty, assume scanned and try OCR
        if (not text.strip() or len(text.strip()) < 50) and OCR_AVAILABLE:
            logger.info(f"PDF {file_path.name} appears to be scanned. Attempting OCR.")
            try:
                images = convert_from_path(str(file_path))
                ocr_text = ""
                for image in images:
                    ocr_text += pytesseract.image_to_string(image) + "\n"
                
                if ocr_text.strip():
                    text = ocr_text
                    is_scanned = True
            except Exception as e:
                logger.error(f"OCR failed for {file_path}: {e}")
        elif not text.strip() or len(text.strip()) < 50:
             logger.warning(f"PDF {file_path.name} appears to be scanned but OCR is not available.")
        
        return {
            "raw_text": text.strip(),
            "is_scanned": is_scanned,
            "page_count": page_count
        }
        
    except Exception as e:
        logger.error(f"Error parsing PDF {file_path}: {e}")
        return {
            "raw_text": "",
            "is_scanned": False,
            "page_count": 0,
            "error": str(e)
        }

def _parse_docx(file_path: Path) -> Dict[str, Any]:
    """Extract text from DOCX."""
    try:
        text = docx2txt.process(str(file_path))
        # docx2txt doesn't give page count easily, approximation or 1
        return {
            "raw_text": text.strip(),
            "is_scanned": False,
            "page_count": 1  # Approximation
        }
    except Exception as e:
        logger.error(f"Error parsing DOCX {file_path}: {e}")
        return {
            "raw_text": "",
            "is_scanned": False,
            "page_count": 0,
            "error": str(e)
        }
