"""
Recruiter analytics and CSV report exports. Every number here is a plain
aggregate over this recruiter's own Job/Application rows — nothing here is
estimated, sampled, or fabricated.
"""

import csv
import io
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

import db_models
from applications_schemas import APPLICATION_STATUSES
from auth import get_current_recruiter
from database import as_utc, get_db

router = APIRouter(tags=["analytics"])

PIPELINE_STAGES = ["Applied", "Screening", "Interview", "Offer"]
SCORE_BUCKETS = [(0, 20), (20, 40), (40, 60), (60, 80), (80, 100.01)]


def _recruiter_applications(recruiter_id: int, db: Session) -> list[db_models.Application]:
    return (
        db.query(db_models.Application)
        .join(db_models.Job, db_models.Application.job_id == db_models.Job.id)
        .filter(db_models.Job.recruiter_id == recruiter_id)
        .all()
    )


@router.get("/analytics/overview")
def analytics_overview(
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    jobs = db.query(db_models.Job).filter_by(recruiter_id=recruiter.id).all()
    apps = _recruiter_applications(recruiter.id, db)

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_applications = sum(1 for a in apps if as_utc(a.created_at) >= seven_days_ago)

    pipeline = {stage: sum(1 for a in apps if a.status == stage) for stage in PIPELINE_STAGES}
    status_distribution = {status: sum(1 for a in apps if a.status == status) for status in APPLICATION_STATUSES}

    score_distribution = []
    for low, high in SCORE_BUCKETS:
        count = sum(1 for a in apps if low <= a.match_score < high)
        score_distribution.append({"range": f"{low}-{int(high)}", "count": count})

    skills_counter: Counter[str] = Counter()
    for job in jobs:
        for skill in (job.required_skills or []) + (job.preferred_skills or []):
            skills_counter[skill] += 1
    skills_demand = [{"skill": s, "count": c} for s, c in skills_counter.most_common(10)]

    recent_applications = sorted(apps, key=lambda a: a.created_at, reverse=True)[:5]
    top_matches = sorted(apps, key=lambda a: a.match_score, reverse=True)[:5]

    def _app_brief(a: db_models.Application) -> dict:
        job = db.query(db_models.Job).filter_by(id=a.job_id).first()
        candidate = db.query(db_models.User).filter_by(id=a.candidate_id).first()
        return {
            "application_id": a.id,
            "job_id": a.job_id,
            "job_title": job.title if job else "",
            "candidate_id": a.candidate_id,
            "candidate_name": candidate.full_name if candidate and candidate.full_name else (candidate.email if candidate else ""),
            "match_score": a.match_score,
            "status": a.status,
            "created_at": a.created_at,
        }

    return {
        "open_jobs": sum(1 for j in jobs if j.status == "Open"),
        "total_candidates": len({a.candidate_id for a in apps}),
        "new_applications": new_applications,
        "shortlisted_candidates": sum(1 for a in apps if a.status == "Shortlisted"),
        "pipeline": pipeline,
        "status_distribution": status_distribution,
        "score_distribution": score_distribution,
        "skills_demand": skills_demand,
        "recent_candidates": [_app_brief(a) for a in recent_applications],
        "recent_jobs": [
            {"id": j.id, "title": j.title, "status": j.status, "created_at": j.created_at}
            for j in sorted(jobs, key=lambda j: j.created_at, reverse=True)[:5]
        ],
        "top_matches": [_app_brief(a) for a in top_matches],
    }


def _csv_response(rows: list[dict], filename: str) -> Response:
    buffer = io.StringIO()
    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _report_row(a: db_models.Application, db: Session) -> dict:
    candidate = db.query(db_models.User).filter_by(id=a.candidate_id).first()
    job = db.query(db_models.Job).filter_by(id=a.job_id).first()
    return {
        "job_title": job.title if job else "",
        "candidate_name": candidate.full_name if candidate else "",
        "candidate_email": candidate.email if candidate else "",
        "match_score": a.match_score,
        "skill_coverage": a.skill_coverage,
        "status": a.status,
        "matched_skills": "; ".join(a.matched_skills or []),
        "missing_skills": "; ".join(a.missing_skills or []),
        "applied_at": a.created_at.isoformat(),
    }


@router.get("/reports/job/{job_id}")
def job_matching_report(
    job_id: str,
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(db_models.Job).filter_by(id=job_id, recruiter_id=recruiter.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    apps = (
        db.query(db_models.Application)
        .filter_by(job_id=job_id)
        .order_by(db_models.Application.match_score.desc())
        .all()
    )
    rows = [_report_row(a, db) for a in apps]
    return _csv_response(rows, f"job-matching-report-{job.title.replace(' ', '-').lower()}.csv")


@router.get("/reports/shortlist")
def shortlist_report(
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    apps = [a for a in _recruiter_applications(recruiter.id, db) if a.status == "Shortlisted"]
    rows = [_report_row(a, db) for a in sorted(apps, key=lambda a: a.match_score, reverse=True)]
    return _csv_response(rows, "shortlist-report.csv")
