"""Analytics aggregates and CSV report exports — every number must trace
back to real rows created in the test, never an estimate."""


def test_overview_reflects_real_data(client, recruiter, applied_application, open_job):
    res = client.get("/analytics/overview", headers=recruiter["headers"])
    assert res.status_code == 200
    body = res.json()
    assert body["open_jobs"] == 1
    assert body["total_candidates"] == 1
    assert body["new_applications"] == 1
    assert body["shortlisted_candidates"] == 0
    assert body["pipeline"]["Applied"] == 1
    assert sum(b["count"] for b in body["score_distribution"]) == 1
    assert any(s["skill"] == "python" for s in body["skills_demand"])


def test_overview_updates_after_shortlisting(client, recruiter, applied_application):
    client.patch(f"/applications/{applied_application['id']}/status", headers=recruiter["headers"], json={"status": "Shortlisted"})
    res = client.get("/analytics/overview", headers=recruiter["headers"]).json()
    assert res["shortlisted_candidates"] == 1
    assert res["status_distribution"]["Shortlisted"] == 1


def test_candidate_cannot_access_analytics(client, candidate):
    res = client.get("/analytics/overview", headers=candidate["headers"])
    assert res.status_code == 403


def test_job_report_csv(client, recruiter, applied_application, open_job):
    res = client.get(f"/reports/job/{open_job['id']}", headers=recruiter["headers"])
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    lines = res.text.strip().splitlines()
    assert len(lines) == 2  # header + one candidate row
    assert "candidate@example.com" in lines[1]


def test_shortlist_report_csv_only_includes_shortlisted(client, recruiter, applied_application):
    empty = client.get("/reports/shortlist", headers=recruiter["headers"])
    assert len(empty.text.strip().splitlines()) == 1  # header only

    client.patch(f"/applications/{applied_application['id']}/status", headers=recruiter["headers"], json={"status": "Shortlisted"})
    populated = client.get("/reports/shortlist", headers=recruiter["headers"])
    assert len(populated.text.strip().splitlines()) == 2
