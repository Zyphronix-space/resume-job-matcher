"""The core pipeline: apply, ranking, status changes, notes, shortlist,
compare, and the candidate directory — plus permission gates."""


def test_candidate_matches_before_applying(client, candidate, open_job, uploaded_resume):
    res = client.get("/candidate/matches", headers=candidate["headers"])
    assert res.status_code == 200
    matches = res.json()
    assert len(matches) == 1
    assert matches[0]["job"]["id"] == open_job["id"]
    assert matches[0]["already_applied"] is False
    assert 0 <= matches[0]["match_score"] <= 100


def test_candidate_matches_empty_without_resume(client, candidate, open_job):
    res = client.get("/candidate/matches", headers=candidate["headers"])
    assert res.status_code == 200
    assert res.json() == []


def test_apply_computes_real_match_and_creates_application(client, applied_application, open_job):
    assert applied_application["job"]["id"] == open_job["id"]
    assert applied_application["status"] == "Applied"
    assert 0 <= applied_application["match_score"] <= 100
    # Required skills come from the job (python, sql, fastapi) — the sample
    # resume mentions python/fastapi explicitly, sql is present too.
    assert "python" in applied_application["matched_skills"]
    assert len(applied_application["events"]) == 1
    assert applied_application["events"][0]["label"] == "Applied"


def test_recruiter_cannot_apply(client, recruiter, open_job):
    res = client.post(f"/jobs/{open_job['id']}/apply", headers=recruiter["headers"], json={})
    assert res.status_code == 403


def test_apply_without_resume_fails(client, candidate, open_job):
    res = client.post(f"/jobs/{open_job['id']}/apply", headers=candidate["headers"], json={})
    assert res.status_code == 400


def test_reapplying_updates_existing_application_not_duplicate(client, candidate, open_job, uploaded_resume):
    first = client.post(f"/jobs/{open_job['id']}/apply", headers=candidate["headers"], json={}).json()
    second = client.post(f"/jobs/{open_job['id']}/apply", headers=candidate["headers"], json={}).json()
    assert first["id"] == second["id"]

    apps = client.get("/candidate/applications", headers=candidate["headers"]).json()
    assert len(apps) == 1


def test_rank_candidates_for_job(client, recruiter, applied_application, open_job):
    res = client.get(f"/jobs/{open_job['id']}/candidates", headers=recruiter["headers"])
    assert res.status_code == 200
    ranked = res.json()
    assert len(ranked) == 1
    assert ranked[0]["candidate"]["email"] == "candidate@example.com"


def test_rank_candidates_filters(client, recruiter, applied_application, open_job):
    too_high = client.get(f"/jobs/{open_job['id']}/candidates?min_score=99.9", headers=recruiter["headers"]).json()
    assert too_high == []

    by_skill = client.get(f"/jobs/{open_job['id']}/candidates?skill=python", headers=recruiter["headers"]).json()
    assert len(by_skill) == 1

    by_missing_skill = client.get(f"/jobs/{open_job['id']}/candidates?skill=rust", headers=recruiter["headers"]).json()
    assert by_missing_skill == []

    by_status = client.get(f"/jobs/{open_job['id']}/candidates?status=Rejected", headers=recruiter["headers"]).json()
    assert by_status == []


def test_recruiter_cannot_rank_candidates_for_others_job(client, recruiter, open_job):
    other = client.post("/auth/signup", json={
        "full_name": "Other Recruiter", "email": "otherrec@example.com", "password": "Password123", "role": "recruiter",
    }).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    res = client.get(f"/jobs/{open_job['id']}/candidates", headers=other_headers)
    assert res.status_code == 404


def test_change_application_status_and_shortlist(client, recruiter, applied_application):
    app_id = applied_application["id"]

    invalid = client.patch(f"/applications/{app_id}/status", headers=recruiter["headers"], json={"status": "Bogus"})
    assert invalid.status_code == 400

    ok = client.patch(f"/applications/{app_id}/status", headers=recruiter["headers"], json={"status": "Shortlisted"})
    assert ok.status_code == 200
    assert ok.json()["status"] == "Shortlisted"
    assert [e["label"] for e in ok.json()["events"]] == ["Applied", "Shortlisted"]

    shortlist = client.get("/shortlist", headers=recruiter["headers"]).json()
    assert len(shortlist) == 1
    assert shortlist[0]["id"] == app_id


def test_candidate_cannot_change_application_status(client, candidate, applied_application):
    res = client.patch(
        f"/applications/{applied_application['id']}/status", headers=candidate["headers"], json={"status": "Offer"},
    )
    assert res.status_code == 403


def test_notes_are_recruiter_only(client, recruiter, candidate, applied_application):
    forbidden = client.post(
        f"/applications/{applied_application['id']}/notes", headers=candidate["headers"], json={"body": "hi"},
    )
    assert forbidden.status_code == 403

    ok = client.post(
        f"/applications/{applied_application['id']}/notes", headers=recruiter["headers"],
        json={"body": "Strong Python fundamentals."},
    )
    assert ok.status_code == 200
    assert ok.json()["body"] == "Strong Python fundamentals."

    detail = client.get(f"/applications/{applied_application['id']}", headers=recruiter["headers"]).json()
    assert len(detail["notes"]) == 1
    # skill_evidence is recomputed on demand at detail view, never persisted.
    assert isinstance(detail["skill_evidence"], dict)


def test_compare_applications(client, recruiter, applied_application):
    res = client.get(f"/applications/compare?ids={applied_application['id']}", headers=recruiter["headers"])
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_candidates_directory_and_detail(client, recruiter, applied_application, candidate):
    listing = client.get("/candidates", headers=recruiter["headers"]).json()
    assert len(listing) == 1
    assert listing[0]["applications_count"] == 1

    candidate_id = listing[0]["id"]
    detail = client.get(f"/candidates/{candidate_id}", headers=recruiter["headers"])
    assert detail.status_code == 200
    body = detail.json()
    assert len(body["applications"]) == 1
    assert len(body["resumes"]) == 1


def test_candidate_cannot_access_candidates_directory(client, candidate):
    res = client.get("/candidates", headers=candidate["headers"])
    assert res.status_code == 403


def test_application_hidden_from_unrelated_recruiter_and_candidate(client, applied_application):
    app_id = applied_application["id"]

    stranger_recruiter = client.post("/auth/signup", json={
        "full_name": "Stranger Recruiter", "email": "strangerrec@example.com",
        "password": "Password123", "role": "recruiter",
    }).json()
    res = client.get(f"/applications/{app_id}", headers={"Authorization": f"Bearer {stranger_recruiter['access_token']}"})
    assert res.status_code == 404

    stranger_candidate = client.post("/auth/signup", json={
        "full_name": "Stranger Candidate", "email": "strangercand@example.com",
        "password": "Password123", "role": "candidate",
    }).json()
    res = client.get(f"/applications/{app_id}", headers={"Authorization": f"Bearer {stranger_candidate['access_token']}"})
    assert res.status_code == 404
