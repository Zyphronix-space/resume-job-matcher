// Analysis history — backed by the FastAPI + SQLite /history endpoint
// (see backend/routes_user_data.py). The backend never stores the CV file
// or the full job description, only the computed result fields below.

import { API_URL } from './apiUrl.js'
import { authHeaders } from './auth.js'

export async function loadHistory() {
  try {
    const res = await fetch(`${API_URL}/history`, { headers: authHeaders() })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export async function saveHistoryEntry({ filename, jobLabel, result }) {
  const payload = {
    filename,
    job_label: jobLabel,
    match_score: result.match_score,
    skill_coverage: result.skill_coverage,
    matched_skills: result.matched_skills,
    missing_skills: result.missing_skills,
    skill_categories: result.skill_categories,
    skill_importance: result.skill_importance,
    resume_sections: result.resume_sections,
    resume_structure_score: result.resume_structure_score,
    skill_gap_roadmap: result.skill_gap_roadmap,
  }
  try {
    const res = await fetch(`${API_URL}/history`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

export async function clearHistory() {
  try {
    await fetch(`${API_URL}/history`, { method: 'DELETE', headers: authHeaders() })
  } catch {
    // ignore — backend unreachable
  }
}

// The backend's history row already uses the same field names as a normal
// /analyze response (see HistoryEntryOut) — skill_evidence is the only
// field never stored (it holds short excerpts of actual resume text).
export function entryToResult(entry) {
  return { ...entry, skill_evidence: {} }
}
