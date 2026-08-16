# Resume ↔ Job Match Analyzer

Upload a CV (PDF) and paste a job description — get back a semantic match
score plus a concrete list of matched and missing skills.

- **`backend/`** — FastAPI service.
  - Extracts text from the uploaded PDF with `pdfplumber`.
  - Computes an overall match score using sentence embeddings
    (`sentence-transformers`, `all-MiniLM-L6-v2`) and cosine similarity —
    semantic similarity, not just keyword overlap.
  - Cross-checks both documents against a curated tech-skills list
    (`skills_taxonomy.py`) to report which required skills are present vs
    missing.
- **`frontend/`** — React (Vite) UI: upload a PDF, paste a job description,
  see the score and skill gaps.

## Running it

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
- Practical NLP (PDF text extraction, keyword/skill matching)
- Serving an ML pipeline behind a REST API
- A full-stack app a user can actually use, not just a notebook
