"""
Admin: the job-source registry and hand-curated vacancies.

Adding a board fetches it once first and returns a preview of what it
lists, so the admin can check it's really the employer they meant (the
Workable account "hutch", for example, is a UK games studio, not Hutch
Sri Lanka). A board that can't be read isn't saved.

GET /internal/cron/sync-sources re-syncs every enabled board. It exists
only when CRON_SECRET is set, and requires it as a bearer token (the way
Vercel Cron calls an endpoint); otherwise it's a 404.
"""

import hmac
import os
from datetime import date, datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

import db_models
from auth import get_current_admin
from database import as_utc, get_db
from job_ingest import dedupe_key, get_or_create_manual_source, seed_sources, sync_source
from job_sources import KINDS, SLUG_RE, SourceError, _safe_url, fetch_board, finish, NormalizedPosting

router = APIRouter(prefix="/admin", tags=["admin-sources"], dependencies=[Depends(get_current_admin)])
cron_router = APIRouter(tags=["cron"])


class SourceIn(BaseModel):
    kind: Literal["greenhouse", "lever", "ashby", "smartrecruiters", "workable"]
    board: str = Field(min_length=1, max_length=100)
    company: str = Field(min_length=1, max_length=200)
    website: str = Field("", max_length=500)
    notes: str = Field("", max_length=2000)

    @field_validator("board")
    @classmethod
    def _board(cls, value: str) -> str:
        if not SLUG_RE.match(value):
            raise ValueError("Board names are letters, numbers, - and _")
        return value


class SourceUpdateIn(BaseModel):
    enabled: Optional[bool] = None
    company: Optional[str] = Field(None, min_length=1, max_length=200)
    website: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)


class ManualPostingIn(BaseModel):
    title: str = Field(min_length=2, max_length=300)
    company: str = Field(min_length=1, max_length=200)
    location: str = Field("", max_length=500)
    description: str = Field(min_length=20, max_length=30000)
    apply_url: str = Field(min_length=8, max_length=1000)
    source_url: str = Field(min_length=8, max_length=1000)
    work_mode: Literal["Remote", "Hybrid", "On-site", "Unspecified"] = "Unspecified"
    employment_type: str = Field("", max_length=40)
    posted_on: Optional[date] = None
    closes_on: Optional[date] = None

    @field_validator("apply_url", "source_url")
    @classmethod
    def _url(cls, value: str) -> str:
        if not _safe_url(value):
            raise ValueError("Use the full http(s) link to the employer's own advert")
        return value


class PostingStatusIn(BaseModel):
    status: Literal["active", "expired"]


def _iso(dt):
    return as_utc(dt).isoformat() if dt else None


def _source_out(s: db_models.JobSource, db: Session) -> dict:
    active = db.query(db_models.JobPosting).filter_by(source_id=s.id, status="active").count()
    return {
        "id": s.id, "kind": s.kind, "board": s.board, "company": s.company, "website": s.website or "",
        "enabled": bool(s.enabled), "notes": s.notes or "", "last_synced_at": _iso(s.last_synced_at),
        "last_status": s.last_status, "last_error": s.last_error or "", "last_count": s.last_count or 0,
        "active_postings": active,
    }


@router.get("/sources")
def list_sources(db: Session = Depends(get_db)):
    return [_source_out(s, db) for s in db.query(db_models.JobSource).order_by(db_models.JobSource.company).all()]


