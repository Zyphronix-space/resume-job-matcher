"""Ownership, role checks, privacy, upload validation, throttling, admin
bootstrap and account deletion for the job-seeker workspace."""

import pytest

import account
import db_models
from database import SessionLocal
from tests.conftest import auth_headers, signup


@pytest.fixture
def two_candidates(client, recruiter):
    a = signup(client, "alice@example.com", "candidate", "Alice")
    b = signup(client, "bob@example.com", "candidate", "Bob")
    return auth_headers(a["access_token"]), auth_headers(b["access_token"])


def test_tracker_records_are_private_to_their_owner(client, two_candidates, job_index):
    alice, bob = two_candidates
    t = client.post("/tracker", headers=alice, json={"posting_id": job_index["ids"]["p1"]}).json()
    client.put(f"/tracker/{t['id']}/documents/cover_letter", headers=alice, json={"content": "Alice's private letter"})
    client.patch(f"/tracker/{t['id']}", headers=alice, json={"notes": "salary expectations"})

    assert client.get("/tracker", headers=bob).json() == []
    for method, path, body in [
        ("get", f"/tracker/{t['id']}", None),
        ("patch", f"/tracker/{t['id']}", {"stage": "Withdrawn"}),
        ("delete", f"/tracker/{t['id']}", None),
        ("get", f"/tracker/{t['id']}/assessment", None),
        ("get", f"/tracker/{t['id']}/prep", None),
        ("post", f"/tracker/{t['id']}/documents/resume/generate", None),
        ("put", f"/tracker/{t['id']}/documents/cover_letter", {"content": "overwritten"}),
    ]:
        res = getattr(client, method)(path, headers=bob, **({"json": body} if body is not None else {}))
        assert res.status_code == 404, (method, path, res.status_code)

    still = client.get(f"/tracker/{t['id']}", headers=alice).json()
    assert still["documents"]["cover_letter"]["content"] == "Alice's private letter"
    assert still["stage"] == "Saved" and still["notes"] == "salary expectations"
    assert client.get("/tracker/summary", headers=bob).json()["total"] == 0


def test_profiles_are_private(client, two_candidates):
    alice, bob = two_candidates
    client.put("/profile", headers=alice, json={"skills": ["python"], "summary": "Alice's summary"})
    assert client.get("/profile", headers=bob).json()["summary"] == ""


def test_workspace_needs_a_candidate_session(client, recruiter, job_index):
    for path in ("/tracker", "/tracker/summary", "/profile", "/profile/suggestions"):
        assert client.get(path).status_code == 401
        assert client.get(path, headers=recruiter["headers"]).status_code == 403
    assert client.post("/tracker", headers=recruiter["headers"], json={"posting_id": job_index["ids"]["p1"]}).status_code == 403


def test_admin_source_routes_are_admin_only(client, candidate, job_index):
    for method, path in [("get", "/admin/sources"), ("post", "/admin/sources/seed"),
                         ("post", f"/admin/sources/{job_index['source_id']}/sync"), ("post", "/admin/sources/sync-all")]:
        assert getattr(client, method)(path, headers=candidate["headers"]).status_code == 403
        assert getattr(client, method)(path).status_code == 401
    assert client.post("/admin/postings", headers=candidate["headers"], json={}).status_code == 403


