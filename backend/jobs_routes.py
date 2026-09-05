"""
Recruiter job-posting CRUD. A job is only ever visible in full to the
recruiter who owns it; candidates can only read a job that is currently
"Open" (e.g. when following a link from their matches list).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import db_models
from auth import get_current_recruiter, get_current_user
from database import get_db
from jobs_schemas import JobCreateIn, JobOut, JobUpdateIn

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _job_out(job: db_models.Job, db: Session) -> JobOut:
    applicants_count = db.query(db_models.Application).filter_by(job_id=job.id).count()
    shortlisted_count = (
        db.query(db_models.Application).filter_by(job_id=job.id, status="Shortlisted").count()
    )
    return JobOut(
        id=job.id,
        recruiter_id=job.recruiter_id,
        title=job.title,
        description=job.description or "",
        required_skills=job.required_skills or [],
        preferred_skills=job.preferred_skills or [],
        experience=job.experience or "",
        education=job.education or "",
        location=job.location or "",
        employment_type=job.employment_type,
        status=job.status,
        created_at=job.created_at,
        updated_at=job.updated_at,
        applicants_count=applicants_count,
        shortlisted_count=shortlisted_count,
    )


def _get_owned_job(job_id: str, recruiter: db_models.User, db: Session) -> db_models.Job:
    job = db.query(db_models.Job).filter_by(id=job_id, recruiter_id=recruiter.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("", response_model=JobOut)
def create_job(
    payload: JobCreateIn,
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = db_models.Job(recruiter_id=recruiter.id, **payload.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_out(job, db)


@router.get("", response_model=list[JobOut])
def list_my_jobs(
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    jobs = (
        db.query(db_models.Job)
        .filter_by(recruiter_id=recruiter.id)
        .order_by(db_models.Job.created_at.desc())
        .all()
    )
    return [_job_out(j, db) for j in jobs]


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: str,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(db_models.Job).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    is_owner = user.role == "recruiter" and job.recruiter_id == user.id
    if not is_owner and job.status != "Open":
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_out(job, db)


@router.patch("/{job_id}", response_model=JobOut)
def update_job(
    job_id: str,
    payload: JobUpdateIn,
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = _get_owned_job(job_id, recruiter, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    return _job_out(job, db)


@router.delete("/{job_id}")
def delete_job(
    job_id: str,
    recruiter: db_models.User = Depends(get_current_recruiter),
    db: Session = Depends(get_db),
):
    job = _get_owned_job(job_id, recruiter, db)
    db.delete(job)
    db.commit()
    return {"removed": True}
