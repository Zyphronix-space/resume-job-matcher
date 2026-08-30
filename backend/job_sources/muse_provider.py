"""
Live internship/job data from The Muse's public Jobs API
(https://www.themuse.com/developers/api/v2).

The Muse aggregates real postings sourced directly from companies' own
career pages, under a public API explicitly intended for third-party
reuse. We never alter, re-host, or strip attribution from that content:
every posting keeps its real company name and links back to the posting's
own page on themuse.com (which itself links through to the employer's
application flow) — see application_url below and the "via The Muse"
attribution rendered in the UI. No authentication is required for
reasonable request volumes; set the MUSE_API_KEY env var to raise the
rate limit if this app is used heavily.
"""

import html
import os
import re

import httpx

from .base import JobPosting, JobProvider, JobSearchFilters

MUSE_BASE_URL = "https://www.themuse.com/api/public/jobs"
MUSE_API_KEY = os.environ.get("MUSE_API_KEY")

# This app centers on internships, so every query is scoped to that level —
# a broader "find a job" search would drop this filter, but internships are
# the explicit focus here.
DEFAULT_LEVEL = "Internship"

_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(raw_html: str) -> str:
    text = _TAG_RE.sub(" ", raw_html or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _is_remote(locations: list[dict]) -> bool:
    return any("remote" in loc.get("name", "").lower() for loc in locations)


def _map_posting(raw: dict) -> JobPosting:
    locations = raw.get("locations") or []
    location = ", ".join(loc["name"] for loc in locations) if locations else "Not provided"
    work_mode = "Remote" if _is_remote(locations) else "On-site"

    return JobPosting(
        id=f"muse-{raw['id']}",
        title=raw.get("name", "Untitled role"),
        company=raw.get("company", {}).get("name", "Unknown company"),
        location=location,
        work_mode=work_mode,
        description=_strip_html(raw.get("contents", "")),
        # The Muse doesn't return a structured skills list — matching still
        # works via taxonomy detection over `description`, same as every
        # other posting in this app.
        required_skills=[],
        preferred_skills=[],
        posted_date=raw.get("publication_date"),
        application_deadline=None,  # not provided by this API
        application_url=(raw.get("refs") or {}).get("landing_page"),
        source="themuse",
        is_demo=False,
    )


class MuseJobProvider(JobProvider):
    id = "themuse"
    is_demo = False

    def __init__(self, pages_to_fetch: int = 2, timeout: float = 6.0):
        self.pages_to_fetch = pages_to_fetch
        self.timeout = timeout

    def _fetch_page(self, page: int) -> list[dict]:
        params = {"page": page, "level": DEFAULT_LEVEL}
        if MUSE_API_KEY:
            params["api_key"] = MUSE_API_KEY
        resp = httpx.get(MUSE_BASE_URL, params=params, timeout=self.timeout)
        resp.raise_for_status()
        return resp.json().get("results", [])

    def search(self, filters: JobSearchFilters) -> list[JobPosting]:
        raw_results: list[dict] = []
        for page in range(self.pages_to_fetch):
            raw_results.extend(self._fetch_page(page))

        postings = [_map_posting(raw) for raw in raw_results]

        if filters.location:
            loc_lower = filters.location.lower()
            postings = [j for j in postings if loc_lower in j.location.lower()]

        if filters.work_mode and filters.work_mode.lower() != "any":
            mode_lower = filters.work_mode.lower()
            postings = [j for j in postings if j.work_mode.lower() == mode_lower]

        if filters.company:
            company_lower = filters.company.lower()
            postings = [j for j in postings if company_lower in j.company.lower()]

        if filters.role:
            role_lower = filters.role.lower()
            postings = [j for j in postings if role_lower in j.title.lower()]

        if filters.skills:
            wanted = {s.strip().lower() for s in filters.skills if s.strip()}
            if wanted:
                postings = [j for j in postings if any(w in j.description.lower() for w in wanted)]

        if filters.keyword:
            kw = filters.keyword.lower()
            postings = [
                j for j in postings
                if kw in j.title.lower() or kw in j.description.lower() or kw in j.company.lower()
            ]

        return postings

    def get(self, job_id: str) -> JobPosting | None:
        if not job_id.startswith("muse-"):
            return None
        muse_id = job_id[len("muse-"):]
        resp = httpx.get(f"{MUSE_BASE_URL}/{muse_id}", timeout=self.timeout)
        if resp.status_code != 200:
            return None
        return _map_posting(resp.json())