def test_add_source_validates_and_previews(client, recruiter, monkeypatch):
    import admin_sources_routes
    from job_sources import NormalizedPosting, SourceError

    bad = client.post("/admin/sources", headers=recruiter["headers"],
                      json={"kind": "greenhouse", "board": "../../etc", "company": "X"})
    assert bad.status_code == 422
    unknown_kind = client.post("/admin/sources", headers=recruiter["headers"],
                               json={"kind": "indeed", "board": "x", "company": "X"})
    assert unknown_kind.status_code == 422

    monkeypatch.setattr(admin_sources_routes, "fetch_board", lambda *a, **k: (_ for _ in ()).throw(SourceError("Board not found (404).")))
    missing = client.post("/admin/sources", headers=recruiter["headers"], json={"kind": "lever", "board": "nope", "company": "Nope"})
    assert missing.status_code == 400 and "404" in missing.json()["detail"]
    assert client.get("/admin/sources", headers=recruiter["headers"]).json() == []

    monkeypatch.setattr(admin_sources_routes, "fetch_board",
                        lambda *a, **k: [NormalizedPosting(external_id="1", title="Engineer", company="Real Co", location="Colombo")])
    ok = client.post("/admin/sources", headers=recruiter["headers"], json={"kind": "lever", "board": "realco", "company": "Real Co"})
    assert ok.status_code == 200 and ok.json()["preview"][0]["title"] == "Engineer"
    # Saving doesn't import anything until an admin syncs
    assert client.get("/postings").json()["total"] == 0


def test_manual_postings_need_the_original_advert(client, recruiter):
    base = {"title": "Trainee Engineer", "company": "Co", "description": "Requirements: Java and SQL basics.",
            "apply_url": "https://co.lk/apply"}
    assert client.post("/admin/postings", headers=recruiter["headers"], json=base).status_code == 422
    bad = dict(base, source_url="javascript:alert(1)")
    assert client.post("/admin/postings", headers=recruiter["headers"], json=bad).status_code == 422


def test_cron_endpoint_is_off_without_a_secret_and_checks_it(client, monkeypatch):
    monkeypatch.delenv("CRON_SECRET", raising=False)
    assert client.get("/internal/cron/sync-sources").status_code == 404
    monkeypatch.setenv("CRON_SECRET", "s3cret-value")
    assert client.get("/internal/cron/sync-sources").status_code == 401
    assert client.get("/internal/cron/sync-sources", headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert client.get("/internal/cron/sync-sources", headers={"Authorization": "Bearer s3cret-value"}).status_code == 200


def test_upload_rejects_files_that_are_not_pdfs(client, candidate):
    fake = client.post("/resumes", headers=candidate["headers"],
                       files={"file": ("resume.pdf", b"MZ\x90\x00 this is an exe", "application/pdf")})
    assert fake.status_code == 400 and "valid PDF" in fake.json()["detail"]
    wrong_ext = client.post("/resumes", headers=candidate["headers"], files={"file": ("resume.docx", b"%PDF-1.4", "application/pdf")})
    assert wrong_ext.status_code == 400
    corrupt = client.post("/resumes", headers=candidate["headers"], files={"file": ("r.pdf", b"%PDF-1.4 garbage", "application/pdf")})
    assert corrupt.status_code == 400
    huge = client.post("/resumes", headers=candidate["headers"],
                       files={"file": ("r.pdf", b"%PDF-1.4" + b"0" * (4 * 1024 * 1024 + 10), "application/pdf")})
    assert huge.status_code == 413


def test_uploaded_filename_is_sanitized_for_the_download_header(client, candidate, sample_resume_pdf):
    res = client.post("/resumes", headers=candidate["headers"],
                      files={"file": ('..\\..\\evil";\r\nX-Injected: 1.pdf', sample_resume_pdf, "application/pdf")})
    assert res.status_code == 200
    name = res.json()["filename"]
    assert '"' not in name and "\r" not in name and "\n" not in name and "/" not in name and "\\" not in name
    download = client.get(f"/resumes/{res.json()['id']}/file", headers=candidate["headers"])
    assert "x-injected" not in {k.lower() for k in download.headers}


def test_resume_sent_with_an_application_cant_be_deleted_alone(client, candidate, applied_application):
    res = client.delete(f"/resumes/{applied_application['resume_id']}", headers=candidate["headers"])
    assert res.status_code == 409


def test_login_is_throttled_per_email(client, candidate):
    for _ in range(account.LOGIN_MAX_PER_EMAIL):
        assert client.post("/auth/login", json={"email": "candidate@example.com", "password": "wrong-pass"}).status_code == 401
    blocked = client.post("/auth/login", json={"email": "candidate@example.com", "password": "Password123"})
    assert blocked.status_code == 429
    # A different account from the same client is not locked out yet
    assert client.post("/auth/login", json={"email": "recruiter@example.com", "password": "Password123"}).status_code == 200


def test_successful_login_clears_the_failure_count(client, candidate):
    for _ in range(account.LOGIN_MAX_PER_EMAIL - 1):
        client.post("/auth/login", json={"email": "candidate@example.com", "password": "wrong-pass"})
    assert client.post("/auth/login", json={"email": "candidate@example.com", "password": "Password123"}).status_code == 200
    for _ in range(account.LOGIN_MAX_PER_EMAIL - 1):
        assert client.post("/auth/login", json={"email": "candidate@example.com", "password": "wrong-pass"}).status_code == 401


def test_signup_is_throttled_per_ip(client, monkeypatch):
    monkeypatch.setattr(account, "SIGNUP_MAX_PER_IP", 2)
    for i in range(2):
        signup(client, f"u{i}@example.com", "candidate")
    res = client.post("/auth/signup", json={"full_name": "X", "email": "u9@example.com", "password": "Password123", "role": "candidate"})
    assert res.status_code == 429


def test_admin_bootstrap_on_vercel_needs_the_configured_email(client, monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("ADMIN_BOOTSTRAP_EMAIL", raising=False)
    first = signup(client, "stranger@example.com", "candidate")
    assert first["user"]["is_admin"] is False

    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "Owner@Example.com")
    assert signup(client, "someone@example.com", "candidate")["user"]["is_admin"] is False
    assert signup(client, "owner@example.com", "recruiter")["user"]["is_admin"] is True


def test_admin_bootstrap_happens_once(client, monkeypatch):
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "owner@example.com")
    assert signup(client, "owner@example.com", "recruiter")["user"]["is_admin"] is True
    with SessionLocal() as db:
        db.query(db_models.User).filter_by(email="owner@example.com").update({"email": "renamed@example.com"})
        db.commit()
    # Even the bootstrap address can't mint a second admin once one exists
    assert signup(client, "owner@example.com", "recruiter")["user"]["is_admin"] is False


