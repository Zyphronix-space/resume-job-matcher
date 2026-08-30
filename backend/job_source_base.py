"""
Provider-agnostic job posting interface.

Every job source — the bundled demo data today, a real job-board API later —
implements JobProvider and returns JobPosting objects. Nothing else in the
app (job_matcher.py, main.py's routes, the frontend) needs to change when a
real provider is added; you write one new JobProvider subclass and select
it in job_sources/provider.py's get_active_provider().

This app never scrapes job sites, automates logins/CAPTCHAs, or submits
applications on a user's behalf — see job_sources/provider.py for the demo
provider and application_url handling in main.py.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class JobPosting:
    id: str
    title: str
    company: str
    location: str
    work_mode: str  # "Remote" | "Hybrid" | "On-site"
    description: str
    required_skills: list[str]
    preferred_skills: list[str] = field(default_factory=list)
    posted_date: Optional[str] = None  # ISO date string, or None -> "Not provided" in the UI
    application_deadline: Optional[str] = None
    application_url: Optional[str] = None
    source: str = "demo"  # id of the provider that returned this posting
    is_demo: bool = True  # the UI must clearly label demo postings as such


@dataclass
class JobSearchFilters:
    role: Optional[str] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None  # "Remote" | "Hybrid" | "On-site" | None (any)
    skills: list[str] = field(default_factory=list)
    company: Optional[str] = None
    keyword: Optional[str] = None


class JobProvider:
    """Base class every job source implements."""

    id: str = "base"
    is_demo: bool = True

    def search(self, filters: JobSearchFilters) -> list[JobPosting]:
        raise NotImplementedError

    def get(self, job_id: str) -> Optional[JobPosting]:
        raise NotImplementedError
