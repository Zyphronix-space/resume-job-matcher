"""
Keeps job_postings in step with the registered sources (job_sources.py).

A sync of one source:
  - inserts postings it hasn't seen, keyed by (source, external id);
  - refreshes postings it still lists and stamps last_verified_at, so the
    UI can say when a vacancy was last confirmed open;
  - marks postings the source no longer lists as expired (closed_at set),
    instead of deleting them: tracked jobs keep pointing at a real record;
  - flags cross-source duplicates (same company + title + location) with
    duplicate_of, and search hides them.

A failed fetch changes nothing except the source's last_status/last_error,
so a temporary outage never expires a whole board.
"""

import hashlib
import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy.orm import Session

import db_models
from job_sources import KINDS, NormalizedPosting, SourceError, fetch_board


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _norm(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    value = re.sub(r"\(.*?\)", " ", value.lower())
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def dedupe_key(company: str, title: str, location: str) -> str:
    raw = "|".join((_norm(company), _norm(title), _norm(location)))
    return hashlib.sha256(raw.encode()).hexdigest()


def _apply(posting: db_models.JobPosting, item: NormalizedPosting) -> None:
    for name in ("title", "company", "location", "country", "work_mode", "employment_type",
                 "experience_level", "open_to_sri_lanka", "description", "skills", "apply_url", "source_url"):
        setattr(posting, name, getattr(item, name))
    if item.posted_at:
        posting.posted_at = item.posted_at
    posting.dedupe_key = dedupe_key(item.company, item.title, item.location)


def _mark_duplicate(db: Session, posting: db_models.JobPosting) -> None:
    original = (
        db.query(db_models.JobPosting)
        .filter(
            db_models.JobPosting.dedupe_key == posting.dedupe_key,
            db_models.JobPosting.id != posting.id,
            db_models.JobPosting.status == "active",
            db_models.JobPosting.duplicate_of.is_(None),
        )
        .order_by(db_models.JobPosting.first_seen_at.asc())
        .first()
    )
    posting.duplicate_of = original.id if original else None


def upsert_postings(db: Session, source: db_models.JobSource, items: list[NormalizedPosting]) -> dict:
    now = _now()
    existing = {
        p.external_id: p
        for p in db.query(db_models.JobPosting).filter_by(source_id=source.id).all()
    }
    seen, added, updated, reopened = set(), 0, 0, 0
    for item in items:
        if not item.external_id or not item.title or item.external_id in seen:
            continue
        seen.add(item.external_id)
        posting = existing.get(item.external_id)
        if posting is None:
            posting = db_models.JobPosting(source_id=source.id, external_id=item.external_id, first_seen_at=now)
            _apply(posting, item)
            db.add(posting)
            db.flush()
            added += 1
        else:
            if posting.status != "active":
                reopened += 1
            _apply(posting, item)
            updated += 1
        posting.status = "active"
        posting.closed_at = None
        posting.last_verified_at = now
        _mark_duplicate(db, posting)

    expired = 0
    for external_id, posting in existing.items():
        if external_id not in seen and posting.status == "active":
            posting.status = "expired"
            posting.closed_at = now
            expired += 1
    return {"added": added, "updated": updated, "reopened": reopened, "expired": expired, "listed": len(seen)}


def sync_source(db: Session, source: db_models.JobSource) -> dict:
    """Fetch one source and reconcile its postings. Commits either way;
    raises nothing, the outcome is recorded on the source row."""
    if source.kind not in KINDS:
        return {"status": "skipped", "reason": "manual sources are curated by hand"}
    known = {
        p.external_id for p in db.query(db_models.JobPosting.external_id).filter_by(source_id=source.id).all()
    }
    try:
        items = fetch_board(source.kind, source.board, source.company, known_ids=known)
        result = upsert_postings(db, source, items)
        source.last_status, source.last_error, source.last_count = "ok", "", result["listed"]
    except SourceError as exc:
        db.rollback()
        result = {"error": str(exc)}
        source.last_status, source.last_error = "error", str(exc)[:1000]
    source.last_synced_at = _now()
    db.commit()
    return {"status": source.last_status, **result}


def expire_past_deadlines(db: Session) -> int:
    """Postings with a stated closing date that has passed (mostly manual
    ones) become expired even if nobody re-syncs them."""
    now = _now()
    rows = (
        db.query(db_models.JobPosting)
        .filter(db_models.JobPosting.status == "active", db_models.JobPosting.expires_at.isnot(None))
        .all()
    )
    count = 0
    for posting in rows:
        expires = posting.expires_at if posting.expires_at.tzinfo else posting.expires_at.replace(tzinfo=timezone.utc)
        if expires < now:
            posting.status, posting.closed_at = "expired", now
            count += 1
    if count:
        db.commit()
    return count


def get_or_create_manual_source(db: Session) -> db_models.JobSource:
    source = db.query(db_models.JobSource).filter_by(kind="manual", board="").first()
    if not source:
        source = db_models.JobSource(
            kind="manual", board="", company="Curated by ResumeMatch",
            notes="Vacancies an admin entered by hand from the employer's own published advert. "
                  "Each one must carry the original advert's URL.",
            last_status="ok",
        )
        db.add(source)
        db.flush()
    return source


# Boards verified on 2026-10-27 by calling each public API and checking the
# employer named in the results. Hutch (Workable "hutch") was rejected in
# that check: it's a UK games studio, not Hutch Sri Lanka. A source belongs
# here only once someone has done the same check.
SEED_SOURCES = [
    {
        "kind": "greenhouse", "board": "canonical", "company": "Canonical", "website": "https://canonical.com/careers",
        "notes": "Public Greenhouse Job Board API. Many roles are 'Home based - Worldwide' or APAC, "
                 "including graduate and junior engineering roles; most others are senior.",
    },
    {
        "kind": "smartrecruiters", "board": "fortude", "company": "Fortude", "website": "https://fortude.co/careers",
        "notes": "Sri Lanka-founded company. Public SmartRecruiters Posting API. On 2026-10-27 its two "
                 "listed roles were in Bangkok, one first published in 2018.",
    },
    {
        "kind": "greenhouse", "board": "wikimedia", "company": "Wikimedia Foundation",
        "website": "https://wikimediafoundation.org/about/jobs/",
        "notes": "Public Greenhouse Job Board API. Remote roles; country eligibility is stated in each posting.",
    },
    {
        "kind": "greenhouse", "board": "gitlab", "company": "GitLab", "website": "https://about.gitlab.com/jobs/",
        "notes": "Public Greenhouse Job Board API. Remote, but most roles name specific countries.",
    },
    {
        "kind": "ashby", "board": "posthog", "company": "PostHog", "website": "https://posthog.com/careers",
        "notes": "Public Ashby Posting API. Remote roles, mostly limited to EMEA/Americas time zones.",
    },
]


def seed_sources(db: Session) -> list[db_models.JobSource]:
    created = []
    for entry in SEED_SOURCES:
        if not db.query(db_models.JobSource).filter_by(kind=entry["kind"], board=entry["board"]).first():
            source = db_models.JobSource(**entry)
            db.add(source)
            created.append(source)
    db.commit()
    return created
