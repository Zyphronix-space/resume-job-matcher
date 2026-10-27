"""
The candidate's private job tracker and per-job workspace.

Every route is scoped to the signed-in candidate: _own() looks a tracked
job up by (id, user_id), so another account's id is indistinguishable
from one that doesn't exist (404 either way).

Nothing here contacts an employer. Applying happens on the employer's own
site via apply_url; drafts are text the candidate copies out themselves.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

import db_models
import drafts
from assessment import assess
from auth import get_current_candidate
from database import as_utc, get_db
from job_sources import SourceError, _safe_url, fetch_single_posting, parse_posting_url
from postings_routes import candidate_profile_skills, posting_summary
from resumes_routes import load_resume_text_and_profile

router = APIRouter(prefix="/tracker", tags=["tracker"])

STAGES = db_models.TRACKER_STAGES
DocKind = Literal["resume", "cover_letter", "outreach"]


class TrackPostingIn(BaseModel):
    posting_id: str = Field(min_length=1, max_length=36)


class ManualJobIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    company: str = Field("", max_length=200)
    location: str = Field("", max_length=500)
    apply_url: str = Field("", max_length=1000)
    description: str = Field("", max_length=30000)

    @field_validator("apply_url")
    @classmethod
    def _url(cls, value: str) -> str:
        if value and not _safe_url(value):
            raise ValueError("Use a full http(s) link")
        return value


class ImportJobIn(BaseModel):
    url: str = Field(min_length=8, max_length=2000)


class TrackedUpdateIn(BaseModel):
    stage: Optional[str] = None
    resume_id: Optional[str] = Field(None, max_length=36)
    applied_on: Optional[date] = None
    next_follow_up: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=20000)
    prep_notes: Optional[str] = Field(None, max_length=20000)
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    company: Optional[str] = Field(None, max_length=200)
    location: Optional[str] = Field(None, max_length=500)
    apply_url: Optional[str] = Field(None, max_length=1000)
    description: Optional[str] = Field(None, max_length=30000)


class DocumentIn(BaseModel):
    content: str = Field(max_length=30000)


class GenerateIn(BaseModel):
    replace_edited: bool = False


def _iso(dt):
    return as_utc(dt).isoformat() if dt else None


def _date(dt):
    return as_utc(dt).date().isoformat() if dt else None


def _to_dt(d: date | None):
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc) if d else None


def _own(db: Session, candidate, tracked_id: str) -> db_models.TrackedJob:
    tracked = db.query(db_models.TrackedJob).filter_by(id=tracked_id, user_id=candidate.id).first()
    if not tracked:
        raise HTTPException(status_code=404, detail="Not found in your tracker")
    return tracked


def _out(t: db_models.TrackedJob, full: bool = False) -> dict:
    posting = t.posting
    out = {
        "id": t.id,
        "origin": t.origin,
        "posting_id": t.posting_id,
        "title": t.title,
        "company": t.company or "",
        "location": t.location or "",
        "apply_url": t.apply_url or "",
        "stage": t.stage,
        "resume_id": t.resume_id,
        "applied_on": _date(t.applied_on),
        "next_follow_up": _date(t.next_follow_up),
        "created_at": _iso(t.created_at),
        "updated_at": _iso(t.updated_at),
        "posting_status": posting.status if posting else None,
        "posting_last_verified_at": _iso(posting.last_verified_at) if posting else None,
    }
    if full:
        out.update({
            "description": (t.description or (posting.description if posting else "")) or "",
            "notes": t.notes or "",
            "prep_notes": t.prep_notes or "",
            "events": [{"from": e.from_stage, "to": e.to_stage, "at": _iso(e.at)} for e in t.events],
            "documents": {
                d.kind: {"content": d.content, "generator": d.generator, "edited": bool(d.edited), "updated_at": _iso(d.updated_at)}
                for d in t.documents
            },
            "posting": posting_summary(posting) if posting else None,
        })
    return out


def _add(db: Session, tracked: db_models.TrackedJob) -> db_models.TrackedJob:
    tracked.events.append(db_models.TrackedJobEvent(from_stage="", to_stage=tracked.stage))
    db.add(tracked)
    db.commit()
    db.refresh(tracked)
    return tracked


@router.get("")
def list_tracked(candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    rows = (
        db.query(db_models.TrackedJob)
        .filter_by(user_id=candidate.id)
        .order_by(db_models.TrackedJob.updated_at.desc())
        .all()
    )
    return [_out(t) for t in rows]


@router.get("/summary")
def summary(candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    rows = db.query(db_models.TrackedJob).filter_by(user_id=candidate.id).all()
    today = datetime.now(timezone.utc).date()
    horizon = today + timedelta(days=14)
    follow_ups = sorted(
        (t for t in rows if t.next_follow_up and t.stage not in ("Rejected", "Withdrawn", "Offer")
         and as_utc(t.next_follow_up).date() <= horizon),
        key=lambda t: as_utc(t.next_follow_up),
    )
    return {
        "total": len(rows),
        "by_stage": {s: sum(1 for t in rows if t.stage == s) for s in STAGES},
        "follow_ups": [{**_out(t), "overdue": as_utc(t.next_follow_up).date() < today} for t in follow_ups],
        "expired_saved": [_out(t) for t in rows if t.posting and t.posting.status == "expired"
                          and t.stage in ("Saved", "Preparing")],
    }


@router.post("")
def track_posting(payload: TrackPostingIn, candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    posting = db.query(db_models.JobPosting).filter_by(id=payload.posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job not found")
    existing = db.query(db_models.TrackedJob).filter_by(user_id=candidate.id, posting_id=posting.id).first()
    if existing:
        return _out(existing)
    tracked = db_models.TrackedJob(
        user_id=candidate.id, posting_id=posting.id, origin="posting",
        title=posting.title, company=posting.company, location=posting.location or "",
        apply_url=posting.apply_url or posting.source_url or "", stage="Saved",
    )
    return _out(_add(db, tracked))


@router.post("/manual")
def track_manual(payload: ManualJobIn, candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    """A job the candidate found elsewhere, pasted in by hand. Private to
    them; never added to the public job index."""
    tracked = db_models.TrackedJob(user_id=candidate.id, origin="pasted", stage="Saved", **payload.model_dump())
    return _out(_add(db, tracked))


@router.post("/import")
def track_import(payload: ImportJobIn, candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    """Import one posting from a supported job-board link. The link is
    only parsed (job_sources.parse_posting_url); the data is read from that
    board's public API on a fixed host."""
    try:
        kind, board, posting_id = parse_posting_url(payload.url)
        item = fetch_single_posting(kind, board, posting_id)
    except SourceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    tracked = db_models.TrackedJob(
        user_id=candidate.id, origin="pasted", stage="Saved",
        title=item.title or "Untitled role", company=item.company, location=item.location,
        apply_url=item.apply_url or item.source_url, description=item.description[:30000],
    )
    return _out(_add(db, tracked))


