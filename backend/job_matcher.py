"""
Matches a candidate's resume against one or many job descriptions —
internship postings included. This is not a separate/smarter system from
the original single-job analyzer: /analyze and internship matching both
call match_single/match_jobs below, which are just resume_analyzer.py's
semantic similarity plus skill_analysis.py's taxonomy matching, applied per
job description.
"""

from resume_analyzer import embed, find_skills, score_from_embeddings
from skill_analysis import (
    build_roadmap,
    categorize_skills,
    compute_skill_coverage,
    compute_skill_importance,
    extract_evidence,
)


def _skill_result(cv_text: str, profile: dict, job_description: str, match_score: float) -> dict:
    cv_skills = profile["cv_skills"]
    jd_skills = find_skills(job_description)

    matched = sorted(cv_skills & jd_skills)
    missing = sorted(jd_skills - cv_skills)
    importance = compute_skill_importance(job_description, jd_skills)
    evidence = {
        skill: extract_evidence(cv_text, profile["cv_section_text"], skill) for skill in matched
    }

    return {
        "match_score": match_score,
        "matched_skills": matched,
        "missing_skills": missing,
        "skill_coverage": compute_skill_coverage(matched, jd_skills),
        "skill_categories": categorize_skills(matched, missing),
        "skill_importance": importance,
        "skill_evidence": evidence,
        "skill_gap_roadmap": build_roadmap(missing, importance),
    }


def match_single(cv_text: str, profile: dict, job_description: str) -> dict:
    """Used by /analyze: one resume against one job description."""
    embeddings = embed([cv_text, job_description])
    score = score_from_embeddings(embeddings[0], embeddings[1])
    return _skill_result(cv_text, profile, job_description, score)


def match_jobs(cv_text: str, profile: dict, jobs: list) -> dict[str, dict]:
    """
    Used by /jobs/match: one resume against many internship postings.
    Encodes the resume once and every job description together in a single
    batched model call, rather than invoking the model once per posting —
    the CV is also only uploaded/parsed once for the whole batch.
    """
    if not jobs:
        return {}

    resume_embedding = embed(cv_text)
    jd_embeddings = embed([job.description for job in jobs])

    results = {}
    for job, jd_embedding in zip(jobs, jd_embeddings):
        score = score_from_embeddings(resume_embedding, jd_embedding)
        results[job.id] = _skill_result(cv_text, profile, job.description, score)
    return results
