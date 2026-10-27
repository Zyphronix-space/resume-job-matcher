"""
Candidate profile: details extracted from the active resume, reviewed and
corrected by the candidate.

GET /profile/suggestions only proposes; it never writes. PUT /profile
stores exactly what the candidate submitted. Raw resume text is still
never stored: the suggestions are recomputed from the PDF on request.
"""

import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

import db_models
from auth import get_current_candidate
from database import as_utc, get_db
from job_sources import _SRI_LANKA_RE
from resumes_routes import load_resume_text_and_profile

router = APIRouter(prefix="/profile", tags=["profile"])

LIST_FIELDS = ("skills", "education", "experience", "projects", "certifications", "target_roles", "preferred_locations", "work_modes")
WORK_MODES = {"Remote", "Hybrid", "On-site"}
MAX_ITEMS = 40


def _clean_list(values: list[str], max_len: int = 300) -> list[str]:
    out, seen = [], set()
    for v in values or []:
        v = re.sub(r"\s+", " ", str(v)).strip()[:max_len]
        if v and v.lower() not in seen:
            seen.add(v.lower())
            out.append(v)
    return out[:MAX_ITEMS]


class ProfileIn(BaseModel):
    summary: str = Field("", max_length=2000)
    skills: list[str] = Field(default_factory=list, max_length=MAX_ITEMS * 2)
    education: list[str] = Field(default_factory=list, max_length=MAX_ITEMS * 2)
    experience: list[str] = Field(default_factory=list, max_length=MAX_ITEMS * 2)
    projects: list[str] = Field(default_factory=list, max_length=MAX_ITEMS * 2)
    certifications: list[str] = Field(default_factory=list, max_length=MAX_ITEMS * 2)
    target_roles: list[str] = Field(default_factory=list, max_length=MAX_ITEMS * 2)
    preferred_locations: list[str] = Field(default_factory=list, max_length=MAX_ITEMS * 2)
    work_modes: list[str] = Field(default_factory=list, max_length=3)
    discoverable: bool = False

    @field_validator("work_modes")
    @classmethod
    def _modes(cls, value: list[str]) -> list[str]:
        bad = [v for v in value if v not in WORK_MODES]
        if bad:
            raise ValueError(f"Unknown work mode: {bad[0]}")
        return value


def _profile_out(p: db_models.CandidateProfile | None) -> dict:
    if not p:
        return {"confirmed": False, "summary": "", "discoverable": False, "confirmed_at": None,
                **{f: [] for f in LIST_FIELDS}}
    return {
        "confirmed": p.confirmed_at is not None,
        "confirmed_at": as_utc(p.confirmed_at).isoformat() if p.confirmed_at else None,
        "summary": p.summary or "",
        "discoverable": bool(p.discoverable),
        **{f: list(getattr(p, f) or []) for f in LIST_FIELDS},
    }


@router.get("")
def get_profile(candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    return _profile_out(db.query(db_models.CandidateProfile).filter_by(user_id=candidate.id).first())


@router.put("")
def save_profile(payload: ProfileIn, candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    profile = db.query(db_models.CandidateProfile).filter_by(user_id=candidate.id).first()
    if not profile:
        profile = db_models.CandidateProfile(user_id=candidate.id)
        db.add(profile)
    profile.summary = payload.summary.strip()
    profile.skills = _clean_list([s.lower() for s in payload.skills], 60)
    for name in ("education", "experience", "projects", "certifications"):
        setattr(profile, name, _clean_list(getattr(payload, name)))
    profile.target_roles = _clean_list(payload.target_roles, 120)
    profile.preferred_locations = _clean_list(payload.preferred_locations, 120)
    profile.work_modes = _clean_list(payload.work_modes, 20)
    profile.discoverable = payload.discoverable
    profile.confirmed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return _profile_out(profile)


def _section_lines(text: str, limit: int = 25) -> list[str]:
    out = []
    for raw in (text or "").splitlines():
        line = re.sub(r"^\s*[-*•·▪]\s*", "", raw).strip()
        if len(line) >= 3:
            out.append(line[:300])
        if len(out) >= limit:
            break
    return out


@router.get("/suggestions")
def suggestions(candidate=Depends(get_current_candidate), db: Session = Depends(get_db)):
    """What the active resume appears to contain, split by section, for
    the candidate to review. Section detection is heading-based, so a
    resume with unusual headings gives sparse suggestions; the UI says so."""
    resume = db.query(db_models.Resume).filter_by(candidate_id=candidate.id, is_active=True).first()
    if not resume:
        raise HTTPException(status_code=409, detail="Upload a resume first")
    cv_text, profile = load_resume_text_and_profile(resume)
    sections = profile.get("cv_section_text") or {}
    header = cv_text[:800]
    locations = sorted({m.group(0).title() for m in _SRI_LANKA_RE.finditer(header)})
    if candidate.location and candidate.location not in locations:
        locations.insert(0, candidate.location)
    return {
        "resume": {"id": resume.id, "filename": resume.filename, "version": resume.version},
        "summary": " ".join(_section_lines(sections.get("Professional Summary", ""), 6)),
        "skills": sorted(profile.get("cv_skills") or []),
        "education": _section_lines(sections.get("Education", "")),
        "experience": _section_lines(sections.get("Work Experience", "")),
        "projects": _section_lines(sections.get("Projects", "")),
        "certifications": _section_lines(sections.get("Certifications", "")),
        "preferred_locations": locations,
        "sections_found": [name for name, present in (profile.get("resume_sections") or {}).items() if present],
    }
