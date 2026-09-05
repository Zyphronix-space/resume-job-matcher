"""Resume upload/parsing, versioning, deletion, and file-access control."""


def test_upload_resume_parses_real_skills(client, candidate, sample_resume_pdf):
    res = client.post(
        "/resumes", headers=candidate["headers"],
        files={"file": ("resume.pdf", sample_resume_pdf, "application/pdf")},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["is_active"] is True
    assert body["version"] == 1
    # Real skills detected from the actual PDF text, not fabricated.
    assert set(body["cv_skills"]) >= {"python", "sql", "git", "react", "fastapi", "docker"}
    assert body["resume_structure_score"] > 0
    assert body["resume_sections"]["Education"] is True
    assert body["resume_sections"]["Work Experience"] is True


def test_upload_rejects_non_pdf(client, candidate):
    res = client.post(
        "/resumes", headers=candidate["headers"],
        files={"file": ("resume.txt", b"not a pdf", "text/plain")},
    )
    assert res.status_code == 400


def test_recruiter_cannot_upload_resume(client, recruiter, sample_resume_pdf):
    res = client.post(
        "/resumes", headers=recruiter["headers"],
        files={"file": ("resume.pdf", sample_resume_pdf, "application/pdf")},
    )
    assert res.status_code == 403


def test_second_upload_becomes_active_first_is_versioned(client, candidate, sample_resume_pdf):
    first = client.post(
        "/resumes", headers=candidate["headers"],
        files={"file": ("resume.pdf", sample_resume_pdf, "application/pdf")},
    ).json()
    second = client.post(
        "/resumes", headers=candidate["headers"],
        files={"file": ("resume-v2.pdf", sample_resume_pdf, "application/pdf")},
    ).json()

    resumes = {r["id"]: r for r in client.get("/resumes", headers=candidate["headers"]).json()}
    assert resumes[first["id"]]["is_active"] is False
    assert resumes[second["id"]]["is_active"] is True
    assert second["version"] == 2


def test_resume_file_access_control(client, candidate, uploaded_resume, recruiter, open_job, applied_application):
    resume_id = uploaded_resume["id"]

    # Owner can always download.
    assert client.get(f"/resumes/{resume_id}/file", headers=candidate["headers"]).status_code == 200

    # A recruiter with no application from this candidate cannot.
    stranger = client.post("/auth/signup", json={
        "full_name": "Stranger Recruiter", "email": "stranger@example.com", "password": "Password123", "role": "recruiter",
    }).json()
    stranger_headers = {"Authorization": f"Bearer {stranger['access_token']}"}
    assert client.get(f"/resumes/{resume_id}/file", headers=stranger_headers).status_code == 404

    # The recruiter who owns the job this candidate applied to (with this
    # resume) can, via applied_application fixture.
    assert client.get(f"/resumes/{resume_id}/file", headers=recruiter["headers"]).status_code == 200


def test_delete_resume_reactivates_newest_remaining(client, candidate, sample_resume_pdf):
    first = client.post(
        "/resumes", headers=candidate["headers"],
        files={"file": ("a.pdf", sample_resume_pdf, "application/pdf")},
    ).json()
    second = client.post(
        "/resumes", headers=candidate["headers"],
        files={"file": ("b.pdf", sample_resume_pdf, "application/pdf")},
    ).json()

    client.delete(f"/resumes/{second['id']}", headers=candidate["headers"])

    remaining = client.get("/resumes", headers=candidate["headers"]).json()
    assert len(remaining) == 1
    assert remaining[0]["id"] == first["id"]
    assert remaining[0]["is_active"] is True
