"""
Connectors for employer job boards that publish their openings through a
public, unauthenticated API meant for exactly that purpose:

  greenhouse       GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
                   "Job Board data is publicly available, so authentication
                   is not required for any GET endpoints" (Greenhouse docs).
  lever            GET https://api.lever.co/v0/postings/{site}?mode=json
                   Published postings only; Lever notes they "may be scraped
                   by third parties".
  ashby            GET https://api.ashbyhq.com/posting-api/job-board/{org}
  smartrecruiters  GET https://api.smartrecruiters.com/v1/companies/{id}/postings
  workable         GET https://apply.workable.com/api/v1/widget/accounts/{acct}?details=true

Each board belongs to ONE employer. Adding a board means adding that one
company's openings, so the registry (db_models.JobSource) is curated by an
admin; nothing here searches the wider job market.

Security: every request goes to one of the constant API hosts above, built
from a slug that has passed SLUG_RE. A URL a user pastes is never fetched
itself: parse_posting_url() only recognises known job-board URL shapes and
turns them into (kind, board, id), which then go through the same
constant-host path. Redirects are not followed and responses are capped.
"""

import html
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import urlsplit

import httpx

from resume_analyzer import find_skills

SLUG_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$")
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$")
MAX_RESPONSE_BYTES = 15 * 1024 * 1024
TIMEOUT = httpx.Timeout(20.0, connect=10.0)
USER_AGENT = "ResumeMatch job index (+https://resume-match-stephan.vercel.app)"

KINDS = ("greenhouse", "lever", "ashby", "smartrecruiters", "workable")


class SourceError(Exception):
    """A board could not be read: unreachable, unknown slug, or bad data."""


@dataclass
class NormalizedPosting:
    external_id: str
    title: str
    company: str
    location: str = ""
    country: str = ""
    work_mode: str = "Unspecified"
    employment_type: str = "Unspecified"
    experience_level: str = "Unspecified"
    open_to_sri_lanka: bool = False
    description: str = ""
    skills: list[str] = field(default_factory=list)
    posted_at: datetime | None = None
    apply_url: str = ""
    source_url: str = ""


# --- HTTP -------------------------------------------------------------------

def _get_json(url: str, params: dict | None = None):
    """GET a JSON document from a constant API host. No redirects (a
    redirect off the API host is treated as a failure), and the body is
    capped so one misbehaving board can't exhaust the function's memory."""
    try:
        with httpx.Client(timeout=TIMEOUT, follow_redirects=False, headers={"User-Agent": USER_AGENT}) as client:
            with client.stream("GET", url, params=params) as res:
                if res.status_code == 404:
                    raise SourceError("Board not found (404). Check the board name.")
                if res.status_code != 200:
                    raise SourceError(f"Source returned HTTP {res.status_code}")
                body = bytearray()
                for chunk in res.iter_bytes():
                    body += chunk
                    if len(body) > MAX_RESPONSE_BYTES:
                        raise SourceError("Source response was too large")
    except httpx.HTTPError as exc:
        raise SourceError(f"Could not reach the source ({type(exc).__name__})") from exc
    try:
        return json.loads(body)
    except ValueError as exc:
        raise SourceError("Source did not return JSON") from exc


def _check_slug(value: str, what: str = "board") -> str:
    if not isinstance(value, str) or not SLUG_RE.match(value):
        raise SourceError(f"Invalid {what} name")
    return value


# --- Normalization ----------------------------------------------------------

_TAG_RE = re.compile(r"<[^>]+>")
_BLOCK_RE = re.compile(r"</?(p|div|br|li|ul|ol|h[1-6]|tr)\b[^>]*>", re.I)


def strip_html(raw: str) -> str:
    """HTML to readable plain text. Greenhouse double-escapes its content,
    so entities are decoded before and after the tags come out."""
    text = html.unescape(raw or "")
    text = _BLOCK_RE.sub("\n", text)
    text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    lines = [re.sub(r"[ \t ]+", " ", line).strip() for line in text.splitlines()]
    out, blank = [], False
    for line in lines:
        if line:
            out.append(line)
            blank = False
        elif not blank and out:
            out.append("")
            blank = True
    return "\n".join(out).strip()


