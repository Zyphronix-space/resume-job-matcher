# Resume Match

Upload a CV (PDF) and get a semantic match score against job/internship
descriptions — matched vs. missing skills, an ATS-style resume structure
check, a skill-gap roadmap, and auto-suggested real internships that fit
your resume.

**Live demo:** https://salmon-ground-0609b6e00.7.azurestaticapps.net
(backend API: https://resume-match-api-stephan.azurewebsites.net) — sign up
to try it; the first account created becomes an admin automatically.

- **`backend/`** — FastAPI service.
  - JWT-based auth (signup/login) with per-user data — every route below
    `/auth` requires a signed-in user.
  - Extracts text from the uploaded PDF with `pdfplumber`.
  - Computes an overall match score using sentence embeddings
    (`sentence-transformers`, `all-MiniLM-L6-v2`) and cosine similarity —
    semantic similarity, not just keyword overlap.
  - Cross-checks both documents against a curated tech-skills taxonomy to
    report matched/missing skills, skill importance, coverage, evidence,
    and a prerequisite-aware learning roadmap.
  - Real internship listings from [The Muse](https://www.themuse.com/developers/api/v2)
    public Jobs API (with attribution and a link back to the original
    posting), with a small bundled demo dataset as an offline/rate-limit
    fallback — anything not sourced live is clearly labeled DEMO.
  - Saved jobs, application tracker, preferences, and analysis history
    persisted per-user in SQLite.
  - Admin panel API for user management and system stats.
- **`frontend/`** — React (Vite) UI: sign up/log in, upload a PDF, browse
  and search internships, get instant match scores and an explainable
  score breakdown, save jobs, track applications, and (for admins) manage
  users.

## Running it locally

**Backend:**
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```
cd frontend
npm install
npm run dev
```

## What this demonstrates
- Using pretrained transformer embeddings for semantic text similarity
- Practical NLP (PDF text extraction, keyword/skill taxonomy matching)
- Serving an ML pipeline behind a REST API with authenticated, per-user data
- Integrating a real third-party data source with proper attribution
- A full-stack app deployed and usable end-to-end, not just a notebook
