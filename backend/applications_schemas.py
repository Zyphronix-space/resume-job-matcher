"""Pydantic schemas for the application/pipeline entity and its neighbors."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

APPLICATION_STATUSES = ["Applied", "Screening", "Interview", "Offer", "Shortlisted", "Rejected"]


class ApplyIn(BaseModel):
    resume_id: Optional[str] = None  # defaults to the candidate's active resume


class ApplicationStatusIn(BaseModel):
    status: str


class NoteIn(BaseModel):
    body: str


class JobBrief(BaseModel):
    id: str
    title: str
    location: str
    employment_type: str
    experience: str
    education: str
    status: str


class CandidateBrief(BaseModel):
    id: int
    full_name: str
    email: str
    headline: str
    location: str
    phone: str


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    author_id: int
    author_name: str
    body: str
    created_at: datetime


class ApplicationEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: datetime
    label: str


class ApplicationOut(BaseModel):
    id: str
    job: JobBrief
    candidate: CandidateBrief
    resume_id: str
    resume_filename: str
    match_score: float
    skill_coverage: float
    matched_skills: list[str]
    missing_skills: list[str]
    skill_categories: dict
    skill_importance: dict
    skill_evidence: dict = {}
    skill_gap_roadmap: list[dict]
    status: str
    created_at: datetime
    events: list[ApplicationEventOut]
    notes: list[NoteOut]


class JobMatchOut(BaseModel):
    """A candidate's ranked view of an open job they haven't necessarily
    applied to yet."""

    job: JobBrief
    match_score: float
    skill_coverage: float
    matched_skills: list[str]
    missing_skills: list[str]
    skill_categories: dict
    skill_importance: dict
    skill_gap_roadmap: list[dict]
    already_applied: bool
    application_status: Optional[str] = None


class CandidateSummaryOut(BaseModel):
    id: int
    full_name: str
    email: str
    headline: str
    location: str
    applications_count: int
    best_match_score: float
    latest_status: str


class CandidateDetailOut(BaseModel):
    candidate: CandidateBrief
    resumes: list[dict]
    applications: list[ApplicationOut]
