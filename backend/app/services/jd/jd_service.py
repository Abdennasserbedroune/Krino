"""Centralised JD ingestion, parsing, and quality scoring."""
from __future__ import annotations
import json
import logging
from typing import Any, Dict

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings
from groq import Groq

logger = logging.getLogger(__name__)


def _groq_json(prompt: str, system: str = "You are a precise data extractor. Return ONLY valid JSON.") -> Dict[str, Any]:
    client = Groq(api_key=settings.GROQ_API_KEY)
    try:
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
            max_tokens=1200,
        )
        return json.loads(resp.choices[0].message.content.strip())
    except Exception as exc:
        logger.error("[jd_service] Groq call failed: %s", exc)
        return {}


def fetch_jd_from_url(url: str) -> str:
    """Fetch and extract readable job description text from a URL."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; Pathwise/1.0)"}
        resp = httpx.get(url, headers=headers, timeout=12, follow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)
        return text[:6000]
    except Exception as exc:
        raise ValueError("Could not fetch URL: " + str(exc)) from exc


def parse_jd_text(jd_text: str) -> Dict[str, Any]:
    """Normalise raw JD text into structured fields via Groq."""
    prompt = (
        "Extract structured information from this job description.\n"
        "Return ONLY valid JSON with keys:\n"
        "- title (string)\n"
        "- company (string or null)\n"
        "- location (string or null)\n"
        "- work_mode (remote|hybrid|onsite|null)\n"
        "- seniority (junior|mid|senior|lead|executive|null)\n"
        "- salary (string or null)\n"
        "- required_skills (array of strings, max 20)\n"
        "- nice_to_have_skills (array of strings, max 10)\n"
        "- responsibilities (array of strings, max 8)\n"
        "- qualifications (array of strings, max 8)\n"
        "- experience_years (string like \"3-5 years\" or null)\n"
        "- contract_type (full-time|part-time|contract|freelance|null)\n"
        "- benefits (array of strings, max 6)\n"
        "- industry (string or null)\n\n"
        "JOB DESCRIPTION:\n" + jd_text[:4000]
    )
    result = _groq_json(prompt)
    return result if isinstance(result, dict) else {}


def score_jd_quality(jd_text: str, parsed: Dict[str, Any]) -> Dict[str, Any]:
    """Score a JD across 8 quality dimensions and return improvement hints."""
    prompt = (
        "Evaluate this job description quality. Return ONLY valid JSON.\n\n"
        "Score each dimension 0-100 with a 1-sentence explanation:\n"
        "- clarity: Is the role clearly defined?\n"
        "- specificity: Are requirements concrete vs vague?\n"
        "- inclusivity: Is language inclusive and bias-free?\n"
        "- skill_completeness: Are required skills fully listed?\n"
        "- seniority_clarity: Is experience/seniority level clear?\n"
        "- outcome_clarity: Are success metrics or deliverables stated?\n"
        "- compensation_transparency: Is salary/benefits disclosed? (100 = fully disclosed)\n"
        "- jargon_score: Is internal jargon minimal? (100 = no jargon)\n\n"
        "Also provide:\n"
        "- overall_score: weighted average int 0-100\n"
        "- top_issues: array of 3 most impactful improvement areas (strings)\n"
        "- improvement_suggestions: array of 3 specific rewrites or additions (strings)\n"
        "- predicted_match_impact: string describing how improvements would affect candidate quality\n\n"
        "JD TEXT (first 2000 chars): " + jd_text[:2000] + "\n"
        "PARSED DATA: " + str(parsed)[:400]
    )
    result = _groq_json(prompt)
    return result if isinstance(result, dict) else {
        "overall_score": 50,
        "top_issues": [],
        "improvement_suggestions": [],
        "predicted_match_impact": "",
    }
