"""
A curated list of common tech skills/tools to look for in CVs and job
descriptions, grouped into categories. Simple substring/word-boundary
matching against this list, not a full NER model — deliberately
explainable rather than a black box.

SKILL_CATEGORIES is the source of truth; SKILLS (flat list) and
SKILL_TO_CATEGORY (reverse lookup) are derived from it so the two never
drift apart.
"""

SKILL_CATEGORIES = {
    "Programming Languages": [
        "python", "java", "javascript", "typescript", "c++", "c#", "php", "sql",
        "html", "html5", "css", "css3", "go", "rust", "kotlin", "swift",
    ],
    "Frontend": [
        "react", "react.js", "vue", "angular", "next.js", "bootstrap", "tailwind",
        "tailwind css", "redux", "jquery",
    ],
    "Backend": [
        "node.js", "express", "django", "flask", "fastapi", "laravel", "spring",
        "spring boot", ".net", "rest api", "graphql",
    ],
    "Databases": [
        "mysql", "postgresql", "mongodb", "redis", "sqlite", "oracle",
    ],
    "Cloud / DevOps": [
        "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "jenkins",
        "terraform", "linux",
    ],
    "Data / ML": [
        "machine learning", "deep learning", "scikit-learn", "pandas", "numpy",
        "tensorflow", "pytorch", "nlp", "computer vision", "data analysis",
        "data science",
    ],
    "Tools": [
        "git", "github", "gitlab", "figma", "jira", "postman",
        "agile", "scrum", "oop", "object-oriented programming", "unit testing",
        "microservices",
    ],
    "Soft Skills": [
        "communication", "leadership", "problem solving", "teamwork",
        "time management", "collaboration", "adaptability", "critical thinking",
        "mentoring", "stakeholder management",
    ],
}

SKILLS = [skill for skills in SKILL_CATEGORIES.values() for skill in skills]

SKILL_TO_CATEGORY = {
    skill: category
    for category, skills in SKILL_CATEGORIES.items()
    for skill in skills
}
