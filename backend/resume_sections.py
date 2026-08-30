"""
Lightweight resume-structure ("ATS readiness") checks.

This performs simple, explainable checks for the presence of resume
sections that are broadly recommended for machine-readable resumes — it is
NOT a simulation of any specific company's applicant tracking system, and
makes no claim of compatibility with one. It just looks for recognizable
section headings (and a contact-details pattern) in the extracted text.
"""

import re

# Each entry maps a human-readable section name to a weight (how much it
# contributes to the structure score out of 100) and a list of heading
# phrases that would identify it in a resume.
SECTION_DEFINITIONS = {
    "Professional Summary": {
        "weight": 10,
        "headings": ["summary", "professional summary", "profile", "objective", "career objective"],
    },
    "Education": {
        "weight": 15,
        "headings": ["education", "academic background", "academic qualifications"],
    },
    "Work Experience": {
        "weight": 20,
        "headings": ["experience", "work experience", "employment history", "professional experience"],
    },
    "Projects": {
        "weight": 10,
        "headings": ["projects", "personal projects", "academic projects"],
    },
    "Skills": {
        "weight": 20,
        "headings": ["skills", "technical skills", "core competencies", "key skills"],
    },
    "Certifications": {
        "weight": 5,
        "headings": ["certifications", "certificates", "licenses"],
    },
    "Languages": {
        "weight": 5,
        "headings": ["languages"],
    },
    "Achievements": {
        "weight": 5,
        "headings": ["achievements", "awards", "accomplishments", "honors"],
    },
}

# Contact info isn't a heading-based section — it's detected separately via
# an email/phone pattern near the top of the document.
CONTACT_WEIGHT = 10

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{7,}\d)")
CONTACT_SEARCH_CHARS = 600  # contact details are almost always near the top


def _is_heading_line(line: str, keywords: list[str]) -> bool:
    stripped = line.strip().strip(":").lower()
    if not stripped or len(stripped) > 40:
        return False
    return any(stripped == kw or stripped.startswith(kw) for kw in keywords)


def segment_resume(text: str) -> tuple[dict[str, bool], dict[str, str], bool]:
    """
    Splits resume text into sections by locating heading lines, then slicing
    the text between one heading and the next.

    Returns:
        detected: {section_name: was a heading for it found}
        section_text: {section_name: the text between that heading and the next}
        has_contact: whether an email or phone number was found near the top
    """
    lines = text.splitlines()
    heading_positions: list[tuple[int, str]] = []
    for i, line in enumerate(lines):
        for name, definition in SECTION_DEFINITIONS.items():
            if _is_heading_line(line, definition["headings"]):
                heading_positions.append((i, name))
                break

    section_text: dict[str, str] = {}
    for idx, (line_no, name) in enumerate(heading_positions):
        end = heading_positions[idx + 1][0] if idx + 1 < len(heading_positions) else len(lines)
        section_text[name] = "\n".join(lines[line_no + 1 : end])

    detected = {name: name in section_text for name in SECTION_DEFINITIONS}

    contact_window = text[:CONTACT_SEARCH_CHARS]
    has_contact = bool(EMAIL_RE.search(contact_window) or PHONE_RE.search(contact_window))

    return detected, section_text, has_contact


def structure_score(detected: dict[str, bool], has_contact: bool) -> float:
    total_weight = CONTACT_WEIGHT + sum(d["weight"] for d in SECTION_DEFINITIONS.values())
    earned = (CONTACT_WEIGHT if has_contact else 0) + sum(
        SECTION_DEFINITIONS[name]["weight"] for name, ok in detected.items() if ok
    )
    return round(earned / total_weight * 100, 1)
