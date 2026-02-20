"""Generate branded CV PDFs from structured CV data."""
from io import BytesIO
from typing import Any, Dict
import logging

logger = logging.getLogger(__name__)

try:
    from xhtml2pdf import pisa
    XHTML2PDF_AVAILABLE = True
except ImportError:
    logger.warning("xhtml2pdf not available. PDF generation will be disabled.")
    XHTML2PDF_AVAILABLE = False
    pisa = None


def _build_classic_html(cv: Dict[str, Any]) -> str:
    """Build a simple but clean classic CV HTML layout."""
    personal = cv.get("personal_info", {})
    summary = cv.get("summary", "")
    experience = cv.get("experience", [])
    education = cv.get("education", [])
    skills = cv.get("skills", {})

    def esc(val: Any) -> str:
        return "" if val is None else str(val)

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8' />
  <style>
    body {{ font-family: Arial, sans-serif; color: #111827; margin: 32px; }}
    .header {{ border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; }}
    .name {{ font-size: 28px; font-weight: 700; }}
    .title {{ font-size: 16px; color: #4b5563; margin-top: 4px; }}
    .contact {{ font-size: 10px; color: #4b5563; margin-top: 8px; }}
    .section {{ margin-top: 18px; }}
    .section-title {{ font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 6px; }}
    .summary-text {{ font-size: 11px; line-height: 1.5; color: #111827; }}
    .role-row {{ margin-top: 8px; }}
    .role-header {{ display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; }}
    .role-company {{ color: #111827; }}
    .role-location {{ color: #6b7280; }}
    .role-dates {{ font-size: 10px; color: #6b7280; }}
    .role-bullets {{ margin: 4px 0 0 16px; padding: 0; }}
    .role-bullets li {{ font-size: 10px; line-height: 1.4; margin-bottom: 2px; }}
    .edu-item {{ margin-top: 6px; }}
    .edu-degree {{ font-size: 11px; font-weight: 600; }}
    .edu-school {{ font-size: 10px; color: #4b5563; }}
    .edu-dates {{ font-size: 10px; color: #6b7280; }}
    .skill-row {{ font-size: 10px; margin-top: 2px; }}
    .skill-label {{ font-weight: 600; color: #374151; }}
  </style>
</head>
<body>
  <div class='header'>
    <div class='name'>{esc(personal.get('name'))}</div>
    <div class='title'>{esc(personal.get('title'))}</div>
    <div class='contact'>
      {esc(personal.get('email'))} | {esc(personal.get('phone'))} | {esc(personal.get('location'))}
    </div>
  </div>

  <div class='section'>
    <div class='section-title'>Summary</div>
    <div class='summary-text'>{esc(summary)}</div>
  </div>

  <div class='section'>
    <div class='section-title'>Experience</div>
"""

    for item in experience:
        html += f"""
    <div class='role-row'>
      <div class='role-header'>
        <div>
          <span class='role-company'>{esc(item.get('role'))}</span>,
          <span class='role-location'>{esc(item.get('company'))}</span>
        </div>
        <div class='role-dates'>{esc(item.get('start_date'))} - {esc(item.get('end_date'))}</div>
      </div>
      <ul class='role-bullets'>
"""
        for b in item.get("bullets", []) or []:
            html += f"<li>{esc(b)}</li>"
        html += "</ul></div>"

    html += """
  </div>

  <div class='section'>
    <div class='section-title'>Education</div>
"""
    for edu in education:
        html += f"""
    <div class='edu-item'>
      <div class='edu-degree'>{esc(edu.get('degree'))}</div>
      <div class='edu-school'>{esc(edu.get('school'))}</div>
      <div class='edu-dates'>{esc(edu.get('start_date'))} - {esc(edu.get('end_date'))}</div>
    </div>
"""

    html += """
  </div>

  <div class='section'>
    <div class='section-title'>Skills</div>
"""
    for label, values in (skills or {}).items():
        html += f"""
    <div class='skill-row'>
      <span class='skill-label'>{esc(label)}:</span>
      <span>{', '.join(values or [])}</span>
    </div>
"""

    html += """
  </div>
</body>
</html>
"""
    return html


def generate_cv_pdf_bytes(structured: Dict[str, Any], template: str = "classic") -> bytes:
    """Generate a PDF for the given structured CV data.

    Currently only a "classic" template is implemented.
    """
    if not XHTML2PDF_AVAILABLE:
        raise RuntimeError("PDF generation is not available in this environment (xhtml2pdf not installed).")

    if template != "classic":
        template = "classic"

    html = _build_classic_html(structured)
    pdf_io = BytesIO()
    pisa.CreatePDF(html, dest=pdf_io)
    return pdf_io.getvalue()
