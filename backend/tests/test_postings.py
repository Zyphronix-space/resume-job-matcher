"""Ingestion (dedupe, expiry, failure handling) and the public job index."""

import db_models
import job_ingest
from database import SessionLocal
from job_sources import SourceError
from tests.conftest import make_posting


def _postings(db):
    return {p.external_id: p for p in db.query(db_models.JobPosting).all()}


def test_sync_expires_missing_postings_and_reopens_returning_ones(job_index):
    with SessionLocal() as db:
        source = db.get(db_models.JobSource, job_index["source_id"])
        result = job_ingest.upsert_postings(db, source, [make_posting("p1", "Software Engineering Intern")])
        db.commit()
        assert result["expired"] == 2
        rows = _postings(db)
        assert rows["p1"].status == "active"
        assert rows["p2"].status == "expired" and rows["p2"].closed_at is not None

        result = job_ingest.upsert_postings(db, source, [make_posting("p1", "Software Engineering Intern"),
                                                         make_posting("p2", "Senior Data Engineer")])
        db.commit()
        assert result["reopened"] == 1
        assert _postings(db)["p2"].status == "active" and _postings(db)["p2"].closed_at is None


def test_failed_fetch_changes_nothing(job_index, monkeypatch):
    def boom(*a, **kw):
        raise SourceError("Could not reach the source (ConnectTimeout)")
    monkeypatch.setattr(job_ingest, "fetch_board", boom)
    with SessionLocal() as db:
        source = db.get(db_models.JobSource, job_index["source_id"])
        result = job_ingest.sync_source(db, source)
        assert result["status"] == "error"
        assert source.last_status == "error" and "ConnectTimeout" in source.last_error
        assert all(p.status == "active" for p in _postings(db).values())


def test_same_vacancy_from_two_sources_is_shown_once(client, job_index):
    with SessionLocal() as db:
        other = db_models.JobSource(kind="greenhouse", board="examplelabs", company="Example Labs")
        db.add(other)
        db.commit()
        # Same company/title/location, different case and punctuation
        job_ingest.upsert_postings(db, other, [make_posting("gh-9", "software engineering intern!", location="Colombo, Sri Lanka")])
        db.commit()
        dup = db.query(db_models.JobPosting).filter_by(external_id="gh-9").one()
        assert dup.duplicate_of == job_index["ids"]["p1"]

    titles = [r["title"] for r in client.get("/postings").json()["results"]]
    assert titles.count("Software Engineering Intern") == 1 and "software engineering intern!" not in titles


def test_dedupe_key_normalizes():
    assert job_ingest.dedupe_key("Example Labs", "Software Engineer (Remote)", "Colombo") == \
        job_ingest.dedupe_key("example labs", "software   engineer", "colombo")


def test_index_is_public_and_filters(client, job_index):
    res = client.get("/postings")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 3 and body["has_resume"] is False
    assert all(r["skill_overlap"] is None for r in body["results"])

    def titles(**params):
        return {r["title"] for r in client.get("/postings", params=params).json()["results"]}

    assert titles(open_to_sri_lanka="true") == {"Software Engineering Intern", "Graduate Frontend Developer"}
    assert titles(work_mode="Remote") == {"Senior Data Engineer", "Graduate Frontend Developer"}
    assert titles(level="Internship,Graduate") == {"Software Engineering Intern", "Graduate Frontend Developer"}
    assert titles(skill="react") == {"Graduate Frontend Developer"}
    assert titles(q="kubernetes") == {"Senior Data Engineer"}
    assert titles(q="EXAMPLE intern") == {"Software Engineering Intern"}
    assert titles(country="Sri Lanka") == {"Software Engineering Intern"}


def test_expired_postings_hidden_unless_asked(client, job_index):
    with SessionLocal() as db:
        p = db.get(db_models.JobPosting, job_index["ids"]["p2"])
        p.status = "expired"
        db.commit()
    assert client.get("/postings").json()["total"] == 2
    assert client.get("/postings", params={"include_expired": "true"}).json()["total"] == 3
    detail = client.get(f"/postings/{job_index['ids']['p2']}").json()
    assert detail["status"] == "expired"


def test_manual_posting_past_its_closing_date_expires(client, recruiter):
    res = client.post("/admin/postings", headers=recruiter["headers"], json={
        "title": "Trainee Software Engineer", "company": "Real Employer (Pvt) Ltd", "location": "Colombo",
        "description": "Requirements: Java, SQL and a willingness to learn.",
        "apply_url": "https://example.lk/careers/trainee", "source_url": "https://example.lk/careers/trainee",
        "closes_on": "2020-01-01",
    })
    assert res.status_code == 200, res.text
    assert client.get("/postings").json()["total"] == 0
    assert client.get(f"/postings/{res.json()['id']}").json()["status"] == "expired"


def test_detail_has_source_attribution_and_verification(client, job_index):
    detail = client.get(f"/postings/{job_index['ids']['p1']}").json()
    assert detail["source"]["kind"] == "lever" and detail["source"]["name"] == "Example Labs"
    assert detail["apply_url"].startswith("https://jobs.lever.co/")
    assert detail["last_verified_at"] and detail["description"]


def test_signed_in_candidate_sees_skill_overlap(client, candidate, uploaded_resume, job_index):
    body = client.get("/postings", headers=candidate["headers"], params={"sort": "skills"}).json()
    assert body["has_resume"] is True
    first = body["results"][0]
    assert first["title"] == "Software Engineering Intern"
    assert first["skill_overlap"]["found"] == first["skill_overlap"]["total"]


def test_assessment_requires_resume(client, candidate, job_index):
    res = client.get(f"/postings/{job_index['ids']['p1']}/assessment", headers=candidate["headers"])
    assert res.status_code == 409


def test_assessment_explains_requirements(client, candidate, uploaded_resume, job_index):
    res = client.get(f"/postings/{job_index['ids']['p2']}/assessment", headers=candidate["headers"])
    assert res.status_code == 200, res.text
    a = res.json()
    by_text = {r["text"]: r for r in a["requirements"]}
    assert by_text["Kubernetes and AWS"]["status"] == "not_found"
    # Years of experience can't be verified from text: shown, never scored
    years = by_text["7+ years of data engineering experience"]
    assert years["status"] == "check" and "7+" in years["note"]
    assert set(a["missing_skills"]) >= {"kubernetes", "aws"}
    # No suggestion tells the candidate to claim a skill outright
    for s in a["suggestions"]:
        if "kubernetes" in s["text"] or "aws" in s["text"]:
            assert "If you have used it" in s["text"] and "don't claim it" in s["text"]
    assert any("not whether you'd be hired" in line for line in a["method"])


def test_assessment_is_candidate_only(client, recruiter, job_index):
    assert client.get(f"/postings/{job_index['ids']['p1']}/assessment", headers=recruiter["headers"]).status_code == 403
