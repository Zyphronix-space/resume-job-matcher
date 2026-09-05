"""
The recruiting pipeline core: a candidate applying to a job, a recruiter
ranking/filtering/sorting candidates for a job, moving pipeline status,
leaving notes, shortlisting, and comparing candidates side-by-side.

Every query is scoped: a candidate only ever sees their own applications; a
recruiter only ever sees applications against jobs they own.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import db_models
from applications_schemas import (
    APPLICATION_STATUSES, ApplicationOut, ApplicationStatusIn, ApplyIn, CandidateBrief,
    CandidateDetailOut, CandidateSummaryOut, JobBrief, JobMatchOut, NoteIn, NoteOut,
)
from auth import get_current_candidate, get_current_recruiter, get_current_user
from database import get_db
from job_matcher import match_jobs, match_single
from resumes_routes import load_resume_text_and_profile, resume_out
from skill_analysis import extract_evidence

router = APIRouter(tags=["applications"])

STATUS_EVENT_LABELS = {
    "Applied": "Applied",
    "Screening": "Moved to screening",
    "Interview": "Interview scheduled",
    "Offer": "Offer extended",
    "Shortlisted": "Shortlisted",
    "Rejected": "Rejected",
}


def _job_brief(job: db_models.Job) -> JobBrief:
    return JobBrief(
        id=job.id, title=job.title, location=job.location or "",
        employment_type=job.employment_type, experience=job.experience or "",
        education=job.education or "", status=job.status,
    )


def _candidate_brief(user: db_models.User) -> CandidateBrief:
    return CandidateBrief(
        id=user.id, full_name=user.full_name or user.email, email=user.email,
        headline=user.headline or "", location=user.location or "", phone=user.phone or "",
    )


def _application_out(app: db_models.Application, db: Session, include_evidence: bool = False) -> ApplicationOut:
    job = db.query(db_models.Job).filter_by(id=app.job_id).first()
    candidate = db.query(db_models.User).filter_by(id=app.candidate_id).first()
    resume = db.query(db_models.Resume).filter_by(id=app.resume_id).first()

    evidence = {}
    if include_evidence and resume:
        try:
            cv_text, profile = load_resume_text_and_profile(resume)
            evidence = {
                skill: extract_evidence(cv_text, profile["cv_section_text"], skill)
                for skill in (app.matched_skills or [])
            }
        except HTTPException:
            evidence = {}

    return ApplicationOut(
        id=app.id,
        job=_job_brief(job),
        candidate=_candidate_brief(candidate),
        resume_id=app.resume_id,
        resume_filename=resume.filename if resume else "",
        match_score=app.match_score,
        skill_coverage=app.skill_coverage,
        matched_skills=app.matched_skills or [],
        missing_skills=app.missing_skills or [],
        skill_categories=app.skill_categories or {},
        skill_importance=app.skill_importance or {},
        skill_evidence=evidence,
        skill_gap_roadmap=app.skill_gap_roadmap or [],
        status=app.status,
        created_at=app.created_at,
        events=[{"date": e.date, "label": e.label} for e in app.events],
        notes=[
            {
                "id": n.id, "author_id": n.author_id,
                "author_name": (db.query(db_models.User).filter_by(id=n.author_id).first() or db_models.User()).full_name or "Recruiter",
                "body": n.body, "created_at": n.created_at,
            }
            for n in app.notes
        ],
    )


# --- Candidate: browse/apply --------------------------------------------

@router.get("/candidate/matches", response_model=list[JobMatchOut])
def candidate_matches(
    candidate: db_models.User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    resume = db.query(db_models.Resume).filter_by(candidate_id=candidate.id, is_active=True).first()
    if not resume:
        return []

    open_jobs = db.query(db_models.Job).filter_by(status="Open").all()
    if not open_jobs:
        return []

    cv_text, profile = load_resume_text_and_profile(resume)
    results = match_jobs(cv_text, profile, open_jobs)

    existing = {
        a.job_id: a
        for a in db.query(db_models.Application).filter_by(candidate_id=candidate.id).all()
    }

    out = []
    for job in open_jobs:
        result = results.get(job.id)
        if not result:
            continue
        application = existing.get(job.id)
        out.append(JobMatchOut(
            job=_job_brief(job),
            match_score=result["match_score"],
            skill_coverage=result["skill_coverage"],
            matched_skills=result["matched_skills"],
            missing_skills=result["missing_skills"],
            skill_categories=result["skill_categories"],
            skill_importance=result["skill_importance"],
            skill_gap_roadmap=result["skill_gap_roadmap"],
            already_applied=application is not None,
            application_status=application.status if application else None,
        ))
    out.sort(key=lambda m: m.match_score, reverse=True)
    return out


@router.post("/jobs/{job_id}/apply", response_model=ApplicationOut)
def apply_to_job(
    job_id: str,
    payload: ApplyIn,
    candidate: db_models.User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    job = db.query(db_models.Job).filter_by(id=job_id, status="Open").first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer open")

    if payload.resume_id:
        resume = db.query(db_models.Resume).filter_by(id=payload.resume_id, candidate_id=candidate.id).first()
    else:
        resume = db.query(db_models.Resume).filter_by(candidate_id=candidate.id, is_active=True).first()
    if not resume:
        raise HTTPException(status_code=400, detail="Upload a resume before applying")

    cv_text, profile = load_resume_text_and_profile(resume)
    result = match_single(cv_text, profile, job.description, job.required_skills, job.preferred_skills)

    existing = db.query(db_models.Application).filter_by(job_id=job.id, candidate_id=candidate.id).first()
    if existing:
        existing.resume_id = resume.id
        for key in ("match_score", "skill_coverage", "matched_skills", "missing_skills",
                    "skill_categories", "skill_importance", "skill_gap_roadmap"):
            setattr(existing, key, result[key])
        db.commit()
        db.refresh(existing)
        return _application_out(existing, db, include_evidence=True)

    application = db_models.Application(
        job_id=job.id, candidate_id=candidate.id, resume_id=resume.id,
        match_score=result["match_score"], skill_coverage=result["skill_coverage"],
        matched_skills=result["matched_skills"], missing_skills=result["missing_skills"],
        skill_categories=result["skill_categories"], skill_importance=result["skill_importance"],
        skill_gap_roadmap=result["skill_gap_roadmap"], status="Applied",
    )
    application.events.append(db_models.ApplicationEvent(label=STATUS_EVENT_LABELS["Applied"]))
    db.add(application)
    db.commit()
    db.refresh(application)
    return _application_out(application, db, include_evidence=True)


@router.get("/candidate/applications", response_model=list[ApplicationOut])
def list_my_applications(
    candidate: db_models.User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(db_models.Application)
        .filter_by(candidate_id=candidate.id)
        .order_by(db_models.Application.created_at.desc())
        .all()
    )
    return [_application_out(a, db) for a in apps]


# --- Shared: single application detail -----------------------------------

def _get_visible_application(application_id: str, user: db_models.User, db: Session) -> db_models.Application:
    app = db.query(db_models.Application).filter_by(id=application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if user.role == "candidate" and app.candidate_id == user.id:
        return app
    if user.role == "recruiter":
        job = db.query(db_models.Job).filter_by(id=app.job_id, recruiter_id=user.id).first()
        if job:
            return app
    raise HTTPException(status_code=404, detail="Application not found")


@router.get("/applications/compare", response_model=list[ApplicationOut])
def compare_applications(
    ids: str = Query(..., description="Comma-separated application ids"),
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    # Registered before /applications/{application_id} — a path-param route
    # declared first would otherwise swallow "compare" as an application id.
    application_ids = [i.strip() for i in ids.split(",") if i.strip()]
    apps = []
    for application_id in application_ids:
        try:
            apps.append(_get_visible_application(application_id, recruiter, db))
        except HTTPException:
            continue
    return [_application_out(a, db) for a in apps]


@router.get("/applications/{application_id}", response_model=ApplicationOut)
def get_application(
    application_id: str,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _get_visible_application(application_id, user, db)
    return _application_out(app, db, include_evidence=True)


# --- Recruiter: rank/filter/sort candidates for a job --------------------

@router.get("/jobs/{job_id}/candidates", response_model=list[ApplicationOut])
def rank_candidates_for_job(
    job_id: str,
    min_score: float | None = None,
    skill: str | None = None,
    status: str | None = None,
    sort: str = Query("best_match", pattern="^(best_match|newest|experience)$"),
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db.query(db_models.Job).filter_by(id=job_id, recruiter_id=recruiter.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    apps = db.query(db_models.Application).filter_by(job_id=job_id).all()

    if min_score is not None:
        apps = [a for a in apps if a.match_score >= min_score]
    if skill:
        skill_lower = skill.strip().lower()
        apps = [a for a in apps if skill_lower in (a.matched_skills or [])]
    if status:
        apps = [a for a in apps if a.status == status]

    if sort == "newest":
        apps.sort(key=lambda a: a.created_at, reverse=True)
    elif sort == "experience":
        apps.sort(key=lambda a: len(a.matched_skills or []), reverse=True)
    else:
        apps.sort(key=lambda a: a.match_score, reverse=True)

    return [_application_out(a, db) for a in apps]


@router.patch("/applications/{application_id}/status", response_model=ApplicationOut)
def change_application_status(
    application_id: str,
    payload: ApplicationStatusIn,
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    app = _get_visible_application(application_id, recruiter, db)
    if payload.status not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    app.status = payload.status
    app.events.append(db_models.ApplicationEvent(label=STATUS_EVENT_LABELS.get(payload.status, payload.status)))
    db.commit()
    db.refresh(app)
    return _application_out(app, db)


@router.post("/applications/{application_id}/notes", response_model=NoteOut)
def add_note(
    application_id: str,
    payload: NoteIn,
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    app = _get_visible_application(application_id, recruiter, db)
    note = db_models.Note(application_id=app.id, author_id=recruiter.id, body=payload.body)
    db.add(note)
    db.commit()
    db.refresh(note)
    return NoteOut(
        id=note.id, author_id=note.author_id, author_name=recruiter.full_name or recruiter.email,
        body=note.body, created_at=note.created_at,
    )


# --- Recruiter: shortlist, candidates directory --------------------------

@router.get("/shortlist", response_model=list[ApplicationOut])
def get_shortlist(
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(db_models.Application)
        .join(db_models.Job, db_models.Application.job_id == db_models.Job.id)
        .filter(db_models.Job.recruiter_id == recruiter.id, db_models.Application.status == "Shortlisted")
        .order_by(db_models.Application.match_score.desc())
        .all()
    )
    return [_application_out(a, db) for a in apps]


@router.get("/candidates", response_model=list[CandidateSummaryOut])
def list_candidates(
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(db_models.Application)
        .join(db_models.Job, db_models.Application.job_id == db_models.Job.id)
        .filter(db_models.Job.recruiter_id == recruiter.id)
        .order_by(db_models.Application.created_at.desc())
        .all()
    )
    by_candidate: dict[int, list[db_models.Application]] = {}
    for a in apps:
        by_candidate.setdefault(a.candidate_id, []).append(a)

    out = []
    for candidate_id, candidate_apps in by_candidate.items():
        user = db.query(db_models.User).filter_by(id=candidate_id).first()
        if not user:
            continue
        out.append(CandidateSummaryOut(
            id=user.id, full_name=user.full_name or user.email, email=user.email,
            headline=user.headline or "", location=user.location or "",
            applications_count=len(candidate_apps),
            best_match_score=max(a.match_score for a in candidate_apps),
            latest_status=candidate_apps[0].status,
        ))
    out.sort(key=lambda c: c.best_match_score, reverse=True)
    return out


@router.get("/candidates/{candidate_id}", response_model=CandidateDetailOut)
def get_candidate_detail(
    candidate_id: int,
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    apps = (
        db.query(db_models.Application)
        .join(db_models.Job, db_models.Application.job_id == db_models.Job.id)
        .filter(db_models.Job.recruiter_id == recruiter.id, db_models.Application.candidate_id == candidate_id)
        .order_by(db_models.Application.created_at.desc())
        .all()
    )
    if not apps:
        raise HTTPException(status_code=404, detail="Candidate not found")

    user = db.query(db_models.User).filter_by(id=candidate_id).first()
    resume_ids = {a.resume_id for a in apps}
    resumes = db.query(db_models.Resume).filter(db_models.Resume.id.in_(resume_ids)).all()

    return CandidateDetailOut(
        candidate=_candidate_brief(user),
        resumes=[resume_out(r).model_dump() for r in resumes],
        applications=[_application_out(a, db, include_evidence=True) for a in apps],
    )
