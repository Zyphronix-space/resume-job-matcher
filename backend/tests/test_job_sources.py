"""Job-board connectors: payload parsing, normalization, and the pasted-link
parser that must never let a user-supplied URL be fetched."""

from datetime import timezone

import pytest

import job_sources
from job_sources import SourceError, parse_posting_url

GREENHOUSE_PAYLOAD = {
    "jobs": [
        {
            "id": 5569916,
            "title": "Graduate Software Engineer, Ubuntu",
            "location": {"name": "Home based - Worldwide"},
            "absolute_url": "https://job-boards.greenhouse.io/canonical/jobs/5569916",
            "first_published": "2026-09-01T10:00:00-05:00",
            # Greenhouse double-escapes its HTML content
            "content": "&lt;p&gt;Requirements&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Python and Git&lt;/li&gt;"
                       "&lt;li&gt;A degree in Computer Science&lt;/li&gt;&lt;/ul&gt;&amp;nbsp;",
        }
    ]
}

LEVER_POSTING = {
    "id": "0f3c3b0e-2a7e-4a4e-9a55-3e2a8f1f7c11",
    "text": "Software Engineering Intern",
    "categories": {"location": "Colombo, Sri Lanka", "commitment": "Internship", "allLocations": ["Colombo, Sri Lanka"]},
    "workplaceType": "hybrid",
    "country": "LK",
    "descriptionPlain": "Join our platform team.",
    "lists": [{"text": "What you'll need", "content": "<li>React and JavaScript</li><li>SQL</li>"}],
    "additionalPlain": "",
    "hostedUrl": "https://jobs.lever.co/example/0f3c3b0e-2a7e-4a4e-9a55-3e2a8f1f7c11",
    "applyUrl": "https://jobs.lever.co/example/0f3c3b0e-2a7e-4a4e-9a55-3e2a8f1f7c11/apply",
    "createdAt": 1790000000000,
}

ASHBY_PAYLOAD = {
    "jobs": [
        {
            "id": "11111111-2222-3333-4444-555555555555", "title": "Junior Product Engineer",
            "location": "Remote", "secondaryLocations": [], "isRemote": True, "isListed": True,
            "employmentType": "FullTime", "descriptionPlain": "TypeScript, React and PostgreSQL.",
            "publishedAt": "2026-10-01T00:00:00.000+00:00",
            "jobUrl": "https://jobs.ashbyhq.com/example/11111111-2222-3333-4444-555555555555",
            "applyUrl": "javascript:alert(1)",
        },
        {"id": "unlisted", "title": "Hidden", "isListed": False},
    ]
}


def test_strip_html_decodes_double_escaped_greenhouse_content():
    text = job_sources.strip_html(GREENHOUSE_PAYLOAD["jobs"][0]["content"])
    assert "<" not in text and "&lt;" not in text and "&amp;" not in text
    assert "Python and Git" in text.splitlines()


def test_greenhouse_parsing(monkeypatch):
    monkeypatch.setattr(job_sources, "_get_json", lambda url, params=None: GREENHOUSE_PAYLOAD)
    [p] = job_sources.fetch_greenhouse("canonical", "Canonical")
    assert p.external_id == "5569916" and p.company == "Canonical"
    assert p.work_mode == "Remote" and p.open_to_sri_lanka is True
    assert p.experience_level == "Graduate"
    assert {"python", "git"} <= set(p.skills)
    # timestamps are converted to UTC, not stored with their offset dropped
    assert p.posted_at.tzinfo == timezone.utc and p.posted_at.hour == 15
    assert p.apply_url == "https://job-boards.greenhouse.io/canonical/jobs/5569916"


def test_lever_parsing(monkeypatch):
    monkeypatch.setattr(job_sources, "_get_json", lambda url, params=None: [LEVER_POSTING])
    [p] = job_sources.fetch_lever("example", "Example Ltd")
    assert p.title == "Software Engineering Intern"
    assert p.country == "Sri Lanka" and p.open_to_sri_lanka
    assert p.work_mode == "Hybrid"
    assert p.employment_type == "Internship" and p.experience_level == "Internship"
    assert {"react", "javascript", "sql"} <= set(p.skills)
    assert p.apply_url.endswith("/apply")


def test_ashby_parsing_drops_unlisted_and_unsafe_links(monkeypatch):
    monkeypatch.setattr(job_sources, "_get_json", lambda url, params=None: ASHBY_PAYLOAD)
    postings = job_sources.fetch_ashby("example", "Example")
    assert [p.title for p in postings] == ["Junior Product Engineer"]
    p = postings[0]
    assert p.apply_url == ""  # javascript: link discarded
    assert p.source_url.startswith("https://jobs.ashbyhq.com/")
    assert p.employment_type == "Full-time" and p.experience_level == "Junior"
    # A bare "Remote" doesn't claim Sri Lanka eligibility
    assert p.work_mode == "Remote" and p.open_to_sri_lanka is False


