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
from skills_taxonomy import SKILLS

_TAXONOMY = set(SKILLS)


def _normalize(skills) -> set[str]:
    return {s.strip().lower() for s in (skills or [])} & _TAXONOMY


def _skill_result(
    cv_text: str,
    profile: dict,
    job_description: str,
    match_score: float,
    required_skills: list[str] | None = None,
    preferred_skills: list[str] | None = None,
) -> dict:
    """
    required_skills/preferred_skills let a caller (recruiter Job CRUD)
    contribute skills the recruiter explicitly tagged, even if that exact
    wording never appears in the free-text description — normalized against
    the same taxonomy used everywhere else, so nothing untracked slips in.
    A skill the recruiter explicitly marked required is treated as at least
    "High" importance even if the description text alone wouldn't imply
    that, since it's a real, explicit signal rather than an inferred one.
    """
    cv_skills = profile["cv_skills"]
    required_extra = _normalize(required_skills)
    preferred_extra = _normalize(preferred_skills)
    jd_skills = find_skills(job_description) | required_extra | preferred_extra

    matched = sorted(cv_skills & jd_skills)
    missing = sorted(jd_skills - cv_skills)
    importance = compute_skill_importance(job_description, jd_skills)
    for skill in required_extra:
        entry = importance.setdefault(skill, {"level": "High", "count_in_description": 0, "in_required_section": True})
        entry["in_required_section"] = True
        if entry["level"] not in ("Critical",):
            entry["level"] = "Critical" if entry["count_in_description"] >= 2 else "High"

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


def match_single(
    cv_text: str,
    profile: dict,
    job_description: str,
    required_skills: list[str] | None = None,
    preferred_skills: list[str] | None = None,
) -> dict:
    """Used by /analyze and single-job applications: one resume against one
    job description (plus, optionally, its structured skill tags)."""
    embeddings = embed([cv_text, job_description])
    score = score_from_embeddings(embeddings[0], embeddings[1])
    return _skill_result(cv_text, profile, job_description, score, required_skills, preferred_skills)


def match_jobs(cv_text: str, profile: dict, jobs: list) -> dict[str, dict]:
    """
    Used for matching one resume against many job postings at once.
    Encodes the resume once and every job description together in a single
    batched model call, rather than invoking the model once per posting —
    the CV is also only uploaded/parsed once for the whole batch. Each job
    object needs `.id` and `.description`; `.required_skills`/
    `.preferred_skills`, if present, are folded into the skill match too.
    """
    if not jobs:
        return {}

    resume_embedding = embed(cv_text)
    jd_embeddings = embed([job.description for job in jobs])

    results = {}
    for job, jd_embedding in zip(jobs, jd_embeddings):
        score = score_from_embeddings(resume_embedding, jd_embedding)
        results[job.id] = _skill_result(
            cv_text, profile, job.description, score,
            getattr(job, "required_skills", None), getattr(job, "preferred_skills", None),
        )
    return results
