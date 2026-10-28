"""
Sign-up / sign-in / profile / password-reset / account-deletion routes.
Signing up never grants admin (see admin_bootstrap.py): every account
starts as a regular recruiter or candidate, per the role chosen at signup.
Every route that takes a password or a reset token is throttled (account.py).
Changing or resetting a password ends every existing session.
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

import account
import db_models
from auth import create_access_token, get_current_user, hash_password, revoke_sessions, verify_password
from auth_models import (
    ChangePasswordIn, DeleteAccountIn, ForgotPasswordIn, ForgotPasswordOut, LoginIn, ProfileUpdateIn,
    ResetPasswordIn, SignupIn, TokenOut, UserOut,
)
from database import as_utc, get_db

router = APIRouter(prefix="/auth", tags=["auth"])

RESET_TOKEN_LIFETIME = timedelta(hours=1)


@router.post("/signup", response_model=TokenOut)
def signup(payload: SignupIn, request: Request, db: Session = Depends(get_db)):
    ip_key = f"signup:{account.client_ip(request)}"
    account.enforce_limit(db, ip_key, account.SIGNUP_WINDOW, account.SIGNUP_MAX_PER_IP,
                          "Too many new accounts from this network. Try again later.")

    email = payload.email.lower()
    existing = db.query(db_models.User).filter_by(email=email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    password_hash, salt = hash_password(payload.password)
    user = db_models.User(
        email=email,
        password_hash=password_hash,
        password_salt=salt,
        role=payload.role,
        is_admin=False,  # never granted at signup; see admin_bootstrap.py
        full_name=payload.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    account.record(db, ip_key)

    return TokenOut(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower()
    email_key, ip_key = f"login:{email}", f"login-ip:{account.client_ip(request)}"
    message = "Too many failed sign-in attempts. Wait 15 minutes and try again."
    account.enforce_limit(db, email_key, account.LOGIN_WINDOW, account.LOGIN_MAX_PER_EMAIL, message)
    account.enforce_limit(db, ip_key, account.LOGIN_WINDOW, account.LOGIN_MAX_PER_IP, message)

    user = db.query(db_models.User).filter_by(email=email).first()
    if not user or not verify_password(payload.password, user.password_hash, user.password_salt):
        account.record(db, email_key, ip_key)
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    account.clear(db, email_key)
    return TokenOut(access_token=create_access_token(user), user=UserOut.model_validate(user))


@router.post("/delete-account")
def delete_account(
    payload: DeleteAccountIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes the signed-in account and everything it owns: resumes (the
    stored PDFs), profile, tracker, drafts, applications, and for a
    recruiter their jobs. Requires the current password, so a stolen
    session token alone can't erase an account."""
    _check_current_password(db, user, payload.password, "Password is incorrect")
    if user.is_admin and db.query(db_models.User).filter_by(is_admin=True).count() == 1 \
            and db.query(db_models.User).count() > 1:
        raise HTTPException(status_code=400, detail="You're the only admin. Make someone else an admin first.")
    account.delete_user_data(db, user)
    db.commit()
    return {"deleted": True}


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


def _check_current_password(db: Session, user: db_models.User, password: str, message: str) -> None:
    key = f"password-check:{user.id}"
    account.enforce_limit(db, key, account.PASSWORD_CHECK_WINDOW, account.PASSWORD_CHECK_MAX_PER_USER,
                          "Too many incorrect passwords. Wait 15 minutes and try again.")
    if not verify_password(password, user.password_hash, user.password_salt):
        account.record(db, key)
        raise HTTPException(status_code=400, detail=message)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordIn,
    user: db_models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ends every other session (a token someone else holds stops working)
    and returns a fresh token so this browser stays signed in."""
    _check_current_password(db, user, payload.current_password, "Current password is incorrect")
    password_hash, salt = hash_password(payload.new_password)
    user.password_hash, user.password_salt = password_hash, salt
    revoke_sessions(user)
    db.commit()
    db.refresh(user)
    return {"updated": True, "access_token": create_access_token(user)}


@router.post("/forgot-password", response_model=ForgotPasswordOut)
def forgot_password(payload: ForgotPasswordIn, request: Request, db: Session = Depends(get_db)):
    # No email service is configured, so a reset token can only reach the
    # user by being returned in this response. Doing that for any caller
    # who types an email address would let anyone take over any account,
    # so it's opt-in for local demos only (PASSWORD_RESET_DEMO_MODE=1) and
    # must never be enabled on a public deployment. Either way the response
    # is identical for registered and unknown emails.
    ip_key, email_key = f"forgot-ip:{account.client_ip(request)}", f"forgot:{payload.email.lower()}"
    message = "Too many reset requests. Try again later."
    account.enforce_limit(db, ip_key, account.FORGOT_WINDOW, account.FORGOT_MAX_PER_IP, message)
    account.enforce_limit(db, email_key, account.FORGOT_WINDOW, account.FORGOT_MAX_PER_EMAIL, message)
    account.record(db, ip_key, email_key)

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
def reset_password(payload: ResetPasswordIn, request: Request, db: Session = Depends(get_db)):
    ip_key = f"reset-ip:{account.client_ip(request)}"
    account.enforce_limit(db, ip_key, account.RESET_WINDOW, account.RESET_MAX_PER_IP,
                          "Too many reset attempts. Wait 15 minutes and try again.")
    reset = db.query(db_models.PasswordResetToken).filter_by(token=payload.token[:64]).first()
    if not reset or reset.used or as_utc(reset.expires_at) < datetime.now(timezone.utc):
        account.record(db, ip_key)
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
    revoke_sessions(user)
    db.commit()
    return {"updated": True}
