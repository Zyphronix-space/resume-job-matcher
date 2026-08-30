"""
CRUD routes for everything that used to live in the browser's localStorage:
saved internships, tracked applications (with a status timeline),
preferences, and resume-analysis history. All backed by the SQLite database
in database.py, and all scoped to the signed-in user via get_current_user —
every query below filters by user_id, so one account can never see or
modify another's data.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import db_models
from auth import get_current_user
from database import get_db
from user_data_models import (
    ApplicationCreateIn,
    ApplicationOut,
    ApplicationStatusIn,
    ApplicationUpdateIn,
    HistoryEntryIn,
    HistoryEntryOut,
    PreferencesIn,
    PreferencesOut,
    SavedJobIn,
    SavedJobOut,
)

router = APIRouter()

MAX_HISTORY_ENTRIES = 20

STATUS_EVENT_LABELS = {
    "Interested": "Saved",
    "Preparing": "Application prepared",
    "Applied": "Applied",
    "Interview": "Interview",
    "Rejected": "Rejected",
    "Offer": "Offer",
}


# --- Saved jobs ----------------------------------------------------------

@router.get("/saved-jobs", response_model=list[SavedJobOut])
def list_saved_jobs(user: db_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(db_models.SavedJob)
        .filter_by(user_id=user.id)
        .order_by(db_models.SavedJob.saved_at.desc())
        .all()
    )


@router.post("/saved-jobs", response_model=SavedJobOut)
def save_job(payload: SavedJobIn, user: db_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(db_models.SavedJob).filter_by(user_id=user.id, job_id=payload.job_id).first()
    if existing:
        return existing

    row = db_models.SavedJob(user_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/saved-jobs/{job_id}")
def remove_saved_job(job_id: str, user: db_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(db_models.SavedJob).filter_by(user_id=user.id, job_id=job_id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"removed": bool(row)}


# --- Applications ----------------------------------------------------------

@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(user: db_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(db_models.Application)
        .filter_by(user_id=user.id)
        .order_by(db_models.Application.created_at.desc())
        .all()
    )


@router.post("/applications", response_model=ApplicationOut)
def ensure_application(
    payload: ApplicationCreateIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(db_models.Application).filter_by(user_id=user.id, job_id=payload.job_id).first()
    if existing:
        return existing

    row = db_models.Application(user_id=user.id, **payload.model_dump(), status="Preparing")
    row.events.append(db_models.ApplicationEvent(label=STATUS_EVENT_LABELS["Preparing"]))
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _get_own_application(application_id: str, user: db_models.User, db: Session) -> db_models.Application:
    row = db.query(db_models.Application).filter_by(id=application_id, user_id=user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    return row


@router.patch("/applications/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: str,
    payload: ApplicationUpdateIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _get_own_application(application_id, user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/applications/{application_id}/status", response_model=ApplicationOut)
def change_application_status(
    application_id: str,
    payload: ApplicationStatusIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = _get_own_application(application_id, user, db)
    row.status = payload.status
    label = STATUS_EVENT_LABELS.get(payload.status, payload.status)
    row.events.append(db_models.ApplicationEvent(label=label, date=datetime.now(timezone.utc)))
    db.commit()
    db.refresh(row)
    return row


@router.delete("/applications/{application_id}")
def remove_application(
    application_id: str,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(db_models.Application).filter_by(id=application_id, user_id=user.id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"removed": bool(row)}


# --- Preferences ----------------------------------------------------------

@router.get("/preferences", response_model=PreferencesOut)
def get_preferences(user: db_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(db_models.Preference).filter_by(user_id=user.id).first()
    if not row:
        row = db_models.Preference(user_id=user.id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.put("/preferences", response_model=PreferencesOut)
def set_preferences(
    payload: PreferencesIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(db_models.Preference).filter_by(user_id=user.id).first()
    if not row:
        row = db_models.Preference(user_id=user.id)
        db.add(row)

    for field, value in payload.model_dump().items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


# --- Analysis history ----------------------------------------------------------

@router.get("/history", response_model=list[HistoryEntryOut])
def list_history(user: db_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(db_models.AnalysisHistoryEntry)
        .filter_by(user_id=user.id)
        .order_by(db_models.AnalysisHistoryEntry.created_at.desc())
        .limit(MAX_HISTORY_ENTRIES)
        .all()
    )


@router.post("/history", response_model=HistoryEntryOut)
def add_history_entry(
    payload: HistoryEntryIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db_models.AnalysisHistoryEntry(user_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()

    stale_ids = [
        r.id
        for r in db.query(db_models.AnalysisHistoryEntry)
        .filter_by(user_id=user.id)
        .order_by(db_models.AnalysisHistoryEntry.created_at.desc())
        .offset(MAX_HISTORY_ENTRIES)
        .all()
    ]
    if stale_ids:
        db.query(db_models.AnalysisHistoryEntry).filter(
            db_models.AnalysisHistoryEntry.id.in_(stale_ids)
        ).delete(synchronize_session=False)
        db.commit()

    db.refresh(row)
    return row


@router.delete("/history")
def clear_history(user: db_models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(db_models.AnalysisHistoryEntry).filter_by(user_id=user.id).delete()
    db.commit()
    return {"cleared": True}
