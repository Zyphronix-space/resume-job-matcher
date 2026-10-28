"""Tracker persistence, stage history, follow-ups, drafts, interview prep,
and the candidate profile."""

from datetime import date, timedelta

import drafts
import tracker_routes
from job_sources import NormalizedPosting
from resume_analyzer import find_skills
from tests.conftest import auth_headers, signup


def _track(client, candidate, posting_id):
    res = client.post("/tracker", headers=candidate["headers"], json={"posting_id": posting_id})
    assert res.status_code == 200, res.text
    return res.json()


def test_track_posting_is_idempotent_and_copies_details(client, candidate, job_index):
    first = _track(client, candidate, job_index["ids"]["p1"])
    again = _track(client, candidate, job_index["ids"]["p1"])
    assert first["id"] == again["id"]
    assert first["title"] == "Software Engineering Intern" and first["stage"] == "Saved"
    assert first["apply_url"].startswith("https://jobs.lever.co/")
    listed = client.get("/postings", headers=candidate["headers"]).json()["results"]
    assert {r["title"]: r["tracked_id"] for r in listed}["Software Engineering Intern"] == first["id"]


def test_stage_changes_are_recorded_with_history(client, candidate, job_index):
    t = _track(client, candidate, job_index["ids"]["p1"])
    for stage in ("Preparing", "Applied", "Interview"):
        res = client.patch(f"/tracker/{t['id']}", headers=candidate["headers"], json={"stage": stage})
        assert res.status_code == 200
    detail = res.json()
    assert [(e["from"], e["to"]) for e in detail["events"]] == [
        ("", "Saved"), ("Saved", "Preparing"), ("Preparing", "Applied"), ("Applied", "Interview"),
    ]
    assert detail["applied_on"] == date.today().isoformat()
    assert client.patch(f"/tracker/{t['id']}", headers=candidate["headers"], json={"stage": "Hired!"}).status_code == 400


def test_follow_ups_and_summary(client, candidate, job_index):
    a = _track(client, candidate, job_index["ids"]["p1"])
    b = _track(client, candidate, job_index["ids"]["p3"])
    soon = (date.today() + timedelta(days=3)).isoformat()
    past = (date.today() - timedelta(days=2)).isoformat()
    client.patch(f"/tracker/{a['id']}", headers=candidate["headers"], json={"next_follow_up": soon, "notes": "Emailed HR"})
    client.patch(f"/tracker/{b['id']}", headers=candidate["headers"], json={"next_follow_up": past, "stage": "Applied"})
    s = client.get("/tracker/summary", headers=candidate["headers"]).json()
    assert s["total"] == 2 and s["by_stage"]["Saved"] == 1 and s["by_stage"]["Applied"] == 1
    assert [f["id"] for f in s["follow_ups"]] == [b["id"], a["id"]]
    assert s["follow_ups"][0]["overdue"] is True and s["follow_ups"][1]["overdue"] is False
    assert client.get(f"/tracker/{a['id']}", headers=candidate["headers"]).json()["notes"] == "Emailed HR"


def test_manual_job_and_its_edit_rules(client, candidate, job_index):
    res = client.post("/tracker/manual", headers=candidate["headers"], json={
        "title": "Associate Software Engineer", "company": "Some Company",
        "apply_url": "https://example.lk/jobs/1", "description": "We need Python and Django.",
    })
    assert res.status_code == 200
    manual = res.json()
    assert manual["origin"] == "pasted"
    assert client.patch(f"/tracker/{manual['id']}", headers=candidate["headers"], json={"company": "Renamed"}).status_code == 200
    bad = client.post("/tracker/manual", headers=candidate["headers"], json={"title": "X", "apply_url": "javascript:alert(1)"})
    assert bad.status_code == 422
    # A pasted job never enters the public index
    assert client.get("/postings").json()["total"] == 3
    # An indexed job's details come from its source
    indexed = _track(client, candidate, job_index["ids"]["p1"])
    assert client.patch(f"/tracker/{indexed['id']}", headers=candidate["headers"], json={"title": "CEO"}).status_code == 400


def test_import_link_uses_parser_and_api(client, candidate, monkeypatch):
    seen = {}

    def fake_fetch(kind, board, posting_id):
        seen.update(kind=kind, board=board, posting_id=posting_id)
        return NormalizedPosting(external_id=posting_id, title="Junior Ubuntu Software Engineer", company="Canonical",
                                 location="Home based - Worldwide", description="Python, Go, C",
                                 apply_url="https://job-boards.greenhouse.io/canonical/jobs/123")
    monkeypatch.setattr(tracker_routes, "fetch_single_posting", fake_fetch)
    res = client.post("/tracker/import", headers=candidate["headers"], json={"url": "https://boards.greenhouse.io/canonical/jobs/123"})
    assert res.status_code == 200, res.text
    assert seen == {"kind": "greenhouse", "board": "canonical", "posting_id": "123"}
    assert res.json()["company"] == "Canonical"

    for url in ("http://169.254.169.254/latest/meta-data", "https://boards.greenhouse.io@evil.com/x/jobs/1",
                "https://example.com/careers/1"):
        bad = client.post("/tracker/import", headers=candidate["headers"], json={"url": url})
        assert bad.status_code == 400


def test_selected_resume_must_be_own(client, candidate, uploaded_resume, job_index, sample_resume_pdf):
    other = signup(client, "other@example.com", "candidate", "Olly Other")
    other_headers = auth_headers(other["access_token"])
    theirs = client.post("/resumes", headers=other_headers,
                         files={"file": ("r.pdf", sample_resume_pdf, "application/pdf")}).json()
    t = _track(client, candidate, job_index["ids"]["p1"])
    assert client.patch(f"/tracker/{t['id']}", headers=candidate["headers"], json={"resume_id": theirs["id"]}).status_code == 404
    ok = client.patch(f"/tracker/{t['id']}", headers=candidate["headers"], json={"resume_id": uploaded_resume["id"]})
    assert ok.status_code == 200 and ok.json()["resume_id"] == uploaded_resume["id"]