_SRI_LANKA_RE = re.compile(r"\b(sri\s*lanka|colombo|kandy|galle|jaffna|negombo|kurunegala|malabe|moratuwa)\b", re.I)
_WORLDWIDE_RE = re.compile(r"\b(worldwide|anywhere|global|apac|asia[ -]?pacific|asia)\b", re.I)
_REMOTE_RE = re.compile(r"\b(remote|home[- ]based|work from home|wfh)\b", re.I)
_HYBRID_RE = re.compile(r"\bhybrid\b", re.I)

# Country names the location inference recognises. A location that names
# none of these just leaves `country` blank rather than guessing.
_COUNTRIES = [
    "Sri Lanka", "India", "United States", "United Kingdom", "Canada", "Australia", "Germany",
    "Netherlands", "Singapore", "Ireland", "France", "Spain", "Sweden", "Poland", "Portugal",
    "Japan", "Brazil", "Mexico", "United Arab Emirates", "Malaysia", "Thailand", "Philippines",
    "New Zealand", "Denmark", "Norway", "Finland", "Switzerland", "Austria", "Italy", "Israel",
]
_COUNTRY_ALIASES = {"usa": "United States", "us": "United States", "uk": "United Kingdom", "uae": "United Arab Emirates"}
_ISO_COUNTRIES = {"lk": "Sri Lanka", "in": "India", "us": "United States", "gb": "United Kingdom", "ca": "Canada",
                  "au": "Australia", "de": "Germany", "nl": "Netherlands", "sg": "Singapore", "th": "Thailand",
                  "ie": "Ireland", "fr": "France", "es": "Spain", "ae": "United Arab Emirates", "my": "Malaysia"}


def infer_country(location: str, hint: str = "") -> str:
    if hint:
        hint = hint.strip()
        if hint.lower() in _ISO_COUNTRIES:
            return _ISO_COUNTRIES[hint.lower()]
        if len(hint) > 3:
            return hint
    if _SRI_LANKA_RE.search(location or ""):
        return "Sri Lanka"
    found = [c for c in _COUNTRIES if re.search(r"\b" + re.escape(c) + r"\b", location or "", re.I)]
    for token in re.split(r"[,;/()|-]", location or ""):
        alias = _COUNTRY_ALIASES.get(token.strip().lower())
        if alias:
            found.append(alias)
    found = list(dict.fromkeys(found))
    return found[0] if len(found) == 1 else ""


def infer_work_mode(location: str, explicit: str = "") -> str:
    explicit = (explicit or "").strip().lower().replace("_", "-")
    if explicit in ("remote",):
        return "Remote"
    if explicit in ("hybrid",):
        return "Hybrid"
    if explicit in ("on-site", "onsite", "in-office", "in office"):
        return "On-site"
    if _HYBRID_RE.search(location or ""):
        return "Hybrid"
    if _REMOTE_RE.search(location or ""):
        return "Remote"
    return "Unspecified"


def open_to_sri_lanka(location: str, work_mode: str, country: str) -> bool:
    """True only when the posting itself says so: it's in Sri Lanka, or
    it's remote and explicitly worldwide/APAC. A bare "Remote" doesn't
    count, since many remote roles are limited to one country."""
    if country == "Sri Lanka" or _SRI_LANKA_RE.search(location or ""):
        return True
    return work_mode == "Remote" and bool(_WORLDWIDE_RE.search(location or ""))


_LEVEL_RULES = [
    ("Internship", re.compile(r"\b(intern|internship|trainee|placement|co-?op)\b", re.I)),
    ("Graduate", re.compile(r"\b(graduate|new grad|entry[- ]level|fresher|early career)\b", re.I)),
    ("Senior", re.compile(r"\b(senior|sr\.?|staff|principal|lead|head of|director|manager|vp)\b", re.I)),
    ("Junior", re.compile(r"\b(junior|jr\.?|associate)\b", re.I)),
]


