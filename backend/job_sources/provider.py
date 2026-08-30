"""
Demo job provider.

No live job-board API is configured for this project, so this module is
the active provider (see get_active_provider() below): a small, hand-written
set of realistic internship postings. Every JobPosting here has
is_demo=True and source="demo" — the frontend is required to render a
"DEMO" label on anything with is_demo=True, so demo postings are never
presented as real live opportunities.

Adding a real provider later (e.g. an official job-board API) means:
  1. Writing a new JobProvider subclass here (or in its own module) that
     calls that API and maps its results to JobPosting.
  2. Returning it from get_active_provider() instead of DemoJobProvider().
Nothing in job_matcher.py, main.py's routes, or the frontend needs to
change — they only depend on the JobProvider/JobPosting interface in
job_sources/base.py.
"""

import httpx

from .base import JobPosting, JobProvider, JobSearchFilters
from .muse_provider import MuseJobProvider

_DEMO_JOBS: list[JobPosting] = [
    JobPosting(
        id="demo-1",
        title="Software Engineer Intern",
        company="Nimbus Systems",
        location="Colombo, Sri Lanka",
        work_mode="Hybrid",
        description=(
            "Nimbus Systems is looking for a Software Engineer Intern to join our backend "
            "platform team. You will help build and test internal REST APIs and collaborate "
            "with senior engineers on day-to-day feature work.\n\n"
            "Required skills: Python, SQL, Git. You should be comfortable with "
            "object-oriented programming and writing unit testing for your own code.\n\n"
            "Preferred / nice to have: FastAPI, Docker, AWS. Some exposure to React would "
            "help since you may occasionally assist the frontend team with our internal "
            "admin dashboard."
        ),
        required_skills=["python", "sql", "git"],
        preferred_skills=["fastapi", "docker", "aws", "react"],
        posted_date="2026-08-20",
        application_deadline="2026-09-15",
        application_url="https://example.com/careers/nimbus-systems/software-engineer-intern",
    ),
    JobPosting(
        id="demo-2",
        title="Backend Developer Intern",
        company="Lanka Cloud Works",
        location="Remote",
        work_mode="Remote",
        description=(
            "We're a small cloud infrastructure team building tools on top of AWS and "
            "Kubernetes. As a Backend Developer Intern you'll work on our Python services "
            "and help maintain our CI/CD pipelines.\n\n"
            "Required: Python, Docker, Git, REST API design.\n\n"
            "Nice to have: Kubernetes, AWS, PostgreSQL, experience with agile/scrum "
            "workflows."
        ),
        required_skills=["python", "docker", "git", "rest api"],
        preferred_skills=["kubernetes", "aws", "postgresql", "agile", "scrum"],
        posted_date="2026-08-18",
        application_deadline="2026-09-10",
        application_url="https://example.com/careers/lanka-cloud-works/backend-intern",
    ),
    JobPosting(
        id="demo-3",
        title="Frontend Developer Intern",
        company="Kandy Digital Studio",
        location="Kandy, Sri Lanka",
        work_mode="On-site",
        description=(
            "Kandy Digital Studio builds web products for local businesses. We're hiring a "
            "Frontend Developer Intern to help build UI components in React and improve the "
            "styling of our client dashboards.\n\n"
            "Required skills: JavaScript, React, CSS, HTML.\n\n"
            "Preferred: TypeScript, Tailwind CSS, Figma, Git."
        ),
        required_skills=["javascript", "react", "css", "html"],
        preferred_skills=["typescript", "tailwind css", "figma", "git"],
        posted_date="2026-08-22",
        application_deadline=None,
        application_url="https://example.com/careers/kandy-digital-studio/frontend-intern",
    ),
    JobPosting(
        id="demo-4",
        title="Data Analyst Intern",
        company="Insightful Analytics",
        location="Colombo, Sri Lanka",
        work_mode="Hybrid",
        description=(
            "As a Data Analyst Intern, you'll help our team clean, explore and visualize "
            "datasets for internal reporting.\n\n"
            "Required: Python, SQL, data analysis, pandas.\n\n"
            "Nice to have: numpy, data science coursework or projects, experience "
            "communicating findings to non-technical stakeholders."
        ),
        required_skills=["python", "sql", "data analysis", "pandas"],
        preferred_skills=["numpy", "data science", "communication"],
        posted_date="2026-08-15",
        application_deadline="2026-09-05",
        application_url="https://example.com/careers/insightful-analytics/data-analyst-intern",
    ),
    JobPosting(
        id="demo-5",
        title="Machine Learning Engineer Intern",
        company="Vector Labs",
        location="Remote",
        work_mode="Remote",
        description=(
            "Vector Labs is a small applied-ML team. This internship focuses on data "
            "preprocessing and model evaluation for a text-classification project.\n\n"
            "Required: Python, machine learning, scikit-learn.\n\n"
            "Preferred: PyTorch or TensorFlow, NLP, pandas, a genuine interest in "
            "understanding how models work rather than just calling an API."
        ),
        required_skills=["python", "machine learning", "scikit-learn"],
        preferred_skills=["pytorch", "tensorflow", "nlp", "pandas"],
        posted_date="2026-08-10",
        application_deadline="2026-08-31",
        application_url="https://example.com/careers/vector-labs/ml-engineer-intern",
    ),
    JobPosting(
        id="demo-6",
        title="Full Stack Developer Intern",
        company="Gampaha Softworks",
        location="Gampaha, Sri Lanka",
        work_mode="On-site",
        description=(
            "Gampaha Softworks builds internal business tools for local manufacturers. "
            "We're looking for a Full Stack Developer Intern comfortable across the stack.\n\n"
            "Required: JavaScript, Node.js, React, SQL.\n\n"
            "Nice to have: Express, MongoDB, Git, exposure to agile/scrum teams."
        ),
        required_skills=["javascript", "node.js", "react", "sql"],
        preferred_skills=["express", "mongodb", "git", "agile", "scrum"],
        posted_date="2026-08-24",
        application_deadline="2026-09-20",
        application_url="https://example.com/careers/gampaha-softworks/fullstack-intern",
    ),
    JobPosting(
        id="demo-7",
        title="DevOps Intern",
        company="Lanka Cloud Works",
        location="Remote",
        work_mode="Remote",
        description=(
            "Support our platform team in maintaining CI/CD pipelines and container "
            "infrastructure.\n\n"
            "Required: Docker, Linux, Git, CI/CD.\n\n"
            "Preferred: Kubernetes, Terraform, AWS, basic Python scripting."
        ),
        required_skills=["docker", "linux", "git", "ci/cd"],
        preferred_skills=["kubernetes", "terraform", "aws", "python"],
        posted_date="2026-08-12",
        application_deadline="2026-09-01",
        application_url="https://example.com/careers/lanka-cloud-works/devops-intern",
    ),
    JobPosting(
        id="demo-8",
        title="Software Engineer Intern",
        company="Horizon FinTech",
        location="Colombo, Sri Lanka",
        work_mode="Hybrid",
        description=(
            "Horizon FinTech is hiring a Software Engineer Intern for our core banking "
            "integrations team.\n\n"
            "Required: Java, SQL, Git, object-oriented programming.\n\n"
            "Preferred: Spring Boot, microservices, unit testing, good communication and "
            "teamwork skills since you'll pair with senior engineers daily."
        ),
        required_skills=["java", "sql", "git", "oop"],
        preferred_skills=["spring boot", "microservices", "unit testing", "communication", "teamwork"],
        posted_date="2026-08-05",
        application_deadline="2026-08-29",
        application_url="https://example.com/careers/horizon-fintech/software-engineer-intern",
    ),
]

