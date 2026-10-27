"""
Sign-up / sign-in / profile / password-reset routes. The first account ever
created on a given database becomes an admin automatically (there's no
admin to promote one otherwise) — every account after that starts as a
regular (non-admin) recruiter or candidate, per the role chosen at signup.
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import db_models
from auth import create_access_token, get_current_user, hash_password, verify_password
from auth_models import (
    ChangePasswordIn, ForgotPasswordIn, ForgotPasswordOut, LoginIn, ProfileUpdateIn,
    ResetPasswordIn, SignupIn, TokenOut, UserOut,
)
from database import as_utc, get_db

router = APIRouter(prefix="/auth", tags=["auth"])

RESET_TOKEN_LIFETIME = timedelta(hours=1)


@router.post("/signup", response_model=TokenOut)
def signup(payload: SignupIn, db: Session = Depends(get_db)):
    existing = db.query(db_models.User).filter_by(email=payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    is_first_user = db.query(db_models.User).count() == 0
    password_hash, salt = hash_password(payload.password)
    user = db_models.User(
        email=payload.email.lower(),
        password_hash=password_hash,
        password_salt=salt,
        role=payload.role,
        is_admin=is_first_user,
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(db_models.User).filter_by(email=payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash, user.password_salt):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: db_models.User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_profile(
    payload: ProfileUpdateIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash, user.password_salt):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    password_hash, salt = hash_password(payload.new_password)
    user.password_hash, user.password_salt = password_hash, salt
    db.commit()
    return {"updated": True}


@router.post("/forgot-password", response_model=ForgotPasswordOut)
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    # No email service is configured, so a reset token can only reach the
    # user by being returned in this response. Doing that for any caller
    # who types an email address would let anyone take over any account,
    # so it's opt-in for local demos only (PASSWORD_RESET_DEMO_MODE=1) and
    # must never be enabled on a public deployment. Either way the response
    # is identical for registered and unknown emails.
    if os.environ.get("PASSWORD_RESET_DEMO_MODE") != "1":
        return ForgotPasswordOut(
            reset_token=None,
            detail="Self-service password reset isn't available on this deployment. "
                   "Contact the site owner to recover your account.",
        )

    user = db.query(db_models.User).filter_by(email=payload.email.lower()).first()
    if not user:
        return ForgotPasswordOut(reset_token=None, detail="Demo mode: if that account exists, its reset link is shown here.")

    reset = db_models.PasswordResetToken(
        user_id=user.id, expires_at=datetime.now(timezone.utc) + RESET_TOKEN_LIFETIME,
    )
    db.add(reset)
    db.commit()

    return ForgotPasswordOut(
        reset_token=reset.token,
        detail="Demo mode: if that account exists, its reset link is shown here.",
    )


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    reset = db.query(db_models.PasswordResetToken).filter_by(token=payload.token).first()
    if not reset or reset.used or as_utc(reset.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    user = db.query(db_models.User).filter_by(id=reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    # Claim the token with a conditional UPDATE rather than trusting the read
    # above: two concurrent requests can both see used=False, but only one
    # of them can flip it, so a token resets the password at most once.
    # Claiming every unused token for this user also retires older links.
    claimed = (
        db.query(db_models.PasswordResetToken)
        .filter_by(token=reset.token, used=False)
        .update({"used": True}, synchronize_session=False)
    )
    if claimed != 1:
        db.rollback()
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")
    db.query(db_models.PasswordResetToken).filter_by(user_id=user.id, used=False).update(
        {"used": True}, synchronize_session=False,
    )

    password_hash, salt = hash_password(payload.new_password)
    user.password_hash, user.password_salt = password_hash, salt
    db.commit()
    return {"updated": True}