def infer_experience_level(title: str, explicit: str = "") -> str:
    explicit = (explicit or "").lower()
    if "intern" in explicit:
        return "Internship"
    if "entry" in explicit or "graduate" in explicit:
        return "Graduate"
    for level, pattern in _LEVEL_RULES:
        if pattern.search(title or ""):
            return level
    if "senior" in explicit or "director" in explicit or "executive" in explicit:
        return "Senior"
    if "mid" in explicit or "associate" in explicit:
        return "Mid" if "mid" in explicit else "Junior"
    return "Unspecified"


_EMPLOYMENT_MAP = {
    "intern": "Internship", "internship": "Internship",
    "fulltime": "Full-time", "full-time": "Full-time", "full time": "Full-time", "permanent": "Full-time",
    "parttime": "Part-time", "part-time": "Part-time", "part time": "Part-time",
    "contract": "Contract", "contractor": "Contract", "temporary": "Temporary", "temp": "Temporary",
}


def infer_employment_type(explicit: str, title: str) -> str:
    key = (explicit or "").strip().lower()
    for needle, value in _EMPLOYMENT_MAP.items():
        if needle == key or needle in key:
            return value
    if re.search(r"\b(intern|internship)\b", title or "", re.I):
        return "Internship"
    if re.search(r"\bgraduate (programme|program|scheme)\b", title or "", re.I):
        return "Graduate programme"
    return "Unspecified"


def _parse_dt(value) -> datetime | None:
    if value in (None, ""):
        return None
    try:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000 if value > 1e11 else value, tz=timezone.utc)
        text = str(value).strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(text)
        # Stored as UTC: the MySQL driver drops tzinfo on write, so a
        # -05:00 timestamp kept as-is would silently shift by five hours.
        return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (ValueError, OverflowError, OSError):
        return None


def _safe_url(value: str) -> str:
    """Keep only http(s) links. A javascript: or data: "apply URL" from a
    compromised feed must never reach an href in the UI."""
    value = (value or "").strip()
    parts = urlsplit(value)
    return value if parts.scheme in ("http", "https") and parts.netloc else ""


def finish(p: NormalizedPosting, *, explicit_mode: str = "", country_hint: str = "",
           explicit_level: str = "", explicit_type: str = "") -> NormalizedPosting:
    p.title = re.sub(r"\s+", " ", p.title or "").strip()[:300]
    p.company = (p.company or "").strip()[:200]
    p.location = re.sub(r"\s+", " ", p.location or "").strip()[:500]
    p.work_mode = infer_work_mode(p.location, explicit_mode)
    p.country = infer_country(p.location, country_hint)[:80]
    p.open_to_sri_lanka = open_to_sri_lanka(p.location, p.work_mode, p.country)
    p.experience_level = infer_experience_level(p.title, explicit_level)
    p.employment_type = infer_employment_type(explicit_type, p.title)
    p.skills = sorted(find_skills(f"{p.title}\n{p.description}"))
    p.apply_url = _safe_url(p.apply_url)[:1000]
    p.source_url = _safe_url(p.source_url)[:1000] or p.apply_url
    return p


# --- Providers --------------------------------------------------------------

def _greenhouse_one(raw: dict, company: str) -> NormalizedPosting:
    return finish(
        NormalizedPosting(
            external_id=str(raw.get("id")),
            title=raw.get("title", ""),
            company=company,
            location=(raw.get("location") or {}).get("name", ""),
            description=strip_html(raw.get("content", "")),
            posted_at=_parse_dt(raw.get("first_published")),
            apply_url=raw.get("absolute_url", ""),
            source_url=raw.get("absolute_url", ""),
        )
    )


def fetch_greenhouse(board: str, company: str) -> list[NormalizedPosting]:
    data = _get_json(f"https://boards-api.greenhouse.io/v1/boards/{_check_slug(board)}/jobs", {"content": "true"})
    return [_greenhouse_one(j, company) for j in (data.get("jobs") or []) if j.get("id")]