def test_signup_cannot_request_admin(client, recruiter):
    res = client.post("/auth/signup", json={
        "full_name": "Eve", "email": "eve@example.com", "password": "Password123", "role": "candidate", "is_admin": True,
    })
    assert res.status_code == 200 and res.json()["user"]["is_admin"] is False


def test_delete_account_removes_everything(client, recruiter, candidate, uploaded_resume, job_index):
    t = client.post("/tracker", headers=candidate["headers"], json={"posting_id": job_index["ids"]["p1"]}).json()
    client.put(f"/tracker/{t['id']}/documents/cover_letter", headers=candidate["headers"], json={"content": "x"})
    client.put("/profile", headers=candidate["headers"], json={"skills": ["python"]})
    uid = candidate["user"]["id"]

    assert client.post("/auth/delete-account", headers=candidate["headers"], json={"password": "nope"}).status_code == 400
    assert client.post("/auth/delete-account", headers=candidate["headers"], json={"password": "Password123"}).status_code == 200

    with SessionLocal() as db:
        assert db.query(db_models.User).filter_by(id=uid).count() == 0
        assert db.query(db_models.Resume).filter_by(candidate_id=uid).count() == 0
        assert db.query(db_models.TrackedJob).filter_by(user_id=uid).count() == 0
        assert db.query(db_models.ApplicationDocument).count() == 0
        assert db.query(db_models.TrackedJobEvent).count() == 0
        assert db.query(db_models.CandidateProfile).filter_by(user_id=uid).count() == 0
        # Shared job postings are untouched
        assert db.query(db_models.JobPosting).count() == 3
    assert client.get("/auth/me", headers=candidate["headers"]).status_code == 401


def test_only_admin_cannot_delete_themselves_while_others_depend_on_it(client, recruiter, candidate):
    res = client.post("/auth/delete-account", headers=recruiter["headers"], json={"password": "Password123"})
    assert res.status_code == 400
