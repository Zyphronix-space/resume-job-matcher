"""Signup/login validation, roles, first-user-admin, profile, password reset."""

from conftest import auth_headers, signup


def test_signup_first_user_becomes_admin(client):
    data = signup(client, "first@example.com", "recruiter")
    assert data["user"]["is_admin"] is True
    assert data["user"]["role"] == "recruiter"


def test_signup_second_user_is_not_admin(client):
    signup(client, "first@example.com", "recruiter")
    data = signup(client, "second@example.com", "candidate")
    assert data["user"]["is_admin"] is False
    assert data["user"]["role"] == "candidate"


def test_signup_duplicate_email_rejected(client):
    signup(client, "dupe@example.com", "recruiter")
    res = client.post("/auth/signup", json={
        "full_name": "Someone Else", "email": "dupe@example.com", "password": "Password123", "role": "candidate",
    })
    assert res.status_code == 400


def test_signup_rejects_short_password(client):
    res = client.post("/auth/signup", json={
        "full_name": "Short Pass", "email": "short@example.com", "password": "abc123", "role": "candidate",
    })
    assert res.status_code == 422


def test_signup_rejects_invalid_role(client):
    res = client.post("/auth/signup", json={
        "full_name": "Bad Role", "email": "badrole@example.com", "password": "Password123", "role": "manager",
    })
    assert res.status_code == 422


def test_login_success_and_wrong_password(client):
    signup(client, "login@example.com", "candidate", password="Password123")
    ok = client.post("/auth/login", json={"email": "login@example.com", "password": "Password123"})
    assert ok.status_code == 200
    bad = client.post("/auth/login", json={"email": "login@example.com", "password": "WrongPassword"})
    assert bad.status_code == 401


def test_me_requires_auth(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_returns_current_user(client):
    data = signup(client, "me@example.com", "candidate")
    res = client.get("/auth/me", headers=auth_headers(data["access_token"]))
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


def test_update_profile(client, candidate):
    res = client.patch("/auth/me", headers=candidate["headers"], json={
        "headline": "Aspiring engineer", "location": "Kandy", "links": {"github": "https://github.com/cara"},
    })
    assert res.status_code == 200
    body = res.json()
    assert body["headline"] == "Aspiring engineer"
    assert body["links"]["github"] == "https://github.com/cara"


def test_change_password_flow(client, candidate):
    wrong = client.post("/auth/change-password", headers=candidate["headers"], json={
        "current_password": "WrongPassword", "new_password": "NewPassword123",
    })
    assert wrong.status_code == 400

    ok = client.post("/auth/change-password", headers=candidate["headers"], json={
        "current_password": "Password123", "new_password": "NewPassword123",
    })
    assert ok.status_code == 200

    login = client.post("/auth/login", json={"email": "candidate@example.com", "password": "NewPassword123"})
    assert login.status_code == 200


def test_forgot_and_reset_password(client, candidate):
    forgot = client.post("/auth/forgot-password", json={"email": "candidate@example.com"})
    assert forgot.status_code == 200
    token = forgot.json()["reset_token"]
    assert token

    reset = client.post("/auth/reset-password", json={"token": token, "new_password": "BrandNew123"})
    assert reset.status_code == 200

    login = client.post("/auth/login", json={"email": "candidate@example.com", "password": "BrandNew123"})
    assert login.status_code == 200

    reuse = client.post("/auth/reset-password", json={"token": token, "new_password": "AnotherOne123"})
    assert reuse.status_code == 400


def test_forgot_password_unknown_email_does_not_leak(client):
    res = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert res.status_code == 200
    assert res.json()["reset_token"] is None
