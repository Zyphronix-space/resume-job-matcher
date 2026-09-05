"""
Candidate resume upload/management. Unlike the original /analyze flow,
resume files are now actually persisted (recruiters need to review them
later) — but only the parsed, computed profile is stored in the database;
raw file bytes live on disk under RESUME_STORAGE_DIR, never under a
statically-served path, and are only ever returned through the
ownership-checked /resumes/{id}/file route below.

RESUME_STORAGE_DIR is env-overridable for the same reason DATABASE_URL is
(see database.py): Azure App Service extracts the app fresh into an
ephemeral location on every restart, so production must point this at
persistent storage (e.g. a path under /home).
"""

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

import db_models
from auth import get_current_candidate, get_current_user
from database import get_db
from resume_analyzer import extract_resume_profile, extract_text_from_pdf
from resumes_schemas import ResumeOut

router = APIRouter(prefix="/resumes", tags=["resumes"])

RESUME_STORAGE_DIR = os.environ.get("RESUME_STORAGE_DIR", "./resume_storage")


def _storage_path(candidate_id: int, resume_id: str) -> str:
    directory = os.path.join(RESUME_STORAGE_DIR, str(candidate_id))
    os.makedirs(directory, exist_ok=True)
    return os.path.join(directory, f"{resume_id}.pdf")


def load_resume_text_and_profile(resume: db_models.Resume) -> tuple[str, dict]:
    """
    Re-extracts the full profile (including cv_section_text, needed for
    skill-evidence snippets) from the stored PDF on demand, rather than
    persisting raw resume text in the database — used by applications_routes
    at apply-time and whenever an application's evidence needs recomputing.
    """
    if not os.path.exists(resume.storage_path):
        raise HTTPException(status_code=404, detail="Resume file is no longer available")
    with open(resume.storage_path, "rb") as f:
        cv_text = extract_text_from_pdf(f.read())
    return cv_text, extract_resume_profile(cv_text)


def resume_out(resume: db_models.Resume) -> ResumeOut:
    return ResumeOut(
        id=resume.id,
        filename=resume.filename,
        version=resume.version,
        is_active=resume.is_active,
        cv_skills=sorted(resume.cv_skills or []),
        resume_sections=resume.resume_sections or {},
        resume_structure_score=resume.resume_structure_score or 0.0,
        uploaded_at=resume.uploaded_at,
    )


@router.post("", response_model=ResumeOut)
async def upload_resume(
    file: UploadFile = File(...),
    candidate: db_models.User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Resume must be a PDF file")

    file_bytes = await file.read()
    cv_text = extract_text_from_pdf(file_bytes)
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the PDF")
    profile = extract_resume_profile(cv_text)

    previous_count = db.query(db_models.Resume).filter_by(candidate_id=candidate.id).count()
    db.query(db_models.Resume).filter_by(candidate_id=candidate.id, is_active=True).update({"is_active": False})

    resume = db_models.Resume(
        id=str(uuid.uuid4()),
        candidate_id=candidate.id,
        filename=file.filename,
        storage_path="",
        version=previous_count + 1,
        is_active=True,
        cv_skills=sorted(profile["cv_skills"]),
        resume_sections=profile["resume_sections"],
        resume_structure_score=profile["resume_structure_score"],
    )
    resume.storage_path = _storage_path(candidate.id, resume.id)
    with open(resume.storage_path, "wb") as f:
        f.write(file_bytes)

    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume_out(resume)


@router.get("", response_model=list[ResumeOut])
def list_resumes(
    candidate: db_models.User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    resumes = (
        db.query(db_models.Resume)
        .filter_by(candidate_id=candidate.id)
        .order_by(db_models.Resume.uploaded_at.desc())
        .all()
    )
    return [resume_out(r) for r in resumes]


def _get_own_resume(resume_id: str, candidate: db_models.User, db: Session) -> db_models.Resume:
    resume = db.query(db_models.Resume).filter_by(id=resume_id, candidate_id=candidate.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


def _can_view_resume(resume: db_models.Resume, user: db_models.User, db: Session) -> bool:
    if resume.candidate_id == user.id:
        return True
    if user.role != "recruiter":
        return False
    return (
        db.query(db_models.Application)
        .join(db_models.Job, db_models.Application.job_id == db_models.Job.id)
        .filter(
            db_models.Job.recruiter_id == user.id,
            db_models.Application.candidate_id == resume.candidate_id,
            db_models.Application.resume_id == resume.id,
        )
        .first()
        is not None
    )


@router.get("/{resume_id}/sections")
def get_resume_sections(
    resume_id: str,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    The actual extracted text of each detected resume section (Education,
    Work Experience, etc.) — recomputed on demand from the stored PDF, same
    as skill_evidence, rather than persisted. Anyone who can already view
    this resume (via /file) can read the same PDF in full, so this exposes
    nothing beyond what that endpoint already allows.
    """
    resume = db.query(db_models.Resume).filter_by(id=resume_id).first()
    if not resume or not _can_view_resume(resume, user, db):
        raise HTTPException(status_code=404, detail="Resume not found")
    _, profile = load_resume_text_and_profile(resume)
    return {name: text.strip() for name, text in profile["cv_section_text"].items() if text.strip()}


@router.get("/{resume_id}/file")
def download_resume_file(
    resume_id: str,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = db.query(db_models.Resume).filter_by(id=resume_id).first()
    if not resume or not _can_view_resume(resume, user, db):
        raise HTTPException(status_code=404, detail="Resume not found")
    if not os.path.exists(resume.storage_path):
        raise HTTPException(status_code=404, detail="Resume file is no longer available")
    with open(resume.storage_path, "rb") as f:
        content = f.read()
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{resume.filename}"'},
    )


@router.delete("/{resume_id}")
def delete_resume(
    resume_id: str,
    candidate: db_models.User = Depends(get_current_candidate),
    db: Session = Depends(get_db),
):
    resume = _get_own_resume(resume_id, candidate, db)
    was_active = resume.is_active

    if os.path.exists(resume.storage_path):
        os.remove(resume.storage_path)
    db.delete(resume)
    db.commit()

    if was_active:
        newest = (
            db.query(db_models.Resume)
            .filter_by(candidate_id=candidate.id)
            .order_by(db_models.Resume.uploaded_at.desc())
            .first()
        )
        if newest:
            newest.is_active = True
            db.commit()

    return {"removed": True}
