"""Job CRUD, ownership scoping, and recruiter/candidate permission gates."""


def test_create_job(client, recruiter):
    res = client.post("/jobs", headers=recruiter["headers"], json={"title": "Intern", "location": "Remote"})
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Intern"
    assert body["status"] == "Open"
    assert body["applicants_count"] == 0


def test_candidate_cannot_create_job(client, candidate):
    res = client.post("/jobs", headers=candidate["headers"], json={"title": "Intern"})
    assert res.status_code == 403


def test_unauthenticated_cannot_create_job(client):
    res = client.post("/jobs", json={"title": "Intern"})
    assert res.status_code == 401


def test_list_my_jobs_only_shows_own_jobs(client, recruiter, open_job):
    other = client.post("/auth/signup", json={
        "full_name": "Other Recruiter", "email": "other@example.com", "password": "Password123", "role": "recruiter",
    }).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    client.post("/jobs", headers=other_headers, json={"title": "Someone else's job"})

    mine = client.get("/jobs", headers=recruiter["headers"]).json()
    assert len(mine) == 1
    assert mine[0]["id"] == open_job["id"]

    theirs = client.get("/jobs", headers=other_headers).json()
    assert len(theirs) == 1
    assert theirs[0]["title"] == "Someone else's job"


def test_candidate_can_view_open_job_but_not_draft(client, recruiter, candidate):
    open_res = client.post("/jobs", headers=recruiter["headers"], json={"title": "Open role", "status": "Open"}).json()
    draft_res = client.post("/jobs", headers=recruiter["headers"], json={"title": "Draft role", "status": "Draft"}).json()

    assert client.get(f"/jobs/{open_res['id']}", headers=candidate["headers"]).status_code == 200
    assert client.get(f"/jobs/{draft_res['id']}", headers=candidate["headers"]).status_code == 404


def test_update_job_requires_ownership(client, recruiter, open_job):
    other = client.post("/auth/signup", json={
        "full_name": "Other Recruiter", "email": "other2@example.com", "password": "Password123", "role": "recruiter",
    }).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    forbidden = client.patch(f"/jobs/{open_job['id']}", headers=other_headers, json={"title": "Hijacked"})
    assert forbidden.status_code == 404

    ok = client.patch(f"/jobs/{open_job['id']}", headers=recruiter["headers"], json={"title": "Renamed"})
    assert ok.status_code == 200
    assert ok.json()["title"] == "Renamed"


def test_delete_job(client, recruiter, open_job):
    res = client.delete(f"/jobs/{open_job['id']}", headers=recruiter["headers"])
    assert res.status_code == 200
    assert client.get(f"/jobs/{open_job['id']}", headers=recruiter["headers"]).status_code == 404


def test_job_status_filter_for_candidates(client, recruiter):
    """Closed jobs (like Draft) are not visible to candidates who don't own them."""
    closed = client.post("/jobs", headers=recruiter["headers"], json={"title": "Closed role", "status": "Closed"}).json()
    other = client.post("/auth/signup", json={
        "full_name": "Some Candidate", "email": "somecand@example.com", "password": "Password123", "role": "candidate",
    }).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}
    assert client.get(f"/jobs/{closed['id']}", headers=other_headers).status_code == 404
