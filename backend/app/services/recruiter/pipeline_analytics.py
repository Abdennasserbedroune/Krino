"""Pipeline analytics aggregation helpers — no AI needed, pure SQL aggregation."""
from __future__ import annotations
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models.recruiter import JobPosting, CandidateCard, PipelineStage


def get_pipeline_kpis(db: Session, recruiter_id: str) -> Dict[str, Any]:
    """Top-level KPI cards for the recruiter pipeline dashboard."""
    jobs_total = db.query(func.count(JobPosting.id)).filter(
        JobPosting.recruiter_id == recruiter_id
    ).scalar() or 0

    jobs_open = db.query(func.count(JobPosting.id)).filter(
        JobPosting.recruiter_id == recruiter_id,
        JobPosting.status == "open",
    ).scalar() or 0

    # All candidate cards for this recruiter's jobs
    sub = db.query(JobPosting.id).filter(JobPosting.recruiter_id == recruiter_id).subquery()
    total_candidates = db.query(func.count(CandidateCard.id)).filter(
        CandidateCard.job_id.in_(sub)
    ).scalar() or 0

    shortlisted = db.query(func.count(CandidateCard.id)).filter(
        CandidateCard.job_id.in_(sub),
        CandidateCard.stage.in_([
            PipelineStage.PHONE, PipelineStage.INTERVIEW,
            PipelineStage.OFFER,  PipelineStage.HIRED,
        ]),
    ).scalar() or 0

    hired = db.query(func.count(CandidateCard.id)).filter(
        CandidateCard.job_id.in_(sub),
        CandidateCard.stage == PipelineStage.HIRED,
    ).scalar() or 0

    avg_score = db.query(func.avg(CandidateCard.match_score)).filter(
        CandidateCard.job_id.in_(sub)
    ).scalar()

    shortlist_rate = round((shortlisted / total_candidates * 100), 1) if total_candidates else 0
    hire_rate      = round((hired / total_candidates * 100), 1) if total_candidates else 0

    return {
        "jobs_total":       jobs_total,
        "jobs_open":        jobs_open,
        "total_candidates": total_candidates,
        "shortlisted":      shortlisted,
        "hired":            hired,
        "shortlist_rate":   shortlist_rate,
        "hire_rate":        hire_rate,
        "avg_match_score":  round(float(avg_score), 1) if avg_score else 0,
    }


def get_funnel_by_job(
    db: Session, recruiter_id: str, job_id: int
) -> List[Dict[str, Any]]:
    """Stage-level funnel counts for a single job posting."""
    rows = (
        db.query(CandidateCard.stage, func.count(CandidateCard.id))
        .join(JobPosting, CandidateCard.job_id == JobPosting.id)
        .filter(
            JobPosting.recruiter_id == recruiter_id,
            CandidateCard.job_id == job_id,
        )
        .group_by(CandidateCard.stage)
        .all()
    )
    stage_order = [
        PipelineStage.SCREENED, PipelineStage.PHONE,
        PipelineStage.INTERVIEW, PipelineStage.OFFER,
        PipelineStage.HIRED,    PipelineStage.REJECTED,
    ]
    counts = {stage: 0 for stage in stage_order}
    for stage, cnt in rows:
        if stage in counts:
            counts[stage] = cnt
    return [{"stage": s, "count": counts[s]} for s in stage_order]


def get_score_distribution(
    db: Session, recruiter_id: str, job_id: int
) -> List[Dict[str, Any]]:
    """Score histogram buckets for a job's candidate pool."""
    sub = db.query(CandidateCard.match_score).join(
        JobPosting, CandidateCard.job_id == JobPosting.id
    ).filter(
        JobPosting.recruiter_id == recruiter_id,
        CandidateCard.job_id == job_id,
        CandidateCard.match_score.isnot(None),
    ).all()
    scores = [r[0] for r in sub]
    buckets = [
        {"range": "0-20",  "count": 0},
        {"range": "21-40", "count": 0},
        {"range": "41-60", "count": 0},
        {"range": "61-80", "count": 0},
        {"range": "81-100","count": 0},
    ]
    for s in scores:
        idx = min(int(s // 20), 4)
        buckets[idx]["count"] += 1
    return buckets
