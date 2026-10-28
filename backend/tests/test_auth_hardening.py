"""Admin bootstrap, session revocation, auth-route throttling, and a
password-reset race run with real concurrent requests."""

import threading

import jwt
import pytest

import account
import db_models
from admin_bootstrap import BootstrapError, bootstrap_admin
from auth import ALGORITHM, SECRET_KEY
from database import SessionLocal
from tests.conftest import auth_headers, signup


# --- Admin bootstrap -----------------------------------------------------------

def test_signup_never_grants_admin_even_with_bootstrap_email(client, monkeypatch):
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "owner@example.com")
    assert signup(client, "owner@example.com", "recruiter")["user"]["is_admin"] is False
    assert signup(client, "other@example.com", "candidate")["user"]["is_admin"] is False


def test_bootstrap_promotes_the_configured_account_with_its_password(client, monkeypatch):
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "Owner@Example.com")
    signup(client, "owner@example.com", "candidate", password="OwnerPass123")
    with SessionLocal() as db:
        user = bootstrap_admin(db, "owner@example.com", "OwnerPass123")
        assert user.is_admin is True


@pytest.mark.parametrize("email,password,configured", [
    ("owner@example.com", "WrongPass123", "owner@example.com"),    # wrong password
    ("other@example.com", "OtherPass123", "owner@example.com"),    # not the configured account
    ("owner@example.com", "OwnerPass123", ""),                     # nothing configured
    ("ghost@example.com", "OwnerPass123", "ghost@example.com"),    # no such account
])
def test_bootstrap_refuses(client, monkeypatch, email, password, configured):
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", configured)
    signup(client, "owner@example.com", "candidate", password="OwnerPass123")
    signup(client, "other@example.com", "candidate", password="OtherPass123")
    with SessionLocal() as db, pytest.raises(BootstrapError):
        bootstrap_admin(db, email, password)
    with SessionLocal() as db:
        assert db.query(db_models.User).filter_by(is_admin=True).count() == 0


def test_bootstrap_refuses_once_an_admin_exists_and_keeps_that_admin(client, monkeypatch):
    existing = signup(client, "existing-admin@example.com", "candidate")
    with SessionLocal() as db:
        db.query(db_models.User).filter_by(id=existing["user"]["id"]).update({"is_admin": True})
        db.commit()
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "owner@example.com")
    signup(client, "owner@example.com", "candidate", password="OwnerPass123")
    with SessionLocal() as db, pytest.raises(BootstrapError):
        bootstrap_admin(db, "owner@example.com", "OwnerPass123")
    with SessionLocal() as db:
        admins = db.query(db_models.User).filter_by(is_admin=True).all()
        assert [a.email for a in admins] == ["existing-admin@example.com"]


