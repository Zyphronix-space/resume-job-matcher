"""
Candidate resume upload/management. Unlike the original /analyze flow,
resume files are now actually persisted (recruiters need to review them
later). The raw PDF bytes live in the resumes.file_data column (serverless
hosting has no persistent disk), never under a statically-served path, and
are only ever returned through the ownership-checked /resumes/{id}/file
route below. The parsed profile is cached alongside; raw resume text is not.
"""

import re
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

# Vercel rejects request bodies over 4.5 MB before they reach the app, so
# cap below that and fail with a readable message instead.
MAX_RESUME_BYTES = 4 * 1024 * 1024


def safe_filename(name: str) -> str:
    """The uploaded name is echoed back in a Content-Disposition header, so
    keep it to a plain, printable name: no quotes, slashes or control
    characters that could break out of the header value."""
    base = (name or "resume.pdf").replace("\\", "/").rsplit("/", 1)[-1]
    cleaned = re.sub(r"[^A-Za-z0-9 ._()-]", "_", base).strip(" .") or "resume"
    if not cleaned.lower().endswith(".pdf"):
        cleaned += ".pdf"
    return cleaned[-120:]


def _file_bytes(resume: db_models.Resume) -> bytes:
    if not resume.file_data:
        raise HTTPException(status_code=404, detail="Resume file is no longer available")
    return resume.file_data


def load_resume_text_and_profile(resume: db_models.Resume) -> tuple[str, dict]:
    """
    Re-extracts the full profile (including cv_section_text, needed for
    skill-evidence snippets) from the stored PDF on demand, rather than
    persisting raw resume text in the database — used by applications_routes
    at apply-time and whenever an application's evidence needs recomputing.
    """
    cv_text = extract_text_from_pdf(_file_bytes(resume))
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
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Resume must be a PDF file")

    file_bytes = await file.read(MAX_RESUME_BYTES + 1)
    if len(file_bytes) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail="Resume must be 4 MB or smaller")
    # The extension is only a claim; a real PDF starts with this signature
    # (allowed a little leading junk, as PDF readers do).
    if b"%PDF-" not in file_bytes[:1024]:
        raise HTTPException(status_code=400, detail="That file isn't a valid PDF")
    cv_text = extract_text_from_pdf(file_bytes)
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the PDF")
    profile = extract_resume_profile(cv_text)

    previous_count = db.query(db_models.Resume).filter_by(candidate_id=candidate.id).count()
    db.query(db_models.Resume).filter_by(candidate_id=candidate.id, is_active=True).update({"is_active": False})

    resume = db_models.Resume(
        id=str(uuid.uuid4()),
        candidate_id=candidate.id,
        filename=safe_filename(file.filename),
        file_data=file_bytes,
        version=previous_count + 1,
        is_active=True,
        cv_skills=sorted(profile["cv_skills"]),
        resume_sections=profile["resume_sections"],
        resume_structure_score=profile["resume_structure_score"],
    )
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
    return Response(
        content=_file_bytes(resume),
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

    # An application to a recruiter's job keeps a reference to the exact
    # resume that was sent; deleting it would break that record (and the
    # foreign key on TiDB). The candidate can withdraw by deleting their
    # account, which removes both.
    in_use = db.query(db_models.Application).filter_by(resume_id=resume.id).count()
    if in_use:
        raise HTTPException(
            status_code=409,
            detail=f"This resume was sent with {in_use} application{'s' if in_use != 1 else ''} "
                   "on ResumeMatch, so it can't be deleted on its own.",
        )
    db.query(db_models.TrackedJob).filter_by(resume_id=resume.id).update({"resume_id": None})
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
