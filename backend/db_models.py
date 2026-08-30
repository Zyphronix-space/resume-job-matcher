"""
SQLAlchemy tables: users (accounts), saved internships, tracked
applications (with a status timeline), preferences, and resume-analysis
history.

Every user-data table is scoped by user_id — each account only ever sees
its own saved jobs, applications, preferences, and history (enforced in
routes_user_data.py via the get_current_user dependency, not just in the
UI). Every JSON column stores plain skill lists/dicts computed by
resume_analyzer.py / skill_analysis.py — never raw resume text
(skill_evidence, which holds short resume excerpts, is deliberately left
out wherever it would otherwise be persisted).
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
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
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)


class SavedJob(Base):
    __tablename__ = "saved_jobs"
    __table_args__ = (UniqueConstraint("user_id", "job_id", name="uq_saved_job_per_user"),)

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=False)
    work_mode = Column(String, nullable=False)
    application_url = Column(String, nullable=True)
    is_demo = Column(Integer, default=1)
    match_result = Column(JSON, nullable=True)
    saved_at = Column(DateTime, default=_now)


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=True)
    work_mode = Column(String, nullable=True)
    application_url = Column(String, nullable=True)
    match_score = Column(Float, nullable=True)
    skill_coverage = Column(Float, nullable=True)
    resume_filename = Column(String, nullable=True)
    cover_letter = Column(Text, default="")
    questions = Column(JSON, default=list)
    status = Column(String, default="Preparing")
    created_at = Column(DateTime, default=_now)

    events = relationship(
        "ApplicationEvent",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationEvent.date",
    )


class ApplicationEvent(Base):
    __tablename__ = "application_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    date = Column(DateTime, default=_now)
    label = Column(String, nullable=False)

    application = relationship("Application", back_populates="events")


class Preference(Base):
    __tablename__ = "preferences"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    roles = Column(JSON, default=list)
    locations = Column(JSON, default=list)
    work_mode = Column(String, default="Any")
    technologies = Column(JSON, default=list)


class AnalysisHistoryEntry(Base):
    __tablename__ = "analysis_history"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    job_label = Column(String, nullable=False)
    match_score = Column(Float, nullable=False)
    skill_coverage = Column(Float, nullable=False)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    skill_categories = Column(JSON, default=dict)
    skill_importance = Column(JSON, default=dict)
    resume_sections = Column(JSON, default=dict)
    resume_structure_score = Column(Float, nullable=True)
    skill_gap_roadmap = Column(JSON, default=list)
    created_at = Column(DateTime, default=_now)