def test_concurrent_bootstraps_create_one_admin(client, monkeypatch):
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "owner@example.com")
    signup(client, "owner@example.com", "candidate", password="OwnerPass123")
    barrier = threading.Barrier(4)
    outcomes = []

    def attempt():
        barrier.wait()
        with SessionLocal() as db:
            try:
                bootstrap_admin(db, "owner@example.com", "OwnerPass123")
                outcomes.append("promoted")
            except BootstrapError:
                outcomes.append("refused")
            except Exception as exc:  # a lock conflict also counts as not promoted
                outcomes.append(f"error:{type(exc).__name__}")

    threads = [threading.Thread(target=attempt) for _ in range(4)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert outcomes.count("promoted") == 1, outcomes
    with SessionLocal() as db:
        assert db.query(db_models.User).filter_by(is_admin=True).count() == 1


def test_users_cannot_promote_themselves(client, candidate):
    res = client.patch("/auth/me", headers=candidate["headers"], json={"is_admin": True, "role": "recruiter"})
    assert res.status_code == 200
    assert res.json()["is_admin"] is False and res.json()["role"] == "candidate"
    res = client.patch(f"/admin/users/{candidate['user']['id']}/role?is_admin=true", headers=candidate["headers"])
    assert res.status_code == 403


# --- Session revocation ----------------------------------------------------------

def test_change_password_ends_other_sessions_and_keeps_this_one(client):
    first = signup(client, "c@example.com", "candidate")
    other = client.post("/auth/login", json={"email": "c@example.com", "password": "Password123"}).json()
    res = client.post("/auth/change-password", headers=auth_headers(first["access_token"]),
                      json={"current_password": "Password123", "new_password": "NewPass12345"})
    assert res.status_code == 200
    fresh = res.json()["access_token"]
    assert client.get("/auth/me", headers=auth_headers(other["access_token"])).status_code == 401
    assert client.get("/auth/me", headers=auth_headers(first["access_token"])).status_code == 401
    assert client.get("/auth/me", headers=auth_headers(fresh)).status_code == 200


def test_password_reset_ends_existing_sessions(client, monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_DEMO_MODE", "1")
    session = signup(client, "c@example.com", "candidate")["access_token"]
    token = client.post("/auth/forgot-password", json={"email": "c@example.com"}).json()["reset_token"]
    assert client.post("/auth/reset-password", json={"token": token, "new_password": "NewPass12345"}).status_code == 200
    assert client.get("/auth/me", headers=auth_headers(session)).status_code == 401


def test_tokens_from_before_versioning_still_work(client):
    """Sessions issued by the currently deployed code have no "ver" claim;
    they must keep working after this deploy (version 0)."""
    user = signup(client, "c@example.com", "candidate")["user"]
    from datetime import datetime, timedelta, timezone
    legacy = jwt.encode({"sub": str(user["id"]), "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                        SECRET_KEY, algorithm=ALGORITHM)
    assert client.get("/auth/me", headers=auth_headers(legacy)).status_code == 200
    with SessionLocal() as db:  # rows created before the column existed hold NULL
        db.query(db_models.User).filter_by(id=user["id"]).update({"token_version": None})
        db.commit()
    assert client.get("/auth/me", headers=auth_headers(legacy)).status_code == 200


def test_deleted_account_session_stops_working(client):
    data = signup(client, "c@example.com", "candidate")
    headers = auth_headers(data["access_token"])
    assert client.post("/auth/delete-account", headers=headers, json={"password": "Password123"}).status_code == 200
    assert client.get("/auth/me", headers=headers).status_code == 401


# --- Throttling -------------------------------------------------------------------

def test_change_password_is_throttled_per_account(client, monkeypatch):
    monkeypatch.setattr(account, "PASSWORD_CHECK_MAX_PER_USER", 2)
    headers = auth_headers(signup(client, "c@example.com", "candidate")["access_token"])
    body = {"current_password": "Wrong12345", "new_password": "NewPass12345"}
    assert [client.post("/auth/change-password", headers=headers, json=body).status_code for _ in range(3)] == [400, 400, 429]
    right = {"current_password": "Password123", "new_password": "NewPass12345"}
    assert client.post("/auth/change-password", headers=headers, json=right).status_code == 429


def test_delete_account_password_is_throttled(client, monkeypatch):
    monkeypatch.setattr(account, "PASSWORD_CHECK_MAX_PER_USER", 2)
    headers = auth_headers(signup(client, "c@example.com", "candidate")["access_token"])
    codes = [client.post("/auth/delete-account", headers=headers, json={"password": "Wrong"}).status_code for _ in range(3)]
    assert codes == [400, 400, 429]
    assert client.get("/auth/me", headers=headers).status_code == 200


def test_reset_password_guessing_is_throttled_per_ip(client, monkeypatch):
    monkeypatch.setattr(account, "RESET_MAX_PER_IP", 3)
    codes = [client.post("/auth/reset-password", json={"token": f"guess{i}", "new_password": "NewPass12345"}).status_code
             for i in range(4)]
    assert codes == [400, 400, 400, 429]


def test_forgot_password_is_throttled_and_stays_off(client, monkeypatch):
    monkeypatch.delenv("PASSWORD_RESET_DEMO_MODE", raising=False)
    monkeypatch.setattr(account, "FORGOT_MAX_PER_EMAIL", 2)
    signup(client, "c@example.com", "candidate")
    responses = [client.post("/auth/forgot-password", json={"email": "c@example.com"}) for _ in range(3)]
    assert [r.status_code for r in responses] == [200, 200, 429]
    assert all(r.json().get("reset_token") is None for r in responses[:2])


def test_job_link_import_is_throttled(client, candidate, monkeypatch):
    monkeypatch.setattr(account, "IMPORT_MAX_PER_USER", 2)
    url = {"url": "https://example.com/not-a-board"}
    codes = [client.post("/tracker/import", headers=candidate["headers"], json=url).status_code for _ in range(3)]
    assert codes == [400, 400, 429]


# --- Password-reset race, with real concurrent requests ---------------------------

def test_one_reset_token_wins_exactly_once_under_concurrency(client, monkeypatch):
    monkeypatch.setenv("PASSWORD_RESET_DEMO_MODE", "1")
    signup(client, "c@example.com", "candidate")
    token = client.post("/auth/forgot-password", json={"email": "c@example.com"}).json()["reset_token"]
    n = 6
    barrier = threading.Barrier(n)
    codes = []

    def attempt(i):
        barrier.wait()
        res = client.post("/auth/reset-password", json={"token": token, "new_password": f"Racer{i}Pass123"})
        codes.append((i, res.status_code))

    threads = [threading.Thread(target=attempt, args=(i,)) for i in range(n)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    winners = [i for i, code in codes if code == 200]
    assert len(winners) == 1, codes
    # The password that works is the winner's, and only the winner's.
    for i in range(n):
        ok = client.post("/auth/login", json={"email": "c@example.com", "password": f"Racer{i}Pass123"}).status_code == 200
        assert ok == (i == winners[0])