def _lever_one(raw: dict, company: str) -> NormalizedPosting:
    cats = raw.get("categories") or {}
    locations = [cats.get("location") or ""] + [l for l in (cats.get("allLocations") or []) if l != cats.get("location")]
    parts = [raw.get("descriptionPlain") or strip_html(raw.get("description", ""))]
    for block in raw.get("lists") or []:
        parts.append(f"{block.get('text', '')}\n{strip_html(block.get('content', ''))}")
    parts.append(raw.get("additionalPlain") or strip_html(raw.get("additional", "")))
    return finish(
        NormalizedPosting(
            external_id=str(raw.get("id")),
            title=raw.get("text", ""),
            company=company,
            location="; ".join(l for l in locations if l),
            description="\n\n".join(p.strip() for p in parts if p and p.strip()),
            posted_at=_parse_dt(raw.get("createdAt")),
            apply_url=raw.get("applyUrl") or raw.get("hostedUrl", ""),
            source_url=raw.get("hostedUrl", ""),
        ),
        explicit_mode=raw.get("workplaceType", ""),
        country_hint=raw.get("country") or "",
        explicit_type=cats.get("commitment", ""),
    )


def fetch_lever(board: str, company: str) -> list[NormalizedPosting]:
    data = _get_json(f"https://api.lever.co/v0/postings/{_check_slug(board)}", {"mode": "json"})
    if not isinstance(data, list):
        raise SourceError("Unexpected response from Lever")
    return [_lever_one(j, company) for j in data if j.get("id")]


def _ashby_one(raw: dict, company: str) -> NormalizedPosting:
    locations = [raw.get("location") or ""] + [s.get("location", "") for s in raw.get("secondaryLocations") or []]
    location = "; ".join(l for l in locations if l)
    if raw.get("isRemote") and not _REMOTE_RE.search(location):
        location = f"Remote - {location}" if location else "Remote"
    country = ((raw.get("address") or {}).get("postalAddress") or {}).get("addressCountry", "")
    return finish(
        NormalizedPosting(
            external_id=str(raw.get("id")),
            title=raw.get("title", ""),
            company=company,
            location=location,
            description=raw.get("descriptionPlain") or strip_html(raw.get("descriptionHtml", "")),
            posted_at=_parse_dt(raw.get("publishedAt")),
            apply_url=raw.get("applyUrl") or raw.get("jobUrl", ""),
            source_url=raw.get("jobUrl", ""),
        ),
        explicit_mode=raw.get("workplaceType", "") or ("remote" if raw.get("isRemote") else ""),
        country_hint=country,
        explicit_type=raw.get("employmentType", ""),
    )


def fetch_ashby(board: str, company: str) -> list[NormalizedPosting]:
    data = _get_json(f"https://api.ashbyhq.com/posting-api/job-board/{_check_slug(board)}")
    return [_ashby_one(j, company) for j in (data.get("jobs") or []) if j.get("id") and j.get("isListed", True)]


def _smartrecruiters_one(raw: dict, detail: dict | None, company: str) -> NormalizedPosting:
    loc = raw.get("location") or {}
    mode = "remote" if loc.get("remote") else ("hybrid" if loc.get("hybrid") else "")
    description = ""
    if detail:
        sections = (detail.get("jobAd") or {}).get("sections") or {}
        description = "\n\n".join(
            f"{s.get('title', '')}\n{strip_html(s.get('text', ''))}".strip()
            for key in ("jobDescription", "qualifications", "additionalInformation")
            if (s := sections.get(key)) and s.get("text")
        )
    posting_url = (detail or {}).get("postingUrl") or f"https://jobs.smartrecruiters.com/{raw.get('company', {}).get('identifier', '')}/{raw.get('id')}"
    return finish(
        NormalizedPosting(
            external_id=str(raw.get("id")),
            title=raw.get("name", ""),
            company=company,
            location=loc.get("fullLocation") or ", ".join(x for x in (loc.get("city"), loc.get("country")) if x),
            description=description,
            posted_at=_parse_dt(raw.get("releasedDate")),
            apply_url=(detail or {}).get("applyUrl") or posting_url,
            source_url=posting_url,
        ),
        explicit_mode=mode,
        country_hint=loc.get("country", ""),
        explicit_level=(raw.get("experienceLevel") or {}).get("label", ""),
        explicit_type=(raw.get("typeOfEmployment") or {}).get("label", ""),
    )


