"""
Explainable fit assessment for one resume against one real vacancy.

Built on the existing engine (job_matcher.match_single): the semantic
similarity score and the taxonomy skill match are unchanged. On top of
that, the posting is read one requirement line at a time, and each line
gets one of four outcomes:

  met        every skill the line names appears in the resume
  partial    some of them do
  not_found  none of them do
  check      the line asks for something this tool cannot verify from
             text (years of experience, a degree, a spoken language,
             anything outside the skills list). It's shown to the
             candidate to judge, never counted for or against them.

Nothing here predicts a hiring outcome. The numbers are counts and a text
similarity; suggestions are rules over those counts, and every suggestion
about adding something is conditional on it being true.
"""

import re

from job_matcher import match_single
from resume_analyzer import find_skills
from skill_analysis import _find_required_span, extract_evidence
from skills_taxonomy import SKILL_TO_CATEGORY, SKILLS

_BULLET_RE = re.compile(r"^\s*([-*•·▪◦‣]|\d+[.)])\s+")
_CUE_RE = re.compile(
    r"\b(experience|knowledge|familiar|proficien|understanding|ability|able to|skills?|degree|"
    r"bachelor|master|diploma|years?|must|required|you have|you'll|you will|strong|background in|fluent)\b",
    re.I,
)
_YEARS_RE = re.compile(r"\b(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*)?(?:years?|yrs?)\b", re.I)
_DEGREE_RE = re.compile(r"\b(degree|bachelor'?s?|b\.?sc|b\.?eng|master'?s?|m\.?sc|ph\.?d|diploma|hnd)\b", re.I)
_LANGUAGE_RE = re.compile(r"\b(english|sinhala|tamil|french|german|spanish|japanese|mandarin)\b", re.I)

MAX_REQUIREMENTS = 14

METHOD = [
    "Skills: the posting and your resume are both checked against the same list of "
    f"{len(SKILLS)} named skills and tools. A skill counts as found only if your resume text contains it.",
    "Text similarity: your resume and the posting are compared with a sentence-embedding model "
    "(all-MiniLM-L6-v2). It measures how alike the two texts read, not whether you'd be hired.",
    "Requirements: each requirement line in the posting is checked for named skills. Lines about years "
    "of experience, degrees or languages are shown for you to check; they aren't scored.",
    "No hiring outcome is predicted, and no score is adjusted to look better.",
]


def requirement_lines(description: str) -> list[str]:
    """Bulleted or requirement-like lines, preferring the posting's own
    requirements section when it has a recognisable heading."""
    text = description or ""
    span = _find_required_span(text.lower())
    region = text[span[0]:span[1]] if span else text
    lines, seen = [], set()
    for raw in region.splitlines():
        is_bullet = bool(_BULLET_RE.match(raw))
        line = _BULLET_RE.sub("", raw).strip()
        if not (12 <= len(line) <= 300):
            continue
        if not (is_bullet or _CUE_RE.search(line)):
            continue
        key = line.lower()
        if key in seen:
            continue
        seen.add(key)
        lines.append(line)
        if len(lines) >= MAX_REQUIREMENTS:
            break
    if not lines and span:
        return requirement_lines_without_span(text)
    return lines


def requirement_lines_without_span(text: str) -> list[str]:
    out = []
    for raw in text.splitlines():
        line = _BULLET_RE.sub("", raw).strip()
        if 12 <= len(line) <= 300 and _BULLET_RE.match(raw):
            out.append(line)
        if len(out) >= MAX_REQUIREMENTS:
            break
    return out


# Sections where a skill mention is evidence of use, in the order they're
# preferred. A bare entry in the Skills list is a claim, not evidence.
EVIDENCE_SECTIONS = ("Work Experience", "Projects", "Certifications", "Education", "Professional Summary")


def evidence_line(section_text: dict, skill: str) -> dict | None:
    """The candidate's own resume line that shows a skill in use: the first
    line mentioning it in Work Experience, Projects, etc. None when the
    skill only appears in the Skills list (or nowhere)."""
    pattern = re.compile(r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])")
    for section in EVIDENCE_SECTIONS:
        for raw in (section_text.get(section) or "").splitlines():
            line = _BULLET_RE.sub("", raw).strip()
            if line and pattern.search(line.lower()):
                return {"section": section, "line": line[:300]}
    return None


def _resume_has_degree(cv_text: str, section_text: dict) -> bool:
    return bool(_DEGREE_RE.search(section_text.get("Education", "") or cv_text))


