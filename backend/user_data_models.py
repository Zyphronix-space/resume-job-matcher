"""Pydantic request/response schemas for the saved-jobs, applications,
preferences, and history routes backed by the SQLite database."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SavedJobIn(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    work_mode: str
    application_url: Optional[str] = None
    is_demo: bool = True
    match_result: Optional[dict] = None


class SavedJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    title: str
    company: str
    location: str
    work_mode: str
    application_url: Optional[str]
    is_demo: int
    match_result: Optional[dict]
    saved_at: datetime


class ApplicationCreateIn(BaseModel):
    job_id: str
    title: str
    company: str
    location: Optional[str] = None
    work_mode: Optional[str] = None
    application_url: Optional[str] = None
    match_score: Optional[float] = None
    skill_coverage: Optional[float] = None
    resume_filename: Optional[str] = None


class ApplicationUpdateIn(BaseModel):
    cover_letter: Optional[str] = None
    questions: Optional[list[dict]] = None


class ApplicationStatusIn(BaseModel):
    status: str


class ApplicationEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: datetime
    label: str


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    title: str
    company: str
    location: Optional[str]
    work_mode: Optional[str]
    application_url: Optional[str]
    match_score: Optional[float]
    skill_coverage: Optional[float]
    resume_filename: Optional[str]
    cover_letter: str
    questions: list[dict]
    status: str
    created_at: datetime
    events: list[ApplicationEventOut]


class PreferencesIn(BaseModel):
    roles: list[str] = []
    locations: list[str] = []
    work_mode: str = "Any"
    technologies: list[str] = []


class PreferencesOut(PreferencesIn):
    model_config = ConfigDict(from_attributes=True)


class HistoryEntryIn(BaseModel):
    filename: str
    job_label: str
    match_score: float
    skill_coverage: float
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    skill_categories: dict = {}
    skill_importance: dict = {}
    resume_sections: dict = {}
    resume_structure_score: Optional[float] = None
    skill_gap_roadmap: list[dict] = []


class HistoryEntryOut(HistoryEntryIn):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
