"""
RecruitAI API.

Five things live here:
  - /auth/*: sign-up/sign-in/profile/password-reset (routes_auth.py). Every
    other route below requires a valid session (see auth.get_current_user).
  - /jobs*: recruiter-owned job posting CRUD (jobs_routes.py).
  - /resumes*: candidate resume upload/management (resumes_routes.py).
  - /candidate/*, /applications/*, /shortlist, /candidates*: the
    resume -> job -> AI match -> ranking -> shortlist -> decision pipeline
    (applications_routes.py).
  - /analytics/*, /reports/*: recruiter-facing aggregates and CSV exports,
    computed from real database rows only (analytics_routes.py).
  - /admin/*: platform-oversight routes (routes_admin.py) — user
    management and system-wide stats, gated by auth.get_current_admin.

The ML/NLP core (model loading, PDF extraction, semantic similarity, skill
taxonomy matching) lives in resume_analyzer.py and job_matcher.py, and is
unchanged from the original resume/job matcher — every route above shares
the same explainable pipeline rather than duplicating logic.

The job-seeker workspace works with no recruiter on the platform:
  - /postings*: a public index of real vacancies imported from registered
    employer job boards or curated by an admin (postings_routes.py,
    job_sources.py, job_ingest.py), with a per-candidate assessment.
  - /profile*: details extracted from the resume, reviewed by the
    candidate (profile_routes.py).
  - /tracker*: a private tracker with stages, follow-ups, drafts and
    interview prep for each saved job (tracker_routes.py).
  - /admin/sources*, /admin/postings*: the source registry and manual
    curation (admin_sources_routes.py).

Run with:
    uvicorn main:app --reload
"""

import os

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db_models
from admin_sources_routes import cron_router, router as admin_sources_router
from analytics_routes import router as analytics_router
from applications_routes import router as applications_router
from auth import get_current_user
from database import Base, add_missing_columns, engine
from job_matcher import match_single
from jobs_routes import router as jobs_router
from postings_routes import router as postings_router
from profile_routes import router as profile_router
from resume_analyzer import extract_resume_profile, extract_text_from_pdf
from resumes_routes import MAX_RESUME_BYTES, router as resumes_router
from routes_admin import router as admin_router
from routes_auth import router as auth_router
from tracker_routes import router as tracker_router

Base.metadata.create_all(bind=engine)
add_missing_columns()

app = FastAPI(title="RecruitAI API")

# Local dev origin is always allowed; production frontend origin(s) come
# from ALLOWED_ORIGINS (comma-separated) so the deployed Static Web App URL
# doesn't need to be hardcoded here.
_extra_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", *_extra_origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(jobs_router)
app.include_router(resumes_router)
app.include_router(applications_router)
app.include_router(analytics_router)
app.include_router(admin_sources_router)
app.include_router(cron_router)
app.include_router(postings_router)
app.include_router(profile_router)
app.include_router(tracker_router)


class MatchResponse(BaseModel):
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]
    skill_coverage: float
    skill_categories: dict[str, dict[str, list[str]]]
    skill_importance: dict[str, dict]
    resume_sections: dict[str, bool]
    resume_structure_score: float
    skill_evidence: dict[str, dict]
    skill_gap_roadmap: list[dict]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=MatchResponse)
async def analyze(
    cv_file: UploadFile = File(...),
    job_description: str = Form(...),
    _user: db_models.User = Depends(get_current_user),
):
    """Ad-hoc single resume vs. single job-description analyzer — the
    original standalone endpoint, kept as a general utility. Not linked
    from the recruiter/candidate navigation, which goes through the
    jobs/applications pipeline instead."""
    if not (cv_file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="CV must be a PDF file")
    file_bytes = await cv_file.read(MAX_RESUME_BYTES + 1)
    if len(file_bytes) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail="CV must be 4 MB or smaller")
    if b"%PDF-" not in file_bytes[:1024]:
        raise HTTPException(status_code=400, detail="That file isn't a valid PDF")
    if len(job_description) > 30000:
        raise HTTPException(status_code=413, detail="Job description is too long")
    cv_text = extract_text_from_pdf(file_bytes)
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the PDF")

    profile = extract_resume_profile(cv_text)
    result = match_single(cv_text, profile, job_description)

    return MatchResponse(
        resume_sections=profile["resume_sections"],
        resume_structure_score=profile["resume_structure_score"],
        **result,
    )
