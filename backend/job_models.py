"""Pydantic response schemas for the /jobs* routes."""

from typing import Optional

from pydantic import BaseModel


class JobPostingOut(BaseModel):
    id: str
    title: str
    company: str
    location: str
    work_mode: str
    description: str
    required_skills: list[str]
    preferred_skills: list[str]
    posted_date: Optional[str]
    application_deadline: Optional[str]
    application_url: Optional[str]
    source: str
    is_demo: bool


class JobSearchResponse(BaseModel):
    provider: str
    is_demo: bool
    count: int
    jobs: list[JobPostingOut]


class JobDetailResponse(BaseModel):
    provider: str
    is_demo: bool
    job: JobPostingOut


class JobMatchResponse(BaseModel):
    resume_structure_score: float
    resume_sections: dict[str, bool]
    results: dict[str, dict]