def fetch_smartrecruiters(board: str, company: str, known_ids: set[str] | None = None,
                          detail_budget: int = 60) -> list[NormalizedPosting]:
    """The list endpoint has no description; details are fetched for
    postings not seen before, up to detail_budget per sync, so one large
    board can't make a sync run for minutes."""
    board = _check_slug(board)
    known_ids = known_ids or set()
    items, offset = [], 0
    while True:
        data = _get_json(f"https://api.smartrecruiters.com/v1/companies/{board}/postings", {"limit": 100, "offset": offset})
        batch = data.get("content") or []
        items += batch
        offset += len(batch)
        if not batch or offset >= int(data.get("totalFound") or 0) or offset >= 1000:
            break
    out = []
    for raw in items:
        detail = None
        pid = str(raw.get("id") or "")
        if not ID_RE.match(pid):
            continue
        if pid not in known_ids and detail_budget > 0:
            detail_budget -= 1
            try:
                detail = _get_json(f"https://api.smartrecruiters.com/v1/companies/{board}/postings/{pid}")
            except SourceError:
                detail = None
        out.append(_smartrecruiters_one(raw, detail, company))
    return out


def _workable_one(raw: dict, company: str) -> NormalizedPosting:
    locs = raw.get("locations") or []
    location = "; ".join(
        ", ".join(x for x in (l.get("city"), l.get("region"), l.get("country")) if x) for l in locs
    ) or ", ".join(x for x in (raw.get("city"), raw.get("state"), raw.get("country")) if x)
    if raw.get("telecommuting") and not _REMOTE_RE.search(location):
        location = f"Remote - {location}" if location else "Remote"
    return finish(
        NormalizedPosting(
            external_id=str(raw.get("shortcode") or raw.get("id")),
            title=raw.get("title", ""),
            company=company,
            location=location,
            description=strip_html(raw.get("description", "")),
            posted_at=_parse_dt(raw.get("published_on") or raw.get("created_at")),
            apply_url=raw.get("application_url") or raw.get("url", ""),
            source_url=raw.get("url") or raw.get("shortlink", ""),
        ),
        explicit_mode="remote" if raw.get("telecommuting") else "",
        country_hint=(locs[0].get("countryCode") if locs else "") or "",
        explicit_level=raw.get("experience", ""),
        explicit_type=raw.get("employment_type", ""),
    )


def fetch_workable(board: str, company: str) -> list[NormalizedPosting]:
    data = _get_json(f"https://apply.workable.com/api/v1/widget/accounts/{_check_slug(board)}", {"details": "true"})
    return [_workable_one(j, company) for j in (data.get("jobs") or []) if j.get("shortcode") or j.get("id")]


def fetch_board(kind: str, board: str, company: str, known_ids: set[str] | None = None) -> list[NormalizedPosting]:
    if kind == "greenhouse":
        return fetch_greenhouse(board, company)
    if kind == "lever":
        return fetch_lever(board, company)
    if kind == "ashby":
        return fetch_ashby(board, company)
    if kind == "smartrecruiters":
        return fetch_smartrecruiters(board, company, known_ids)
    if kind == "workable":
        return fetch_workable(board, company)
    raise SourceError(f"Unsupported source type: {kind}")


# --- Pasted job links --------------------------------------------------------

