"""Pydantic schemas for recruiter-owned job postings."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

EmploymentType = Literal["Full-time", "Part-time", "Internship", "Contract", "Temporary"]
JobStatus = Literal["Draft", "Open", "Closed"]


class JobCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = ""
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    experience: str = ""
    education: str = ""
    location: str = ""
    employment_type: EmploymentType = "Full-time"
    status: JobStatus = "Open"


class JobUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[list[str]] = None
    preferred_skills: Optional[list[str]] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    status: Optional[JobStatus] = None


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    recruiter_id: int
    title: str
    description: str
    required_skills: list[str]
    preferred_skills: list[str]
    experience: str
    education: str
    location: str
    employment_type: str
    status: str
    created_at: datetime
    updated_at: datetime
    applicants_count: int = 0
    shortlisted_count: int = 0
