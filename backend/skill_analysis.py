"""
Skill-level analysis beyond simple presence/absence: importance scoring,
coverage, categorization, evidence, and gap ordering.

Every number here comes from plain counting and regex matching over the
actual extracted text — there is no learned model or hidden weighting
involved, so each result can be traced back to a specific rule below.
"""

import re

from skills_taxonomy import SKILL_TO_CATEGORY

# Headings/phrases used to tell "must have" job-description content apart
# from "nice to have" content. This is a heuristic over plain text, not a
# structured parse of the job posting.
REQUIRED_SECTION_HEADINGS = [
    "required", "requirements", "must have", "you have", "you'll need",
    "what you'll need", "minimum qualifications", "qualifications",
]
NICE_TO_HAVE_HEADINGS = [
    "nice to have", "preferred", "bonus", "good to have", "plus",
]


def _skill_pattern(skill: str) -> re.Pattern:
    return re.compile(r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])")


def count_occurrences(text: str, skill: str) -> int:
    return len(_skill_pattern(skill).findall(text.lower()))


def _find_required_span(text_lower: str) -> tuple[int, int] | None:
    """
    Returns the (start, end) character range between the earliest
    "required/must-have"-style heading and the next "nice to have"-style
    heading (or the end of the text). Returns None if no such heading
    exists, in which case the whole job description is treated as
    undifferentiated (no skill gets the "in_required_section" boost).
    """
    start = None
    for kw in REQUIRED_SECTION_HEADINGS:
        m = re.search(r"\b" + re.escape(kw) + r"\b", text_lower)
        if m and (start is None or m.start() < start):
            start = m.start()
    if start is None:
        return None

    end = len(text_lower)
    for kw in NICE_TO_HAVE_HEADINGS:
        m = re.search(r"\b" + re.escape(kw) + r"\b", text_lower[start:])
        if m:
            end = min(end, start + m.start())
    return start, end


def compute_skill_importance(jd_text: str, skills: set[str]) -> dict[str, dict]:
    """
    Importance is derived from two explainable signals:
      - whether the skill's first mention falls inside a "required" /
        "must have" style block of the job description
      - how many times the skill is mentioned overall

    Critical: in a required-style block AND mentioned 2+ times
    High:     in a required-style block OR mentioned 2+ times
    Medium:   detected, but neither of the above
    """
    text_lower = jd_text.lower()
    required_span = _find_required_span(text_lower)

    importance = {}
    for skill in skills:
        count = count_occurrences(jd_text, skill)
        in_required = False
        if required_span:
            m = _skill_pattern(skill).search(text_lower)
            if m and required_span[0] <= m.start() < required_span[1]:
                in_required = True

        if in_required and count >= 2:
            level = "Critical"
        elif in_required or count >= 2:
            level = "High"
        else:
            level = "Medium"

        importance[skill] = {
            "level": level,
            "count_in_description": count,
            "in_required_section": in_required,
        }
    return importance


def categorize_skills(matched: list[str], missing: list[str]) -> dict[str, dict[str, list[str]]]:
    categories: dict[str, dict[str, list[str]]] = {}
    for skill in matched:
        cat = SKILL_TO_CATEGORY.get(skill, "Other")
        categories.setdefault(cat, {"matched": [], "missing": []})["matched"].append(skill)
    for skill in missing:
        cat = SKILL_TO_CATEGORY.get(skill, "Other")
        categories.setdefault(cat, {"matched": [], "missing": []})["missing"].append(skill)
    return categories


def compute_skill_coverage(matched: list[str], jd_skills: set[str]) -> float:
    if not jd_skills:
        return 0.0
    return round(len(matched) / len(jd_skills) * 100, 1)


SNIPPET_RADIUS = 80