for _job in _DEMO_JOBS:
    _job.source = "demo"
    _job.is_demo = True


class DemoJobProvider(JobProvider):
    id = "demo"
    is_demo = True

    def search(self, filters: JobSearchFilters) -> list[JobPosting]:
        results = list(_DEMO_JOBS)

        if filters.role:
            role_lower = filters.role.lower()
            results = [j for j in results if role_lower in j.title.lower()]

        if filters.location:
            loc_lower = filters.location.lower()
            results = [j for j in results if loc_lower in j.location.lower()]

        if filters.work_mode and filters.work_mode.lower() != "any":
            mode_lower = filters.work_mode.lower()
            results = [j for j in results if j.work_mode.lower() == mode_lower]

        if filters.company:
            company_lower = filters.company.lower()
            results = [j for j in results if company_lower in j.company.lower()]

        if filters.skills:
            wanted = {s.strip().lower() for s in filters.skills if s.strip()}
            if wanted:
                results = [
                    j
                    for j in results
                    if wanted & {s.lower() for s in (j.required_skills + j.preferred_skills)}
                ]

        if filters.keyword:
            kw = filters.keyword.lower()
            results = [
                j
                for j in results
                if kw in j.title.lower() or kw in j.description.lower() or kw in j.company.lower()
            ]

        return results

    def get(self, job_id: str) -> JobPosting | None:
        return next((j for j in _DEMO_JOBS if j.id == job_id), None)


class LiveWithDemoFallbackProvider(JobProvider):
    """
    Tries the real Muse API first; falls back to the bundled demo postings
    only if the live API is unreachable or returns nothing for a query.
    Each JobPosting already carries its own is_demo flag, so a query that
    falls back is still correctly labeled DEMO in the UI per-card — this
    wrapper never blurs the two together.
    """

    id = "themuse"
    is_demo = False

    def __init__(self):
        self._live = MuseJobProvider()
        self._demo = DemoJobProvider()

    def search(self, filters: JobSearchFilters) -> list[JobPosting]:
        try:
            results = self._live.search(filters)
            if results:
                return results
        except httpx.HTTPError:
            pass
        return self._demo.search(filters)

    def get(self, job_id: str) -> JobPosting | None:
        if job_id.startswith("demo-"):
            return self._demo.get(job_id)
        try:
            return self._live.get(job_id)
        except httpx.HTTPError:
            return None


def get_active_provider() -> JobProvider:
    # Real internship data from The Muse, with the bundled demo postings as
    # an offline/rate-limit fallback. Swapping in a different real provider
    # later means writing one more JobProvider subclass and changing this
    # function — every route and the frontend only depend on the opaque
    # JobProvider/JobPosting interface in job_sources/base.py.
    return LiveWithDemoFallbackProvider()