# Exact hostnames only; matching is on the parsed hostname, never on a
# substring of the URL, so "boards.greenhouse.io.evil.com" or
# "evil.com/boards.greenhouse.io/..." can't pass.
_URL_PATTERNS = {
    "boards.greenhouse.io": ("greenhouse", re.compile(r"^/([^/]+)/jobs/(\d+)/?$")),
    "job-boards.greenhouse.io": ("greenhouse", re.compile(r"^/([^/]+)/jobs/(\d+)/?$")),
    "job-boards.eu.greenhouse.io": ("greenhouse", re.compile(r"^/([^/]+)/jobs/(\d+)/?$")),
    "jobs.lever.co": ("lever", re.compile(r"^/([^/]+)/([0-9a-fA-F-]{36})(?:/apply)?/?$")),
    "jobs.ashbyhq.com": ("ashby", re.compile(r"^/([^/]+)/([0-9a-fA-F-]{36})(?:/application)?/?$")),
    "jobs.smartrecruiters.com": ("smartrecruiters", re.compile(r"^/([^/]+)/(\d+)(?:-[^/]*)?/?$")),
    "apply.workable.com": ("workable", re.compile(r"^/([^/]+)/j/([A-Za-z0-9]+)/?$")),
}


def parse_posting_url(url: str) -> tuple[str, str, str]:
    """Recognise a public job-board posting link and return (kind, board,
    posting id). Anything else is rejected; the URL itself is never
    requested."""
    if not isinstance(url, str) or len(url) > 2000:
        raise SourceError("Paste a link to a single job posting")
    try:
        parts = urlsplit(url.strip())
        port = parts.port
    except ValueError as exc:
        raise SourceError("That doesn't look like a valid link") from exc
    if parts.scheme != "https":
        raise SourceError("Only https job links are supported")
    if parts.username or parts.password or port not in (None, 443):
        raise SourceError("That link isn't a supported job board")
    host = (parts.hostname or "").rstrip(".").lower()
    if host not in _URL_PATTERNS:
        raise SourceError(
            "Only Greenhouse, Lever, Ashby, SmartRecruiters and Workable job links can be imported. "
            "For anything else, paste the job description instead."
        )
    kind, pattern = _URL_PATTERNS[host]
    m = pattern.match(parts.path)
    if not m:
        raise SourceError("That link isn't a single job posting")
    board, posting_id = m.group(1), m.group(2)
    if not SLUG_RE.match(board) or not ID_RE.match(posting_id):
        raise SourceError("That link isn't a single job posting")
    return kind, board, posting_id


def fetch_single_posting(kind: str, board: str, posting_id: str) -> NormalizedPosting:
    """One posting, for the "import a job link" flow. Company name comes
    from the board itself where the API exposes it."""
    _check_slug(board)
    if not ID_RE.match(posting_id):
        raise SourceError("Invalid posting id")
    if kind == "greenhouse":
        raw = _get_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{posting_id}")
        try:
            company = _get_json(f"https://boards-api.greenhouse.io/v1/boards/{board}").get("name") or board
        except SourceError:
            company = board
        return _greenhouse_one(raw, company)
    if kind == "lever":
        raw = _get_json(f"https://api.lever.co/v0/postings/{board}/{posting_id}", {"mode": "json"})
        return _lever_one(raw, board)
    if kind == "ashby":
        for posting in fetch_ashby(board, board):
            if posting.external_id == posting_id:
                return posting
        raise SourceError("That posting is no longer listed")
    if kind == "smartrecruiters":
        detail = _get_json(f"https://api.smartrecruiters.com/v1/companies/{board}/postings/{posting_id}")
        return _smartrecruiters_one(detail, detail, (detail.get("company") or {}).get("name") or board)
    if kind == "workable":
        data = _get_json(f"https://apply.workable.com/api/v1/widget/accounts/{board}", {"details": "true"})
        for raw in data.get("jobs") or []:
            if raw.get("shortcode") == posting_id:
                return _workable_one(raw, data.get("name") or board)
        raise SourceError("That posting is no longer listed")
    raise SourceError("Unsupported job board")