def extract_evidence(cv_text: str, section_text: dict[str, str], skill: str) -> dict:
    """
    Finds which resume sections mention `skill`, plus one short excerpt of
    surrounding text from the raw CV for context. The snippet is always a
    direct slice of the actual extracted text — nothing is generated.
    """
    pattern = _skill_pattern(skill)
    sections_found = [name for name, text in section_text.items() if pattern.search(text.lower())]

    snippet = None
    m = pattern.search(cv_text.lower())
    if m:
        start = max(0, m.start() - SNIPPET_RADIUS)
        end = min(len(cv_text), m.end() + SNIPPET_RADIUS)
        snippet = cv_text[start:end].strip().replace("\n", " ")
        if start > 0:
            snippet = "…" + snippet
        if end < len(cv_text):
            snippet = snippet + "…"

    return {"sections": sections_found, "snippet": snippet}


# --- Skill gap roadmap -------------------------------------------------

# Manually curated "useful before" relationships for a subset of taxonomy
# skills. This is a hand-authored ordering hint, not inferred from data —
# a skill with no entry here is simply ranked by importance alone.
SKILL_PREREQUISITES = {
    "docker": {"prereqs": [], "note": "Foundation for containerized deployment."},
    "kubernetes": {"prereqs": ["docker"], "note": "Container orchestration — builds on containerizing an app with Docker."},
    "aws": {"prereqs": [], "note": "Cloud platform for hosting and managing infrastructure."},
    "azure": {"prereqs": [], "note": "Cloud platform for hosting and managing infrastructure."},
    "gcp": {"prereqs": [], "note": "Cloud platform for hosting and managing infrastructure."},
    "terraform": {"prereqs": ["aws", "azure", "gcp"], "note": "Infrastructure-as-code — most useful once you're working with a cloud platform."},
    "ci/cd": {"prereqs": ["git"], "note": "Automating build/test/deploy — assumes a version-controlled codebase."},
    "react": {"prereqs": ["javascript"], "note": "UI library built on JavaScript."},
    "next.js": {"prereqs": ["react"], "note": "Framework built on top of React."},
    "redux": {"prereqs": ["react"], "note": "State-management library commonly paired with React."},
    "typescript": {"prereqs": ["javascript"], "note": "A typed superset of JavaScript."},
    "django": {"prereqs": ["python"], "note": "Python web framework."},
    "flask": {"prereqs": ["python"], "note": "Python web framework."},
    "fastapi": {"prereqs": ["python"], "note": "Python web framework."},
    "pytorch": {"prereqs": ["python", "machine learning"], "note": "Deep-learning framework built on Python/ML fundamentals."},
    "tensorflow": {"prereqs": ["python", "machine learning"], "note": "Deep-learning framework built on Python/ML fundamentals."},
    "deep learning": {"prereqs": ["machine learning"], "note": "A subfield of machine learning."},
}

IMPORTANCE_RANK = {"Critical": 0, "High": 1, "Medium": 2}


def build_roadmap(missing_skills: list[str], importance: dict[str, dict]) -> list[dict]:
    """
    Orders missing skills primarily by importance, then applies the known
    prerequisite relationships above so a foundational skill is listed
    before something built on top of it (e.g. Docker before Kubernetes)
    when both are gaps. Skills with no defined relationship are simply
    left in importance order.
    """
    ranked = sorted(
        missing_skills,
        key=lambda s: (
            IMPORTANCE_RANK.get(importance.get(s, {}).get("level"), 3),
            -importance.get(s, {}).get("count_in_description", 0),
        ),
    )

    ordered: list[str] = []
    placed: set[str] = set()

    def place(skill: str) -> None:
        if skill in placed or skill not in ranked:
            return
        for prereq in SKILL_PREREQUISITES.get(skill, {}).get("prereqs", []):
            place(prereq)
        placed.add(skill)
        ordered.append(skill)

    for skill in ranked:
        place(skill)

    return [
        {
            "skill": skill,
            "importance": importance.get(skill, {}).get("level", "Medium"),
            "note": SKILL_PREREQUISITES.get(skill, {}).get("note"),
        }
        for skill in ordered
    ]
