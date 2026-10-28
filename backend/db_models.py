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
    Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, LargeBinary, String, Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import deferred, relationship

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
    # Bumped when the password changes or is reset; tokens carry the version
    # they were issued under, so every older session stops working. NULL on
    # rows created before this column existed, which counts as 0.
    token_version = Column(Integer, nullable=True, default=0)

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
    # The uploaded PDF itself. Stored in the database rather than on disk
    # because serverless hosting has no persistent filesystem. Deferred so
    # listing resumes doesn't drag every file's bytes along.
    file_data = deferred(Column(LargeBinary().with_variant(LONGBLOB(), "mysql"), nullable=True))
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


# --- Job-seeker workspace -------------------------------------------------
#
# Everything below works without any recruiter on the platform: real
# vacancies imported from public employer job boards (or curated by an
# admin), a candidate's own reviewed profile, and a private tracker with
# per-job drafts. None of it is visible to any other account.


class JobSource(Base):
    """One employer job board the platform is allowed to read, e.g. a
    company's public Greenhouse board. A per-company board is exactly that:
    one company's openings, not a search index of the job market."""

    __tablename__ = "job_sources"
    __table_args__ = (UniqueConstraint("kind", "board", name="uq_job_source_kind_board"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    # greenhouse | lever | ashby | smartrecruiters | workable | manual
    kind = Column(String(32), nullable=False)
    board = Column(String(120), nullable=False, default="")  # board token / company slug; "" for manual
    company = Column(String(200), nullable=False)
    website = Column(String(500), default="")
    enabled = Column(Boolean, default=True)
    notes = Column(Text, default="")  # terms, coverage limits, who verified it

    last_synced_at = Column(DateTime, nullable=True)
    last_status = Column(String(32), default="never")  # never | ok | error
    last_error = Column(Text, default="")
    last_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=_now)


class JobPosting(Base):
    """A real vacancy as published by its source. Never edited to look
    better than the original: the description is the source's own text
    (HTML stripped), and apply_url always points back to the employer."""

    __tablename__ = "job_postings"
    __table_args__ = (UniqueConstraint("source_id", "external_id", name="uq_posting_source_external"),)

    id = Column(String(36), primary_key=True, default=_uuid)
    source_id = Column(Integer, ForeignKey("job_sources.id"), nullable=False, index=True)
    external_id = Column(String(191), nullable=False)
    # sha256 of normalized company|title|location, shared by the same
    # vacancy published through two sources; see job_ingest.dedupe_key.
    dedupe_key = Column(String(64), nullable=False, index=True)
    duplicate_of = Column(String(36), nullable=True)

    title = Column(String(300), nullable=False)
    company = Column(String(200), nullable=False)
    location = Column(String(500), default="")
    country = Column(String(80), default="")
    work_mode = Column(String(20), default="Unspecified")  # Remote | Hybrid | On-site | Unspecified
    employment_type = Column(String(40), default="Unspecified")
    experience_level = Column(String(40), default="Unspecified")  # Internship | Graduate | Junior | Mid | Senior | Unspecified
    # Located in Sri Lanka, or remote with no stated country restriction.
    open_to_sri_lanka = Column(Boolean, default=False)
    description = Column(Text, default="")
    skills = Column(JSON, default=list)

    posted_at = Column(DateTime, nullable=True)  # as stated by the source; None when it doesn't say
    apply_url = Column(String(1000), default="")
    source_url = Column(String(1000), default="")

    status = Column(String(20), default="active")  # active | expired
    first_seen_at = Column(DateTime, default=_now)
    last_verified_at = Column(DateTime, default=_now)  # last time the source still listed it
    closed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # stated closing date (manual postings, mostly)

    source = relationship("JobSource")


class CandidateProfile(Base):
    """Details the candidate reviewed and confirmed. Extraction from the
    resume only ever produces suggestions; nothing lands here until the
    candidate saves it, and drafts are built from this plus the resume."""

    __tablename__ = "candidate_profiles"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    summary = Column(Text, default="")
    skills = Column(JSON, default=list)
    education = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    target_roles = Column(JSON, default=list)
    preferred_locations = Column(JSON, default=list)
    work_modes = Column(JSON, default=list)
    # Off by default. No recruiter search reads it yet; it exists so the
    # choice is the candidate's before any discovery feature ships.
    discoverable = Column(Boolean, default=False)
    confirmed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


TRACKER_STAGES = ["Saved", "Preparing", "Applied", "Assessment", "Interview", "Offer", "Rejected", "Withdrawn"]


class TrackedJob(Base):
    """A job in the candidate's private tracker: either a real posting
    from the job index or one the candidate pasted in themselves."""

    __tablename__ = "tracked_jobs"
    __table_args__ = (UniqueConstraint("user_id", "posting_id", name="uq_tracked_user_posting"),)

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    posting_id = Column(String(36), ForeignKey("job_postings.id"), nullable=True)
    origin = Column(String(20), default="posting")  # posting | pasted

    # Copied from the posting when tracked (so the record survives the
    # posting expiring), or typed/pasted by the candidate.
    title = Column(String(300), nullable=False)
    company = Column(String(200), default="")
    location = Column(String(500), default="")
    apply_url = Column(String(1000), default="")
    description = Column(Text, default="")

    stage = Column(String(20), default="Saved")
    resume_id = Column(String(36), ForeignKey("resumes.id"), nullable=True)
    applied_on = Column(DateTime, nullable=True)
    next_follow_up = Column(DateTime, nullable=True)
    notes = Column(Text, default="")
    prep_notes = Column(Text, default="")

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    events = relationship(
        "TrackedJobEvent", back_populates="tracked_job", cascade="all, delete-orphan",
        order_by="TrackedJobEvent.at",
    )
    documents = relationship("ApplicationDocument", back_populates="tracked_job", cascade="all, delete-orphan")
    posting = relationship("JobPosting")


class TrackedJobEvent(Base):
    __tablename__ = "tracked_job_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tracked_job_id = Column(String(36), ForeignKey("tracked_jobs.id"), nullable=False, index=True)
    from_stage = Column(String(20), default="")
    to_stage = Column(String(20), nullable=False)
    at = Column(DateTime, default=_now)

    tracked_job = relationship("TrackedJob", back_populates="events")


class ApplicationDocument(Base):
    """A job-specific draft: tailored resume, cover letter or outreach
    message. Generated from the candidate's own data by a template (see
    drafts.py), then edited freely by the candidate."""

    __tablename__ = "application_documents"
    __table_args__ = (UniqueConstraint("tracked_job_id", "kind", name="uq_document_per_kind"),)

    id = Column(String(36), primary_key=True, default=_uuid)
    tracked_job_id = Column(String(36), ForeignKey("tracked_jobs.id"), nullable=False)
    kind = Column(String(20), nullable=False)  # resume | cover_letter | outreach
    content = Column(Text, default="")
    generator = Column(String(40), default="")  # e.g. "template-v1"
    edited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    tracked_job = relationship("TrackedJob", back_populates="documents")


class AuthAttempt(Base):
    """A failed sign-in, keyed by email and by client IP. Stored in the
    database rather than memory because serverless instances don't share
    memory, so an in-process counter would reset on every new instance."""

    __tablename__ = "auth_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(191), nullable=False, index=True)
    at = Column(DateTime, default=_now, index=True)