@pytest.mark.parametrize("location,mode,expected", [
    ("Colombo, Sri Lanka", "On-site", True),
    ("Remote - Worldwide", "Remote", True),
    ("Home Based - APAC", "Remote", True),
    ("Remote, United States", "Remote", False),
    ("Remote", "Remote", False),
    ("London, United Kingdom", "On-site", False),
])
def test_open_to_sri_lanka(location, mode, expected):
    assert job_sources.open_to_sri_lanka(location, mode, job_sources.infer_country(location)) is expected


@pytest.mark.parametrize("title,level", [
    ("Software Engineering Intern", "Internship"),
    ("Graduate Software Engineer", "Graduate"),
    ("Junior Ubuntu Software Engineer", "Junior"),
    ("Senior Associate, Platform", "Senior"),
    ("Software Engineer", "Unspecified"),
])
def test_experience_level(title, level):
    assert job_sources.infer_experience_level(title) == level


def test_bad_slug_never_builds_a_request(monkeypatch):
    calls = []
    monkeypatch.setattr(job_sources, "_get_json", lambda url, params=None: calls.append(url) or {})
    for slug in ("../admin", "a/b", "x?y=1", "", "evil.com#"):
        with pytest.raises(SourceError):
            job_sources.fetch_greenhouse(slug, "X")
    assert calls == []


@pytest.mark.parametrize("url,expected", [
    ("https://boards.greenhouse.io/canonical/jobs/5569916", ("greenhouse", "canonical", "5569916")),
    ("https://job-boards.greenhouse.io/canonical/jobs/5569916?gh_src=abc", ("greenhouse", "canonical", "5569916")),
    ("https://jobs.lever.co/example/0f3c3b0e-2a7e-4a4e-9a55-3e2a8f1f7c11/apply",
     ("lever", "example", "0f3c3b0e-2a7e-4a4e-9a55-3e2a8f1f7c11")),
    ("https://jobs.ashbyhq.com/posthog/0be1b52c-2401-4ae2-b7fc-5d018c1ff96f",
     ("ashby", "posthog", "0be1b52c-2401-4ae2-b7fc-5d018c1ff96f")),
    ("https://jobs.smartrecruiters.com/Fortude/743999675797472-business-development-manager",
     ("smartrecruiters", "Fortude", "743999675797472")),
    ("https://apply.workable.com/example/j/AB12CD34EF/", ("workable", "example", "AB12CD34EF")),
])
def test_parse_supported_links(url, expected):
    assert parse_posting_url(url) == expected


@pytest.mark.parametrize("url", [
    "http://boards.greenhouse.io/canonical/jobs/1",            # not https
    "https://169.254.169.254/latest/meta-data/",               # cloud metadata
    "https://localhost/canonical/jobs/1",
    "https://127.0.0.1/canonical/jobs/1",
    "file:///etc/passwd",
    "https://boards.greenhouse.io.evil.com/canonical/jobs/1",   # lookalike host
    "https://evil.com/boards.greenhouse.io/canonical/jobs/1",
    "https://boards.greenhouse.io@evil.com/canonical/jobs/1",   # userinfo trick
    "https://user:pass@boards.greenhouse.io/canonical/jobs/1",
    "https://boards.greenhouse.io:8443/canonical/jobs/1",       # non-default port
    "https://boards.greenhouse.io/../../admin/jobs/1",
    "https://boards.greenhouse.io/canonical/jobs/1%2F..%2F..",
    "https://jobs.lever.co/example/not-a-uuid",
    "https://www.linkedin.com/jobs/view/123",
    "javascript:alert(1)",
    "https://boards.greenhouse.io/canonical",                  # a board, not a posting
    "a" * 3000,
])
def test_parse_rejects_hostile_or_unsupported_links(url):
    with pytest.raises(SourceError):
        parse_posting_url(url)


def test_get_json_refuses_redirects_and_oversized_bodies(monkeypatch):
    import httpx

    def handler(request):
        if request.url.path.endswith("/redirect"):
            return httpx.Response(302, headers={"Location": "http://169.254.169.254/"})
        return httpx.Response(200, content=b"x" * (job_sources.MAX_RESPONSE_BYTES + 10))

    transport = httpx.MockTransport(handler)
    real_client = httpx.Client
    monkeypatch.setattr(job_sources.httpx, "Client", lambda **kw: real_client(transport=transport, **kw))
    with pytest.raises(SourceError, match="HTTP 302"):
        job_sources._get_json("https://boards-api.greenhouse.io/redirect")
    with pytest.raises(SourceError, match="too large"):
        job_sources._get_json("https://boards-api.greenhouse.io/big")
