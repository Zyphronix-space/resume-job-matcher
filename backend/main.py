"""
Resume Match API.

Four things live here:
  - /auth/*: sign-up/sign-in (routes_auth.py). Every other route below
    requires a valid session (see auth.get_current_user).
  - /analyze: the original resume <-> single job description analyzer
    (semantic similarity + explainable skill matching).
  - /jobs*: browsing and matching internship postings from a JobProvider
    (see job_sources/), using the exact same analysis pipeline per posting.
  - /saved-jobs, /applications, /preferences, /history (routes_user_data.py):
    CRUD against the SQLite database (database.py), scoped per signed-in
    user — this is what the frontend used to keep in localStorage.
  - /admin/*: admin-only oversight (routes_admin.py) — user management and
    system-wide stats, gated by auth.get_current_admin.

The ML/NLP core (model loading, PDF extraction, semantic similarity, skill
taxonomy matching) lives in resume_analyzer.py and job_matcher.py so both
call sites share it rather than duplicating logic.

Run with:
    uvicorn main:app --reload
"""

from dataclasses import asdict

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import db_models
from auth import get_current_user
from database import Base, engine
from job_matcher import match_jobs, match_single
from job_models import JobDetailResponse, JobMatchResponse, JobSearchResponse
from job_sources.base import JobSearchFilters
from job_sources.provider import get_active_provider
from resume_analyzer import extract_resume_profile, extract_text_from_pdf
from routes_admin import router as admin_router
from routes_auth import router as auth_router
from routes_user_data import router as user_data_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Resume Match API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(user_data_router)


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


def _read_cv_text(cv_file: UploadFile, cv_bytes: bytes) -> str:
    if not cv_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="CV must be a PDF file")
    cv_text = extract_text_from_pdf(cv_bytes)
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the PDF")
    return cv_text


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=MatchResponse)
async def analyze(
    cv_file: UploadFile = File(...),
    job_description: str = Form(...),
    _user: db_models.User = Depends(get_current_user),
):
    cv_text = _read_cv_text(cv_file, await cv_file.read())
    profile = extract_resume_profile(cv_text)
    result = match_single(cv_text, profile, job_description)

    return MatchResponse(
        resume_sections=profile["resume_sections"],
        resume_structure_score=profile["resume_structure_score"],
        **result,
    )


@app.get("/jobs", response_model=JobSearchResponse)
def list_jobs(
    role: str | None = None,
    location: str | None = None,
    work_mode: str | None = None,
    skills: str | None = None,
    company: str | None = None,
    keyword: str | None = None,
    _user: db_models.User = Depends(get_current_user),
):
    """Browse/search internship postings. Does not require a CV — match
    scores are only computed once a resume is uploaded, via /jobs/match."""
    provider = get_active_provider()
    filters = JobSearchFilters(
        role=role,
        location=location,
        work_mode=work_mode,
        skills=[s for s in skills.split(",")] if skills else [],
        company=company,
        keyword=keyword,
    )
    jobs = provider.search(filters)
    # Computed per-response rather than read off the provider: a query can
    # fall back to demo data (see LiveWithDemoFallbackProvider) even when
    # the configured provider is a live one.
    is_demo = all(j.is_demo for j in jobs) if jobs else False
    return JobSearchResponse(
        provider=provider.id,
        is_demo=is_demo,
        count=len(jobs),
        jobs=[asdict(j) for j in jobs],
    )


@app.get("/jobs/{job_id}", response_model=JobDetailResponse)
def get_job(job_id: str, _user: db_models.User = Depends(get_current_user)):
    provider = get_active_provider()
    job = provider.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobDetailResponse(provider=provider.id, is_demo=provider.is_demo, job=asdict(job))


@app.post("/jobs/match", response_model=JobMatchResponse)
async def match_against_jobs(
    cv_file: UploadFile = File(...),
    job_ids: str = Form(...),
    _user: db_models.User = Depends(get_current_user),
):
    """Matches one uploaded resume against many internship postings in a
    single request — the CV is parsed once and reused for every posting,
    rather than being re-uploaded/re-parsed per job."""
    cv_text = _read_cv_text(cv_file, await cv_file.read())

    provider = get_active_provider()
    ids = [i.strip() for i in job_ids.split(",") if i.strip()]
    jobs = [job for job in (provider.get(i) for i in ids) if job is not None]

    profile = extract_resume_profile(cv_text)
    results = match_jobs(cv_text, profile, jobs)

    return JobMatchResponse(
        resume_structure_score=profile["resume_structure_score"],
        resume_sections=profile["resume_sections"],
        results=results,
    )
