"""Admin oversight routes and permission gating."""


def test_non_admin_cannot_access_admin_routes(client, candidate):
    assert client.get("/admin/stats", headers=candidate["headers"]).status_code == 403
    assert client.get("/admin/users", headers=candidate["headers"]).status_code == 403


def test_admin_stats_reflect_real_counts(client, recruiter, candidate, open_job, uploaded_resume, applied_application):
    res = client.get("/admin/stats", headers=recruiter["headers"])
    assert res.status_code == 200
    body = res.json()
    assert body["total_users"] == 2
    assert body["total_recruiters"] == 1
    assert body["total_candidates"] == 1
    assert body["total_jobs"] == 1
    assert body["total_resumes"] == 1
    assert body["total_applications"] == 1
    assert body["applications_by_status"]["Applied"] == 1


def test_admin_can_promote_and_demote(client, recruiter, candidate):
    candidate_id = candidate["user"]["id"]
    promote = client.patch(f"/admin/users/{candidate_id}/role?is_admin=true", headers=recruiter["headers"])
    assert promote.status_code == 200
    assert promote.json()["is_admin"] is True

    demote = client.patch(f"/admin/users/{candidate_id}/role?is_admin=false", headers=recruiter["headers"])
    assert demote.json()["is_admin"] is False


def test_admin_cannot_remove_own_admin_access(client, recruiter):
    recruiter_id = recruiter["user"]["id"]
    res = client.patch(f"/admin/users/{recruiter_id}/role?is_admin=false", headers=recruiter["headers"])
    assert res.status_code == 400


def test_admin_delete_user_cascades(client, recruiter, candidate, open_job, uploaded_resume, applied_application):
    candidate_id = candidate["user"]["id"]
    res = client.delete(f"/admin/users/{candidate_id}", headers=recruiter["headers"])
    assert res.status_code == 200

    remaining_apps = client.get(f"/jobs/{open_job['id']}/candidates", headers=recruiter["headers"]).json()
    assert remaining_apps == []


def test_admin_cannot_delete_self(client, recruiter):
    res = client.delete(f"/admin/users/{recruiter['user']['id']}", headers=recruiter["headers"])
    assert res.status_code == 400