def assess_requirement(line: str, cv_text: str, section_text: dict, cv_skills: set[str]) -> dict:
    skills = sorted(find_skills(line))
    if skills:
        found = [s for s in skills if s in cv_skills]
        missing = [s for s in skills if s not in cv_skills]
        status = "met" if not missing else ("partial" if found else "not_found")
        evidence = []
        for skill in found:
            ev = extract_evidence(cv_text, section_text, skill)
            evidence.append({"skill": skill, "sections": ev["sections"], "snippet": ev["snippet"]})
        return {"text": line, "status": status, "skills_found": found, "skills_missing": missing, "evidence": evidence, "note": ""}

    note = "This isn't something the tool can check from text. Decide for yourself whether you meet it."
    years = _YEARS_RE.search(line)
    if years:
        note = f"Asks for about {years.group(1)}+ years. Dates in your resume aren't added up automatically, so check this yourself."
    elif _DEGREE_RE.search(line):
        note = (
            "Your resume mentions a degree or diploma. Check that its subject and level match what's asked."
            if _resume_has_degree(cv_text, section_text)
            else "No degree or diploma was found in your resume text. If you have one, make sure it's listed."
        )
    elif _LANGUAGE_RE.search(line):
        note = "A language requirement. Only you can confirm this; mention it on your resume if it applies."
    return {"text": line, "status": "check", "skills_found": [], "skills_missing": [], "evidence": [], "note": note}


def build_suggestions(result: dict, profile: dict, requirements: list[dict], confirmed_skills: set[str]) -> list[dict]:
    """Rules only. Each suggestion names the resume section it concerns,
    and anything about adding content is conditional on it being true."""
    out = []
    importance = result.get("skill_importance") or {}
    section_text = profile.get("cv_section_text") or {}
    sections = profile.get("resume_sections") or {}

    for skill in result.get("missing_skills") or []:
        level = (importance.get(skill) or {}).get("level", "Medium")
        if skill in confirmed_skills:
            out.append({
                "section": "Skills", "priority": level,
                "text": f"Your profile lists {skill}, but your resume doesn't mention it. Add it, ideally with where you used it.",
            })
        elif level in ("Critical", "High") and SKILL_TO_CATEGORY.get(skill) != "Soft Skills":
            out.append({
                "section": "Work Experience or Projects", "priority": level,
                "text": f"The posting stresses {skill}. If you have used it, add a specific example. "
                        "If you haven't, don't claim it; it's a gap to work on.",
            })

    for skill in result.get("matched_skills") or []:
        level = (importance.get(skill) or {}).get("level", "Medium")
        if SKILL_TO_CATEGORY.get(skill) == "Soft Skills":
            continue
        if level in ("Critical", "High") and evidence_line(section_text, skill) is None:
            out.append({
                "section": "Work Experience or Projects", "priority": level,
                "text": f"{skill} only appears in your skills list. Show where you actually used it, "
                        "so a reader sees evidence rather than a keyword.",
            })

    for name in ("Work Experience", "Projects", "Skills", "Education"):
        if name in sections and not sections.get(name):
            out.append({
                "section": name, "priority": "Medium",
                "text": f"No '{name}' heading was found in your resume. Applicant systems and readers look for one.",
            })

    for req in requirements:
        if req["status"] == "check" and "years" in req["note"]:
            out.append({"section": "Work Experience", "priority": "Medium", "text": f"“{req['text']}”: {req['note']}"})
            break

    rank = {"Critical": 0, "High": 1, "Medium": 2}
    out.sort(key=lambda s: rank.get(s["priority"], 3))
    return out[:8]


def assess(cv_text: str, profile: dict, title: str, description: str,
           required_skills: list[str] | None = None, confirmed_skills: list[str] | None = None) -> dict:
    job_text = f"{title}\n\n{description}".strip()
    result = match_single(cv_text, profile, job_text, required_skills)
    cv_skills = set(profile.get("cv_skills") or [])
    section_text = profile.get("cv_section_text") or {}
    requirements = [assess_requirement(line, cv_text, section_text, cv_skills) for line in requirement_lines(description)]
    suggestions = build_suggestions(result, profile, requirements, set(confirmed_skills or []))
    counts = {k: sum(1 for r in requirements if r["status"] == k) for k in ("met", "partial", "not_found", "check")}
    total = len(result["matched_skills"]) + len(result["missing_skills"])
    if total:
        summary = f"{len(result['matched_skills'])} of the {total} skills this posting names appear in your resume."
    else:
        summary = "This posting doesn't name any skills from the skills list, so only the text similarity and requirement lines apply."
    evidence_lines = {s: line for s in result["matched_skills"] if (line := evidence_line(section_text, s))}
    return {
        **result,
        "evidence_lines": evidence_lines,
        "summary": summary,
        "requirements": requirements,
        "requirement_counts": counts,
        "suggestions": suggestions,
        "resume_sections": profile.get("resume_sections") or {},
        "method": METHOD,
    }