def test_deleting_a_resume_clears_it_from_tracked_jobs(client, candidate, uploaded_resume, job_index):
    t = _track(client, candidate, job_index["ids"]["p1"])
    client.patch(f"/tracker/{t['id']}", headers=candidate["headers"], json={"resume_id": uploaded_resume["id"]})
    assert client.delete(f"/resumes/{uploaded_resume['id']}", headers=candidate["headers"]).status_code == 200
    assert client.get(f"/tracker/{t['id']}", headers=candidate["headers"]).json()["resume_id"] is None


def test_drafts_are_generated_from_own_material_only(client, candidate, uploaded_resume, job_index):
    t = _track(client, candidate, job_index["ids"]["p2"])  # asks for Kubernetes/AWS the resume lacks
    res = client.post(f"/tracker/{t['id']}/documents/resume/generate", headers=candidate["headers"])
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["stage"] == "Preparing"
    resume_draft = body["documents"]["resume"]["content"]
    assert resume_draft.startswith(drafts.LABEL)
    assert body["documents"]["resume"]["generator"] == drafts.GENERATOR

    for kind in ("cover_letter", "outreach"):
        r = client.post(f"/tracker/{t['id']}/documents/{kind}/generate", headers=candidate["headers"])
        assert r.status_code == 200
    docs = client.get(f"/tracker/{t['id']}", headers=candidate["headers"]).json()["documents"]

    own_skills = set(uploaded_resume["cv_skills"]) | find_skills("Senior Data Engineer")
    resume_text = "\n".join([
        "Cara Candidate", "cara.candidate@example.com", "+94 71 234 5678",
        "BSc (Hons) in Information Technology, 2023-2027", "Intern, Nimbus Systems - built REST APIs with Python and FastAPI",
    ])
    for kind, doc in docs.items():
        content = doc["content"]
        problems = drafts.check_draft(content, own_skills, [resume_text, "Senior Data Engineer"])
        assert problems == [], (kind, problems)
        body_text = content.split(drafts.NOTES_MARKER)[0]
        assert "Kubernetes" not in body_text and "AWS" not in body_text
        assert "[ADD:" in content
    # The missing skills are disclosed to the candidate, outside the draft body
    assert "Kubernetes" in docs["resume"]["content"].split(drafts.NOTES_MARKER)[1]


def test_edited_draft_is_not_overwritten_without_confirmation(client, candidate, uploaded_resume, job_index):
    t = _track(client, candidate, job_index["ids"]["p1"])
    client.post(f"/tracker/{t['id']}/documents/cover_letter/generate", headers=candidate["headers"])
    saved = client.put(f"/tracker/{t['id']}/documents/cover_letter", headers=candidate["headers"], json={"content": "My own words"})
    assert saved.json()["documents"]["cover_letter"]["edited"] is True
    assert client.post(f"/tracker/{t['id']}/documents/cover_letter/generate", headers=candidate["headers"]).status_code == 409
    forced = client.post(f"/tracker/{t['id']}/documents/cover_letter/generate", headers=candidate["headers"], json={"replace_edited": True})
    assert forced.status_code == 200 and forced.json()["documents"]["cover_letter"]["content"] != "My own words"


def test_check_draft_catches_invented_content():
    draft = "Summary\nExpert in Kubernetes. Increased revenue by 40%.\n" + drafts.NOTES_MARKER + "\nKubernetes missing"
    problems = drafts.check_draft(draft, {"python"}, ["Python developer since 2023"])
    assert any("kubernetes" in p for p in problems)
    assert any("40%" in p for p in problems)


def test_drafts_need_a_description(client, candidate, uploaded_resume):
    manual = client.post("/tracker/manual", headers=candidate["headers"], json={"title": "Some role"}).json()
    res = client.post(f"/tracker/{manual['id']}/documents/resume/generate", headers=candidate["headers"])
    assert res.status_code == 409


def test_interview_prep_is_tied_to_the_job(client, candidate, uploaded_resume, job_index):
    t = _track(client, candidate, job_index["ids"]["p1"])
    prep = client.get(f"/tracker/{t['id']}/prep", headers=candidate["headers"]).json()
    assert {w["skill"] for w in prep["walk_through"]} <= set(uploaded_resume["cv_skills"])
    assert prep["walk_through"] and prep["walk_through"][0]["from_resume"]
    assert "not the employer's actual questions" in prep["note"]


def test_profile_suggestions_never_save_and_profile_is_private_by_default(client, candidate, uploaded_resume):
    assert client.get("/profile", headers=candidate["headers"]).json()["confirmed"] is False
    s = client.get("/profile/suggestions", headers=candidate["headers"]).json()
    assert "python" in s["skills"]
    assert any("Nimbus Systems" in line for line in s["experience"])
    assert any("BSc" in line for line in s["education"])
    assert client.get("/profile", headers=candidate["headers"]).json()["confirmed"] is False

    saved = client.put("/profile", headers=candidate["headers"], json={
        "skills": ["Python", "python", "SQL"], "education": s["education"], "experience": s["experience"],
        "work_modes": ["Remote"], "preferred_locations": ["Colombo"],
    }).json()
    assert saved["confirmed"] is True and saved["skills"] == ["python", "sql"]
    assert saved["discoverable"] is False
    assert client.put("/profile", headers=candidate["headers"], json={"work_modes": ["Mars"]}).status_code == 422
