"""
Shared pytest fixtures. Env vars for an isolated test database and resume
storage dir MUST be set before anything imports database.py/main.py (both
read them at module-import time), so this happens at the top of this file,
before any other backend import below.
"""

import os
import tempfile

_tmp_db_dir = tempfile.mkdtemp(prefix="recruitai-test-db-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db_dir.replace(os.sep, '/')}/test.db"
os.environ["RESUME_STORAGE_DIR"] = tempfile.mkdtemp(prefix="recruitai-test-resumes-")
os.environ["JWT_SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["ALLOWED_ORIGINS"] = ""

import pytest
from fastapi.testclient import TestClient

from database import Base, engine
from main import app


@pytest.fixture(autouse=True)
def clean_db():
    """Every test starts against a completely empty schema."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


def make_pdf_bytes(lines: list[str]) -> bytes:
    """
    Builds a minimal, valid, real PDF with extractable text (pdfplumber can
    read it) — no PDF-writer library is installed, so this constructs the
    handful of PDF objects and xref table by hand.
    """
    content_lines = []
    y = 750
    for line in lines:
        escaped = line.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
        content_lines.append(f"BT /F1 11 Tf 60 {y} Td ({escaped}) Tj ET")
        y -= 16
    content = "\n".join(content_lines).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> "
        b"/MediaBox [0 0 612 792] /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + obj + b"\nendobj\n"

    xref_offset = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += f"{off:010d} 00000 n \n".encode()
    out += b"trailer\n"
    out += f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode()
    out += b"startxref\n"
    out += f"{xref_offset}\n".encode()
    out += b"%%EOF"
    return bytes(out)


@pytest.fixture
def sample_resume_pdf():
    return make_pdf_bytes([
        "Cara Candidate",
        "cara.candidate@example.com  +94 71 234 5678",
        "",
        "Professional Summary",
        "Motivated software engineering student seeking an internship.",
        "",
        "Education",
        "BSc (Hons) in Information Technology, 2023-2027",
        "",
        "Work Experience",
        "Intern, Nimbus Systems - built REST APIs with Python and FastAPI",
        "",
        "Skills",
        "Python, SQL, Git, React, FastAPI, Docker",
    ])


def signup(client, email, role, full_name="Test User", password="Password123"):
    res = client.post("/auth/signup", json={
        "full_name": full_name, "email": email, "password": password, "role": role,
    })
    assert res.status_code == 200, res.text
    return res.json()


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def recruiter(client):
    """A fresh recruiter account (also the first user -> admin) + headers."""
    data = signup(client, "recruiter@example.com", "recruiter", "Rachel Recruiter")
    return {"user": data["user"], "headers": auth_headers(data["access_token"])}


@pytest.fixture
def candidate(client, recruiter):
    """A fresh candidate account, created after the recruiter so it does
    NOT become the first-user admin."""
    data = signup(client, "candidate@example.com", "candidate", "Cara Candidate")
    return {"user": data["user"], "headers": auth_headers(data["access_token"])}


@pytest.fixture
def open_job(client, recruiter):
    res = client.post("/jobs", headers=recruiter["headers"], json={
        "title": "Backend Engineer Intern",
        "description": "Build REST APIs. Required: Python, SQL. Nice to have: Docker.",
        "required_skills": ["python", "sql", "fastapi"],
        "preferred_skills": ["docker", "kubernetes"],
        "experience": "0-1 years",
        "education": "Pursuing BSc in CS or related",
        "location": "Colombo, Sri Lanka",
        "employment_type": "Internship",
        "status": "Open",
    })
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture
def uploaded_resume(client, candidate, sample_resume_pdf):
    res = client.post(
        "/resumes", headers=candidate["headers"],
        files={"file": ("resume.pdf", sample_resume_pdf, "application/pdf")},
    )
    assert res.status_code == 200, res.text
    return res.json()


@pytest.fixture
def applied_application(client, candidate, open_job, uploaded_resume):
    res = client.post(f"/jobs/{open_job['id']}/apply", headers=candidate["headers"], json={})
    assert res.status_code == 200, res.text
    return res.json()