@router.post("/sources")
def add_source(payload: SourceIn, db: Session = Depends(get_db)):
    if db.query(db_models.JobSource).filter_by(kind=payload.kind, board=payload.board).first():
        raise HTTPException(status_code=400, detail="That board is already registered")
    try:
        items = fetch_board(payload.kind, payload.board, payload.company)
    except SourceError as exc:
        raise HTTPException(status_code=400, detail=f"Couldn't read that board: {exc}") from exc
    source = db_models.JobSource(**payload.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    return {
        "source": _source_out(source, db),
        "preview": [{"title": i.title, "location": i.location} for i in items[:8]],
        "listed": len(items),
        "message": "Saved but not synced. Check the preview is this employer's own openings, then sync.",
    }


@router.patch("/sources/{source_id}")
def update_source(source_id: int, payload: SourceUpdateIn, db: Session = Depends(get_db)):
    source = db.query(db_models.JobSource).filter_by(id=source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(source, key, value)
    if payload.enabled is False:
        # A disabled board's postings stop being shown as open: nobody is
        # checking them any more.
        db.query(db_models.JobPosting).filter_by(source_id=source.id, status="active").update(
            {"status": "expired", "closed_at": datetime.now(timezone.utc)}
        )
    db.commit()
    return _source_out(source, db)


@router.post("/sources/{source_id}/sync")
def sync_one(source_id: int, db: Session = Depends(get_db)):
    source = db.query(db_models.JobSource).filter_by(id=source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    if not source.enabled:
        raise HTTPException(status_code=400, detail="Enable the source before syncing it")
    return {"result": sync_source(db, source), "source": _source_out(source, db)}


def sync_all(db: Session) -> list[dict]:
    out = []
    for source in db.query(db_models.JobSource).filter(
        db_models.JobSource.enabled.is_(True), db_models.JobSource.kind.in_(KINDS)
    ).all():
        out.append({"source": source.company, **sync_source(db, source)})
    return out


@router.post("/sources/sync-all")
def sync_all_route(db: Session = Depends(get_db)):
    return {"results": sync_all(db)}


@router.post("/sources/seed")
def seed(db: Session = Depends(get_db)):
    created = seed_sources(db)
    return {"created": [s.company for s in created]}


@router.post("/postings")
def add_manual_posting(payload: ManualPostingIn, db: Session = Depends(get_db)):
    """A vacancy copied by hand from an employer's own published advert.
    source_url must point at that advert, so it can always be checked."""
    source = get_or_create_manual_source(db)
    item = finish(
        NormalizedPosting(
            external_id=f"manual-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
            title=payload.title, company=payload.company, location=payload.location,
            description=payload.description, apply_url=payload.apply_url, source_url=payload.source_url,
            posted_at=datetime(payload.posted_on.year, payload.posted_on.month, payload.posted_on.day, tzinfo=timezone.utc)
            if payload.posted_on else None,
        ),
        explicit_mode=payload.work_mode if payload.work_mode != "Unspecified" else "",
        explicit_type=payload.employment_type,
    )
    posting = db_models.JobPosting(
        source_id=source.id, external_id=item.external_id,
        dedupe_key=dedupe_key(item.company, item.title, item.location),
        **{k: getattr(item, k) for k in ("title", "company", "location", "country", "work_mode", "employment_type",
                                         "experience_level", "open_to_sri_lanka", "description", "skills",
                                         "posted_at", "apply_url", "source_url")},
        expires_at=datetime(payload.closes_on.year, payload.closes_on.month, payload.closes_on.day, 23, 59,
                            tzinfo=timezone.utc) if payload.closes_on else None,
    )
    db.add(posting)
    db.commit()
    db.refresh(posting)
    return {"id": posting.id, "title": posting.title, "status": posting.status}


@router.patch("/postings/{posting_id}")
def set_posting_status(posting_id: str, payload: PostingStatusIn, db: Session = Depends(get_db)):
    posting = db.query(db_models.JobPosting).filter_by(id=posting_id).first()
    if not posting:
        raise HTTPException(status_code=404, detail="Job not found")
    posting.status = payload.status
    posting.closed_at = datetime.now(timezone.utc) if payload.status == "expired" else None
    if payload.status == "active":
        posting.last_verified_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": posting.id, "status": posting.status}


@cron_router.get("/internal/cron/sync-sources")
def cron_sync(authorization: str = Header(""), db: Session = Depends(get_db)):
    secret = os.environ.get("CRON_SECRET", "")
    if not secret:
        raise HTTPException(status_code=404, detail="Not Found")
    if not hmac.compare_digest(authorization.encode(), f"Bearer {secret}".encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"results": sync_all(db)}
