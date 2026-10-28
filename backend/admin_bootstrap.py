"""
Making the first admin.

Signing up never grants admin, on any deployment. Historically the first
account ever created became admin, which on a public site hands the admin
panel to whoever signs up first; granting it to whoever signs up with
ADMIN_BOOTSTRAP_EMAIL isn't safe either, because this app can't verify that
someone owns an email address (it sends no email).

Instead an operator promotes an existing account from a shell that already
has the production DATABASE_URL:

    ADMIN_BOOTSTRAP_EMAIL=owner@example.com python admin_bootstrap.py

The command asks for that account's password, so holding database
credentials alone isn't enough to promote an arbitrary account, and it
only works while the site has no admin at all. The promotion is a single
conditional UPDATE, so two runs racing each other can't create two
admins. Once an admin exists, further admins are granted from the admin
panel (PATCH /admin/users/{id}/role), which requires an admin session.
"""

import getpass
import os
import sys

from sqlalchemy import text
from sqlalchemy.orm import Session

import db_models
from auth import verify_password


class BootstrapError(Exception):
    pass


def bootstrap_admin(db: Session, email: str, password: str) -> db_models.User:
    configured = os.environ.get("ADMIN_BOOTSTRAP_EMAIL", "").strip().lower()
    email = (email or "").strip().lower()
    if not configured:
        raise BootstrapError("Set ADMIN_BOOTSTRAP_EMAIL to the address of the account to promote")
    if email != configured:
        raise BootstrapError("That address isn't ADMIN_BOOTSTRAP_EMAIL")

    user = db.query(db_models.User).filter_by(email=email).first()
    # Same message whether the account is missing or the password is wrong.
    if not user or not verify_password(password, user.password_hash, user.password_salt):
        raise BootstrapError("No account with that email and password")

    # One statement: promote this row only if no admin exists at that moment.
    # The count is wrapped in a derived table because MySQL/TiDB won't let an
    # UPDATE read its own target table in a plain subquery.
    promoted = db.execute(
        text(
            "UPDATE users SET is_admin = :yes WHERE id = :id AND "
            "(SELECT n FROM (SELECT COUNT(*) AS n FROM users WHERE is_admin = :yes) AS admins) = 0"
        ),
        {"id": user.id, "yes": True},
    ).rowcount
    if promoted != 1:
        db.rollback()
        raise BootstrapError("An admin already exists. Grant further admins from the admin panel.")
    db.commit()
    db.refresh(user)
    return user


def main() -> int:
    from database import SessionLocal

    email = os.environ.get("ADMIN_BOOTSTRAP_EMAIL", "")
    if not email:
        print("Set ADMIN_BOOTSTRAP_EMAIL first.", file=sys.stderr)
        return 2
    password = getpass.getpass(f"Password for {email}: ")
    with SessionLocal() as db:
        try:
            user = bootstrap_admin(db, email, password)
        except BootstrapError as exc:
            print(f"Not promoted: {exc}", file=sys.stderr)
            return 1
    print(f"Promoted account {user.id} to admin.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
