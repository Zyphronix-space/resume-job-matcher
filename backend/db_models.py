"""
SQLAlchemy tables for RecruitAI: accounts (recruiter or candidate),
recruiter-owned job postings, candidate resumes, the application/pipeline
entity linking a candidate+resume to a job (with a status timeline and
recruiter notes), and password-reset tokens.

Every query that touches these tables is additionally scoped in the route
layer (e.g. a recruiter only ever sees applications against their own jobs,
a candidate only ever sees their own resumes/applications) — the schema
itself only expresses the relationships, not the access rules.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    password_salt = Column(String, nullable=False)
    # "recruiter" | "candidate" — chosen at signup, fixed thereafter.
    # is_admin is a separate, orthogonal platform-oversight flag (see
    # routes_admin.py); the first account ever created is always an admin
    # regardless of role.
    role = Column(String, nullable=False, default="candidate")
    is_admin = Column(Boolean, default=False)

    full_name = Column(String, default="")
    phone = Column(String, default="")
    location = Column(String, default="")
    headline = Column(String, default="")
    links = Column(JSON, default=dict)  # e.g. {"linkedin": "...", "github": "...", "portfolio": "..."}

    created_at = Column(DateTime, default=_now)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=_uuid)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=False, default="")
    required_skills = Column(JSON, default=list)
    preferred_skills = Column(JSON, default=list)
    experience = Column(String, default="")
    education = Column(String, default="")
    location = Column(String, default="")
    employment_type = Column(String, default="Full-time")
    status = Column(String, default="Open")  # Draft | Open | Closed

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True, default=_uuid)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True)

    # Cached output of resume_analyzer.extract_resume_profile — never the
    # raw resume text itself (see resume_analyzer.py's privacy notes).
    cv_skills = Column(JSON, default=list)
    resume_sections = Column(JSON, default=dict)
    resume_structure_score = Column(Float, default=0.0)

    uploaded_at = Column(DateTime, default=_now)


class Application(Base):
    """One candidate's application (with one resume) to one job — the core
    pipeline entity a recruiter ranks, shortlists, and annotates."""

    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("job_id", "candidate_id", name="uq_application_per_candidate_job"),)

    id = Column(String, primary_key=True, default=_uuid)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id = Column(String, ForeignKey("resumes.id"), nullable=False)

    # Cached match result from job_matcher.match_single, recomputed whenever
    # the candidate re-applies with a newer resume. skill_evidence (resume
    # text excerpts) is deliberately never persisted here — same privacy
    # principle as the rest of this app (see resume_analyzer.py) — it's
    # recomputed on demand from the stored PDF when an application's detail
    # view is opened, then discarded.
    match_score = Column(Float, default=0.0)
    skill_coverage = Column(Float, default=0.0)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    skill_categories = Column(JSON, default=dict)
    skill_importance = Column(JSON, default=dict)
    skill_gap_roadmap = Column(JSON, default=list)

    status = Column(String, default="Applied")  # Applied|Screening|Interview|Offer|Shortlisted|Rejected
    created_at = Column(DateTime, default=_now)

    job = relationship("Job", back_populates="applications")
    events = relationship(
        "ApplicationEvent", back_populates="application", cascade="all, delete-orphan",
        order_by="ApplicationEvent.date",
    )
    notes = relationship(
        "Note", back_populates="application", cascade="all, delete-orphan", order_by="Note.created_at",
    )


class ApplicationEvent(Base):
    __tablename__ = "application_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    date = Column(DateTime, default=_now)
    label = Column(String, nullable=False)

    application = relationship("Application", back_populates="events")


class Note(Base):
    """A recruiter's note on a candidate's application."""

    __tablename__ = "notes"

    id = Column(String, primary_key=True, default=_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=_now)

    application = relationship("Application", back_populates="notes")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token = Column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
