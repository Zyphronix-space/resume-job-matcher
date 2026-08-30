"""
Core resume/job-description analysis: PDF text extraction, the
sentence-transformer model, semantic similarity, and taxonomy skill
detection.

This is the one ML/NLP core used everywhere in the app — the single-job
/analyze endpoint and internship matching (job_matcher.py) both call the
same functions here. There is no separate "smarter" model for internship
matching; it's the same explainable pipeline applied to more than one job
description at a time.
"""

import io
import re

import pdfplumber
from fastapi import HTTPException
from sentence_transformers import SentenceTransformer, util

from resume_sections import segment_resume, structure_score
from skills_taxonomy import SKILLS

# Loaded once at import time (i.e. once per process, at application
# startup) and reused for every request — never re-instantiated per request.
model = SentenceTransformer("all-MiniLM-L6-v2")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as exc:
        # A malformed/corrupt file (or one that's merely named .pdf) reaches
        # pdfminer as a parse error, not an HTTPException — without this it
        # would propagate past FastAPI's normal error handling and escape
        # without CORS headers, which the browser then misreports as a
        # network failure instead of a normal 4xx response.
        raise HTTPException(status_code=400, detail="Could not read the PDF file") from exc


def find_skills(text: str) -> set[str]:
    text_lower = text.lower()
    found = set()
    for skill in SKILLS:
        pattern = r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])"
        if re.search(pattern, text_lower):
            found.add(skill)
    return found


def embed(text_or_texts):
    """Encodes one string or a list of strings into sentence embeddings in a
    single batched model call — used so matching a resume against many job
    postings doesn't invoke the model once per posting."""
    return model.encode(text_or_texts, convert_to_tensor=True)


def score_from_embeddings(embedding_a, embedding_b) -> float:
    score = util.cos_sim(embedding_a, embedding_b).item()
    # cosine similarity is in [-1, 1]; clamp to [0, 1] then scale to a percentage
    return round(max(0.0, min(1.0, score)) * 100, 1)


def semantic_similarity(text_a: str, text_b: str) -> float:
    embeddings = embed([text_a, text_b])
    return score_from_embeddings(embeddings[0], embeddings[1])


def extract_resume_profile(cv_text: str) -> dict:
    """
    Resume-only analysis: everything that does NOT depend on any specific
    job description. Computed once per uploaded CV and reused across every
    job it's matched against (see job_matcher.match_jobs), rather than
    re-parsing the same resume text once per posting.
    """
    detected_sections, cv_section_text, has_contact = segment_resume(cv_text)
    return {
        "cv_skills": find_skills(cv_text),
        "cv_section_text": cv_section_text,
        "resume_sections": {"Contact Information": has_contact, **detected_sections},
        "resume_structure_score": structure_score(detected_sections, has_contact),
    }
