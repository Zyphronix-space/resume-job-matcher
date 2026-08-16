"""
Resume <-> Job Match Analyzer API.

Given a CV (PDF) and a job description (text), returns:
- an overall semantic match score (sentence embeddings + cosine similarity)
- which known skills appear in both
- which skills the job description asks for that the CV doesn't mention

Run with:
    uvicorn main:app --reload
"""

import io
import re

import pdfplumber
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

from skills_taxonomy import SKILLS

app = FastAPI(title="Resume Match Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Loaded once at startup and reused for every request.
model = SentenceTransformer("all-MiniLM-L6-v2")


class MatchResponse(BaseModel):
    match_score: float
    matched_skills: list[str]
    missing_skills: list[str]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def find_skills(text: str) -> set[str]:
    text_lower = text.lower()
    found = set()
    for skill in SKILLS:
        pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
        if re.search(pattern, text_lower):
            found.add(skill)
    return found


def semantic_similarity(text_a: str, text_b: str) -> float:
    embeddings = model.encode([text_a, text_b], convert_to_tensor=True)
    score = util.cos_sim(embeddings[0], embeddings[1]).item()
    # cosine similarity is in [-1, 1]; clamp to [0, 1] then scale to a percentage
    return round(max(0.0, min(1.0, score)) * 100, 1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze", response_model=MatchResponse)
async def analyze(cv_file: UploadFile = File(...), job_description: str = Form(...)):
    if not cv_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="CV must be a PDF file")

    cv_bytes = await cv_file.read()
    cv_text = extract_text_from_pdf(cv_bytes)
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the PDF")

    cv_skills = find_skills(cv_text)
    jd_skills = find_skills(job_description)

    matched = sorted(cv_skills & jd_skills)
    missing = sorted(jd_skills - cv_skills)

    score = semantic_similarity(cv_text, job_description)

    return MatchResponse(match_score=score, matched_skills=matched, missing_skills=missing)
