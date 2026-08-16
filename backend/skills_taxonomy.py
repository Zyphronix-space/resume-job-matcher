"""
A curated list of common tech skills/tools to look for in CVs and job
descriptions. Simple substring/word-boundary matching against this list,
not a full NER model — deliberately explainable rather than a black box.
"""

SKILLS = [
    # Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "php", "sql",
    "html", "html5", "css", "css3", "go", "rust", "kotlin", "swift",
    # Frontend
    "react", "react.js", "vue", "angular", "next.js", "bootstrap", "tailwind",
    "tailwind css", "redux", "jquery",
    # Backend
    "node.js", "express", "django", "flask", "fastapi", "laravel", "spring",
    "spring boot", ".net", "rest api", "graphql",
    # Data / ML
    "machine learning", "deep learning", "scikit-learn", "pandas", "numpy",
    "tensorflow", "pytorch", "nlp", "computer vision", "data analysis",
    "data science",
    # Databases
    "mysql", "postgresql", "mongodb", "redis", "sqlite", "oracle",
    # Cloud / DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "jenkins",
    "terraform", "linux",
    # Tools
    "git", "github", "gitlab", "figma", "jira", "postman",
    # Practices
    "agile", "scrum", "oop", "object-oriented programming", "unit testing",
    "microservices",
]
