"""
The job index: real vacancies imported from registered employer boards
(job_ingest.py) or curated by an admin.

Listing and reading postings is public, since they're published adverts
and a visitor should see real value before signing up. A signed-in
candidate also gets, per posting, how many of its named skills their
active resume covers (from the cached resume skills, no PDF parsing), and
a full assessment on request.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

import db_models
from assessment import assess
from auth import get_current_candidate, get_optional_user
from database import as_utc, get_db
from job_ingest import expire_past_deadlines
from resumes_routes import load_resume_text_and_profile

router = APIRouter(prefix="/postings", tags=["postings"])

STALE_AFTER = timedelta(days=60)
LEVELS = ["Internship", "Graduate", "Junior", "Mid", "Senior", "Unspecified"]
WORK_MODES = ["Remote", "Hybrid", "On-site", "Unspecified"]


def _iso(dt):
    return as_utc(dt).isoformat() if dt else None


def _is_stale(posting: db_models.JobPosting) -> bool:
    return bool(posting.posted_at) and datetime.now(timezone.utc) - as_utc(posting.posted_at) > STALE_AFTER


def posting_summary(p: db_models.JobPosting, cv_skills: set[str] | None = None, tracked_id: str | None = None) -> dict:
    skills = p.skills or []
    out = {
        "id": p.id,
        "title": p.title,
        "company": p.company,
        "location": p.location or "",
        "country": p.country or "",
        "work_mode": p.work_mode,
        "employment_type": p.employment_type,
        "experience_level": p.experience_level,
        "open_to_sri_lanka": bool(p.open_to_sri_lanka),
        "posted_at": _iso(p.posted_at),
        "last_verified_at": _iso(p.last_verified_at),
        "status": p.status,
        "is_stale": _is_stale(p),
        "skills": skills[:10],
        "source": {"kind": p.source.kind if p.source else "", "name": p.source.company if p.source else ""},
        "tracked_id": tracked_id,
        "skill_overlap": None,
    }
    if cv_skills is not None and skills:
        found = sorted(set(skills) & cv_skills)
        out["skill_overlap"] = {"found": len(found), "total": len(skills), "found_skills": found}
    return out


def posting_detail(p: db_models.JobPosting, cv_skills=None, tracked_id=None) -> dict:
    out = posting_summary(p, cv_skills, tracked_id)
    out.update({
        "skills": p.skills or [],
        "description": p.description or "",
        "apply_url": p.apply_url or "",
        "source_url": p.source_url or "",
        "first_seen_at": _iso(p.first_seen_at),
        "closed_at": _iso(p.closed_at),
        "expires_at": _iso(p.expires_at),
        "source": {
            "kind": p.source.kind if p.source else "",
            "name": p.source.company if p.source else "",
            "website": p.source.website if p.source else "",
        },
    })
    return out


def _active_resume(db: Session, user) -> db_models.Resume | None:
    if not user or user.role != "candidate":
        return None
    return db.query(db_models.Resume).filter_by(candidate_id=user.id, is_active=True).first()


def _tracked_map(db: Session, user) -> dict[str, str]:
    if not user:
        return {}
    rows = db.query(db_models.TrackedJob.posting_id, db_models.TrackedJob.id).filter(
        db_models.TrackedJob.user_id == user.id, db_models.TrackedJob.posting_id.isnot(None),
    ).all()
    return {posting_id: tracked_id for posting_id, tracked_id in rows}


@router.get("")
def search_postings(
    q: str = Query("", max_length=200),
    skill: str = Query("", max_length=60),
    company: str = Query("", max_length=200),
    country: str = Query("", max_length=80),
    location: str = Query("", max_length=120),
    work_mode: str = Query("", max_length=20),
    employment_type: str = Query("", max_length=40),
    level: str = Query("", max_length=120, description="Comma-separated experience levels"),
    posted_within: int | None = Query(None, ge=1, le=365, description="Days"),
    open_to_sri_lanka: bool = False,
    include_expired: bool = False,
    sort: str = Query("newest", pattern="^(newest|skills)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0, le=5000),
    user=Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    expire_past_deadlines(db)
    query = db.query(db_models.JobPosting).filter(db_models.JobPosting.duplicate_of.is_(None))
    if not include_expired:
        query = query.filter(db_models.JobPosting.status == "active")
    for word in q.lower().split()[:8]:
        like = f"%{word}%"
        query = query.filter(or_(
            func.lower(db_models.JobPosting.title).like(like),
            func.lower(db_models.JobPosting.company).like(like),
            func.lower(db_models.JobPosting.description).like(like),
        ))
    if company:
        query = query.filter(func.lower(db_models.JobPosting.company) == company.lower())
    if country:
        query = query.filter(func.lower(db_models.JobPosting.country) == country.lower())
    if location:
        query = query.filter(func.lower(db_models.JobPosting.location).like(f"%{location.lower()}%"))
    if work_mode:
        query = query.filter(db_models.JobPosting.work_mode == work_mode)
    if employment_type:
        query = query.filter(db_models.JobPosting.employment_type == employment_type)
    levels = [l for l in level.split(",") if l in LEVELS]
    if levels:
        query = query.filter(db_models.JobPosting.experience_level.in_(levels))
    if posted_within:
        # Naive UTC: that's how DateTime columns come back from both SQLite
        # and TiDB, so the comparison happens in the same terms.
        since = (datetime.now(timezone.utc) - timedelta(days=posted_within)).replace(tzinfo=None)
        query = query.filter(db_models.JobPosting.posted_at >= since)
    if open_to_sri_lanka:
        query = query.filter(db_models.JobPosting.open_to_sri_lanka.is_(True))

    rows = query.all()
    if skill:
        wanted = skill.strip().lower()
        rows = [p for p in rows if wanted in (p.skills or [])]

    resume = _active_resume(db, user)
    cv_skills = set(resume.cv_skills or []) if resume else None
    tracked = _tracked_map(db, user)

    def newest_key(p):
        return as_utc(p.posted_at or p.first_seen_at).timestamp()

    if sort == "skills" and cv_skills is not None:
        rows.sort(key=lambda p: (-len(set(p.skills or []) & cv_skills), -newest_key(p)))
    else:
        rows.sort(key=lambda p: -newest_key(p))

    page = rows[offset: offset + limit]
    return {
        "total": len(rows),
        "has_resume": resume is not None,
        "results": [posting_summary(p, cv_skills, tracked.get(p.id)) for p in page],
    }


@router.get("/facets")
def facets(db: Session = Depends(get_db)):
    active = db.query(db_models.JobPosting).filter(
        db_models.JobPosting.status == "active", db_models.JobPosting.duplicate_of.is_(None),
    )

    def counts(column):
        rows = active.with_entities(column, func.count()).group_by(column).all()
        return sorted(({"value": v, "count": c} for v, c in rows if v), key=lambda r: (-r["count"], r["value"]))

    sources = db.query(db_models.JobSource).filter(db_models.JobSource.enabled.is_(True)).all()
    last_synced = max((as_utc(s.last_synced_at) for s in sources if s.last_synced_at), default=None)
    return {
        "total": active.count(),
        "open_to_sri_lanka": active.filter(db_models.JobPosting.open_to_sri_lanka.is_(True)).count(),
        "companies": counts(db_models.JobPosting.company),
        "countries": counts(db_models.JobPosting.country),
        "levels": counts(db_models.JobPosting.experience_level),
        "employment_types": counts(db_models.JobPosting.employment_type),
        "work_modes": counts(db_models.JobPosting.work_mode),
        "sources": len(sources),
        "last_synced_at": last_synced.isoformat() if last_synced else None,
    }


def get_posting_or_404(db: Session, posting_id: str) -> db_models.JobPosting:
    posting = db.query(db_models.JobPosting).filter_by(id=posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job not found")
    return posting


@router.get("/{posting_id}")
def get_posting(posting_id: str, user=Depends(get_optional_user), db: Session = Depends(get_db)):
    posting = get_posting_or_404(db, posting_id)
    if posting.duplicate_of:
        original = db.query(db_models.JobPosting).filter_by(id=posting.duplicate_of).first()
        if original:
            posting = original
    resume = _active_resume(db, user)
    return posting_detail(posting, set(resume.cv_skills or []) if resume else None, _tracked_map(db, user).get(posting.id))


def candidate_profile_skills(db: Session, user) -> list[str]:
    profile = db.query(db_models.CandidateProfile).filter_by(user_id=user.id).first()
    return list(profile.skills or []) if profile else []


@router.get("/{posting_id}/assessment")
def assess_posting(
    posting_id: str,
    resume_id: str | None = None,
    candidate=Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    posting = get_posting_or_404(db, posting_id)
    query = db.query(db_models.Resume).filter_by(candidate_id=candidate.id)
    resume = query.filter_by(id=resume_id).first() if resume_id else query.filter_by(is_active=True).first()
    if not resume:
        raise HTTPException(status_code=409, detail="Upload a resume to see how you match this job")
    cv_text, profile = load_resume_text_and_profile(resume)
    result = assess(cv_text, profile, posting.title, posting.description or "",
                    confirmed_skills=candidate_profile_skills(db, candidate))
    return {"resume": {"id": resume.id, "filename": resume.filename, "version": resume.version}, **result}
