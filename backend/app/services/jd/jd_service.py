"""Centralised JD ingestion, parsing, and quality scoring."""
from __future__ import annotations
import json
from typing import Any, Dict

import httpx
from bs4 import BeautifulSoup

from app.core.config import settings
from groq import Groq


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
        print(f"[jd_service] Groq call failed: {exc}")
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
        raise ValueError(f"Could not fetch URL: {exc}") from exc


def parse_jd_text(jd_text: str) -> Dict[str, Any]:
    """Normalise raw JD text into structured fields via Groq."""
    prompt = f"""Extract structured information from this job description.
Return ONLY valid JSON with keys:
- title (string)
- company (string or null)
- location (string or null)
- work_mode (remote|hybrid|onsite|null)
- seniority (junior|mid|senior|lead|executive|null)
- salary (string or null)
- required_skills (array of strings, max 20)
- nice_to_have_skills (array of strings, max 10)
- responsibilities (array of strings, max 8)
- qualifications (array of strings, max 8)
- experience_years (string like "3-5 years" or null)
- contract_type (full-time|part-time|contract|freelance|null)
- benefits (array of strings, max 6)
- industry (string or null)

JOB DESCRIPTION:
{jd_text[:4000]}"""
    result = _groq_json(prompt)
    return result if isinstance(result, dict) else {}


def score_jd_quality(jd_text: str, parsed: Dict[str, Any]) -> Dict[str, Any]:
    """Score a JD across 8 quality dimensions and return improvement hints."""
    prompt = f"""Evaluate this job description quality. Return ONLY valid JSON.

Score each dimension 0-100 with a 1-sentence explanation:
- clarity: Is the role clearly defined?
- specificity: Are requirements concrete vs vague?
- inclusivity: Is language inclusive and bias-free?
- skill_completeness: Are required skills fully listed?
- seniority_clarity: Is experience/seniority level clear?
- outcome_clarity: Are success metrics or deliverables stated?
- compensation_transparency: Is salary/benefits disclosed? (100 = fully disclosed)
- jargon_score: Is internal jargon minimal? (100 = no jargon)

Also provide:
- overall_score: weighted average int 0-100
- top_issues: array of 3 most impactful improvement areas (strings)
- improvement_suggestions: array of 3 specific rewrites or additions (strings)
- predicted_match_impact: string describing how improvements would affect candidate quality

JD TEXT (first 2000 chars): {jd_text[:2000]}
PARSED DATA: {str(parsed)[:400]}"""
    result = _groq_json(prompt)
    return result if isinstance(result, dict) else {
        "overall_score": 50,
        "top_issues": [],
        "improvement_suggestions": [],
        "predicted_match_impact": "",
    }
