"""
Account-level rules shared by several routers: throttling of the auth
routes, and deleting everything an account owns. (Who becomes the first
admin is admin_bootstrap.py; signing up never grants it.)
"""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

import db_models

# --- Throttling ----------------------------------------------------------------

LOGIN_WINDOW = timedelta(minutes=15)
LOGIN_MAX_PER_EMAIL = 8
LOGIN_MAX_PER_IP = 30
SIGNUP_WINDOW = timedelta(hours=1)
SIGNUP_MAX_PER_IP = 10
# Wrong current password on change-password / delete-account, per account:
# a stolen session token shouldn't be a password-guessing oracle.
PASSWORD_CHECK_WINDOW = timedelta(minutes=15)
PASSWORD_CHECK_MAX_PER_USER = 5
RESET_WINDOW = timedelta(minutes=15)
RESET_MAX_PER_IP = 10
FORGOT_WINDOW = timedelta(hours=1)
FORGOT_MAX_PER_IP = 10
FORGOT_MAX_PER_EMAIL = 3
# Imports read an external job board on the server's behalf.
IMPORT_WINDOW = timedelta(hours=1)
IMPORT_MAX_PER_USER = 30

# These limits count rows in auth_attempts, then add one: two requests in
# the same instant can both pass the check, so a burst can exceed a limit
# by the number of concurrent requests. They bound sustained guessing, not
# single bursts; Vercel's own DDoS protection covers floods.


def client_ip(request: Request) -> str:
    # Vercel sets x-real-ip / x-forwarded-for at its edge, overwriting what
    # the client sent, so the first hop is the real client there.
    forwarded = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip()
    return ip or (request.client.host if request.client else "unknown")


def _recent(db: Session, key: str, window: timedelta) -> int:
    since = (datetime.now(timezone.utc) - window).replace(tzinfo=None)
    return db.query(db_models.AuthAttempt).filter(
        db_models.AuthAttempt.key == key, db_models.AuthAttempt.at >= since,
    ).count()


def enforce_limit(db: Session, key: str, window: timedelta, limit: int, message: str) -> None:
    if _recent(db, key, window) >= limit:
        raise HTTPException(status_code=429, detail=message)


def record(db: Session, *keys: str) -> None:
    for key in keys:
        db.add(db_models.AuthAttempt(key=key[:191]))
    # Keep the table small: anything older than a day can't affect a limit.
    cutoff = (datetime.now(timezone.utc) - timedelta(days=1)).replace(tzinfo=None)
    db.query(db_models.AuthAttempt).filter(db_models.AuthAttempt.at < cutoff).delete(synchronize_session=False)
    db.commit()


def clear(db: Session, key: str) -> None:
    db.query(db_models.AuthAttempt).filter_by(key=key[:191]).delete(synchronize_session=False)
    db.commit()


# --- Deletion --------------------------------------------------------------------

def delete_user_data(db: Session, user: db_models.User) -> None:
    """Remove an account and everything it owns. ORM objects are deleted
    one at a time so relationship cascades (events, notes, documents)
    fire; the caller commits."""
    for tracked in db.query(db_models.TrackedJob).filter_by(user_id=user.id).all():
        db.delete(tracked)
    profile = db.query(db_models.CandidateProfile).filter_by(user_id=user.id).first()
    if profile:
        db.delete(profile)
    for job in db.query(db_models.Job).filter_by(recruiter_id=user.id).all():
        db.delete(job)
    db.flush()
    for note in db.query(db_models.Note).filter_by(author_id=user.id).all():
        db.delete(note)
    for application in db.query(db_models.Application).filter_by(candidate_id=user.id).all():
        db.delete(application)
    db.flush()
    for resume in db.query(db_models.Resume).filter_by(candidate_id=user.id).all():
        db.delete(resume)
    db.query(db_models.PasswordResetToken).filter_by(user_id=user.id).delete(synchronize_session=False)
    db.query(db_models.AuthAttempt).filter(
        db_models.AuthAttempt.key.in_([f"login:{user.email}", f"forgot:{user.email}", f"password-check:{user.id}", f"import:{user.id}"])
    ).delete(synchronize_session=False)
    db.flush()
    db.delete(user)