@router.get("/{tracked_id}")
def get_tracked(tracked_id: str, candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    return _out(_own(db, candidate, tracked_id), full=True)


@router.patch("/{tracked_id}")
def update_tracked(tracked_id: str, payload: TrackedUpdateIn, candidate=Depends(get_current_candidate),
                   db: Session = Depends(get_db)):
    tracked = _own(db, candidate, tracked_id)
    data = payload.model_dump(exclude_unset=True)

    if "stage" in data:
        stage = data.pop("stage")
        if stage not in STAGES:
            raise HTTPException(status_code=400, detail="Unknown stage")
        if stage != tracked.stage:
            tracked.events.append(db_models.TrackedJobEvent(from_stage=tracked.stage, to_stage=stage))
            tracked.stage = stage
            if stage == "Applied" and not tracked.applied_on and "applied_on" not in data:
                tracked.applied_on = datetime.now(timezone.utc)

    if "resume_id" in data:
        resume_id = data.pop("resume_id")
        if resume_id and not db.query(db_models.Resume).filter_by(id=resume_id, candidate_id=candidate.id).first():
            raise HTTPException(status_code=404, detail="Resume not found")
        tracked.resume_id = resume_id or None

    for key in ("applied_on", "next_follow_up"):
        if key in data:
            setattr(tracked, key, _to_dt(data.pop(key)))

    # The job's own details are editable only for jobs the candidate added
    # themselves; a posting's details come from its source.
    job_fields = {k: data.pop(k) for k in ("title", "company", "location", "apply_url", "description") if k in data}
    if job_fields:
        if tracked.origin != "pasted":
            raise HTTPException(status_code=400, detail="Details of an indexed job come from its source and can't be edited")
        if "apply_url" in job_fields and job_fields["apply_url"] and not _safe_url(job_fields["apply_url"]):
            raise HTTPException(status_code=422, detail="Use a full http(s) link")
        for key, value in job_fields.items():
            setattr(tracked, key, value or "")

    for key, value in data.items():
        setattr(tracked, key, value or "")
    tracked.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(tracked)
    return _out(tracked, full=True)


@router.delete("/{tracked_id}")
def delete_tracked(tracked_id: str, candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    db.delete(_own(db, candidate, tracked_id))
    db.commit()
    return {"removed": True}


# --- Assessment, drafts, interview prep -------------------------------------

def _job_text(tracked: db_models.TrackedJob) -> tuple[str, str]:
    description = tracked.description or (tracked.posting.description if tracked.posting else "") or ""
    return tracked.title, description


def _resume_for(db: Session, candidate, tracked: db_models.TrackedJob) -> db_models.Resume:
    query = db.query(db_models.Resume).filter_by(candidate_id=candidate.id)
    resume = (query.filter_by(id=tracked.resume_id).first() if tracked.resume_id else None) or query.filter_by(is_active=True).first()
    if not resume:
        raise HTTPException(status_code=409, detail="Upload a resume first")
    return resume


def _assessment(db: Session, candidate, tracked: db_models.TrackedJob):
    title, description = _job_text(tracked)
    if not description.strip():
        raise HTTPException(status_code=409, detail="Add the job description first, so there's something to compare against")
    resume = _resume_for(db, candidate, tracked)
    cv_text, profile = load_resume_text_and_profile(resume)
    result = assess(cv_text, profile, title, description, confirmed_skills=candidate_profile_skills(db, candidate))
    return resume, cv_text, profile, result


@router.get("/{tracked_id}/assessment")
def tracked_assessment(tracked_id: str, candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    tracked = _own(db, candidate, tracked_id)
    resume, _, _, result = _assessment(db, candidate, tracked)
    return {"resume": {"id": resume.id, "filename": resume.filename, "version": resume.version}, **result}


def _profile_dict(db: Session, candidate) -> dict:
    p = db.query(db_models.CandidateProfile).filter_by(user_id=candidate.id).first()
    if not p:
        return {}
    return {k: getattr(p, k) or [] for k in ("skills", "education", "experience", "projects", "certifications")} | {"summary": p.summary or ""}


@router.post("/{tracked_id}/documents/{kind}/generate")
def generate_document(tracked_id: str, kind: DocKind, payload: GenerateIn | None = None,
                      candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    tracked = _own(db, candidate, tracked_id)
    existing = next((d for d in tracked.documents if d.kind == kind), None)
    if existing and existing.edited and not (payload and payload.replace_edited):
        raise HTTPException(status_code=409, detail="You've edited this draft. Confirm to replace it with a fresh one.")
    _, cv_text, profile, result = _assessment(db, candidate, tracked)
    content = drafts.generate(
        kind, candidate, _profile_dict(db, candidate), set(profile["cv_skills"]),
        profile.get("cv_section_text") or {}, {"title": tracked.title, "company": tracked.company}, result,
    )
    if existing:
        existing.content, existing.generator, existing.edited = content, drafts.GENERATOR, False
    else:
        tracked.documents.append(db_models.ApplicationDocument(kind=kind, content=content, generator=drafts.GENERATOR))
    if tracked.stage == "Saved":
        tracked.events.append(db_models.TrackedJobEvent(from_stage="Saved", to_stage="Preparing"))
        tracked.stage = "Preparing"
    db.commit()
    db.refresh(tracked)
    return _out(tracked, full=True)


@router.put("/{tracked_id}/documents/{kind}")
def save_document(tracked_id: str, kind: DocKind, payload: DocumentIn,
                  candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    tracked = _own(db, candidate, tracked_id)
    existing = next((d for d in tracked.documents if d.kind == kind), None)
    if existing:
        existing.content, existing.edited = payload.content, True
    else:
        tracked.documents.append(db_models.ApplicationDocument(kind=kind, content=payload.content, generator="", edited=True))
    db.commit()
    db.refresh(tracked)
    return _out(tracked, full=True)


@router.get("/{tracked_id}/prep")
def interview_prep(tracked_id: str, candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    """Practice prompts tied to this job's actual requirements and the
    candidate's own resume lines. Built by rules; nothing is predicted
    about the real interview."""
    tracked = _own(db, candidate, tracked_id)
    _, _, _, result = _assessment(db, candidate, tracked)
    evidence = result.get("evidence_lines") or {}
    importance = result.get("skill_importance") or {}
    rank = {"Critical": 0, "High": 1, "Medium": 2}

    def by_importance(skills):
        return sorted(skills, key=lambda s: rank.get((importance.get(s) or {}).get("level"), 3))

    walk_through = [
        {"skill": s, "prompt": f"Walk through a time you used {s}: what the problem was, what you did, and what happened.",
         "from_resume": evidence[s]["line"], "section": evidence[s]["section"]}
        # Only skills the resume shows in use: a bare Skills-list entry
        # gives nothing concrete to rehearse.
        for s in by_importance([s for s in result.get("matched_skills") or [] if s in evidence])[:5]
    ]
    gaps = [
        {"skill": s, "prompt": f"They may ask about {s}. Prepare an honest answer: what you know about it today, "
                               "and how you'd get up to speed."}
        for s in by_importance(result.get("missing_skills") or [])[:4]
    ]
    checks = [r for r in result.get("requirements") or [] if r["status"] == "check"][:4]
    company = tracked.company or "the company"
    return {
        "walk_through": walk_through,
        "gaps": gaps,
        "requirements_to_check": [{"text": r["text"], "note": r["note"]} for r in checks],
        "general": [
            f"Why this role, and why {company}? Be specific about what you read in the posting.",
            "Which project are you proudest of, and what would you do differently now?",
            "Tell me about a time something you built didn't work. How did you find and fix the problem?",
        ],
        "questions_to_ask": [
            "What would a successful first three months in this role look like?",
            "How does the team review and ship work?",
            "What's the biggest challenge the team is working on right now?",
        ],
        "note": "Practice prompts based on this posting and your resume. They are not the employer's actual questions.",
    }
