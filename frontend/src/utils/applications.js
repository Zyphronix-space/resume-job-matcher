// Application tracker — backed by the FastAPI + SQLite /applications
// endpoint. Every event recorded here corresponds to something the user
// actually did (saved, prepared, changed status); nothing is submitted
// anywhere by the app itself.

import { API_URL } from './apiUrl.js'
import { authHeaders } from './auth.js'

export const STATUSES = ['Interested', 'Preparing', 'Applied', 'Interview', 'Rejected', 'Offer']

function rowToApp(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    title: row.title,
    company: row.company,
    location: row.location,
    workMode: row.work_mode,
    applicationUrl: row.application_url,
    matchScore: row.match_score,
    skillCoverage: row.skill_coverage,
    resumeFilename: row.resume_filename,
    coverLetter: row.cover_letter,
    questions: row.questions,
    status: row.status,
    timeline: row.events.map((e) => ({ date: e.date, label: e.label })),
  }
}

export async function loadApplications() {
  try {
    const res = await fetch(`${API_URL}/applications`, { headers: authHeaders() })
    if (!res.ok) return []
    return (await res.json()).map(rowToApp)
  } catch {
    return []
  }
}

export async function ensureApplication(job, matchResult, resumeFilename) {
  try {
    const res = await fetch(`${API_URL}/applications`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        job_id: job.id,
        title: job.title,
        company: job.company,
        location: job.location ?? null,
        work_mode: job.work_mode ?? null,
        application_url: job.application_url ?? null,
        match_score: matchResult?.match_score ?? null,
        skill_coverage: matchResult?.skill_coverage ?? null,
        resume_filename: resumeFilename ?? null,
      }),
    })
    return res.ok ? rowToApp(await res.json()) : null
  } catch {
    return null
  }
}

export async function updateApplication(id, patch) {
  const body = {}
  if ('coverLetter' in patch) body.cover_letter = patch.coverLetter
  if ('questions' in patch) body.questions = patch.questions
  try {
    await fetch(`${API_URL}/applications/${id}`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    })
  } catch {
    // ignore — backend unreachable
  }
}

export async function setApplicationStatus(id, status) {
  try {
    await fetch(`${API_URL}/applications/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status }),
    })
  } catch {
    // ignore — backend unreachable
  }
}

export async function removeApplication(id) {
  try {
    await fetch(`${API_URL}/applications/${id}`, { method: 'DELETE', headers: authHeaders() })
  } catch {
    // ignore — backend unreachable
  }
  return loadApplications()
}
