// Saved internships — backed by the FastAPI + SQLite /saved-jobs endpoint.
// We store the full skill breakdown (matched/missing/importance/coverage)
// so the detail view still works after leaving the search that found it,
// but never skill_evidence, which contains short excerpts of the actual
// resume text.

import { API_URL } from './apiUrl.js'
import { authHeaders } from './auth.js'

function rowToJob(row) {
  return {
    id: row.job_id,
    title: row.title,
    company: row.company,
    location: row.location,
    work_mode: row.work_mode,
    application_url: row.application_url,
    is_demo: Boolean(row.is_demo),
    matchResult: row.match_result,
    savedAt: row.saved_at,
  }
}

export async function loadSavedJobs() {
  try {
    const res = await fetch(`${API_URL}/saved-jobs`, { headers: authHeaders() })
    if (!res.ok) return []
    const rows = await res.json()
    return rows.map(rowToJob)
  } catch {
    return []
  }
}

function withoutEvidence(matchResult) {
  if (!matchResult) return null
  const { skill_evidence, ...rest } = matchResult
  void skill_evidence
  return rest
}

export async function saveJob(job, matchResult) {
  try {
    await fetch(`${API_URL}/saved-jobs`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        job_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        work_mode: job.work_mode,
        application_url: job.application_url ?? null,
        is_demo: Boolean(job.is_demo),
        match_result: withoutEvidence(matchResult),
      }),
    })
  } catch {
    // ignore — backend unreachable
  }
  return loadSavedJobs()
}

export async function removeSavedJob(jobId) {
  try {
    await fetch(`${API_URL}/saved-jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE', headers: authHeaders() })
  } catch {
    // ignore — backend unreachable
  }
  return loadSavedJobs()
}
