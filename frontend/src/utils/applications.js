import { apiJson } from './api.js'

// --- Candidate side --------------------------------------------------------
export const getCandidateMatches = () => apiJson('/candidate/matches', { fallback: 'Could not load matches' })
export const applyToJob = (jobId, resumeId) =>
  apiJson(`/jobs/${jobId}/apply`, { method: 'POST', body: resumeId ? { resume_id: resumeId } : {}, fallback: 'Could not submit application' })
export const listMyApplications = () => apiJson('/candidate/applications', { fallback: 'Could not load applications' })

// --- Shared ------------------------------------------------------------
export const getApplication = (id) => apiJson(`/applications/${id}`, { fallback: 'Could not load application' })
export const compareApplications = (ids) =>
  apiJson(`/applications/compare?ids=${ids.map(encodeURIComponent).join(',')}`, { fallback: 'Could not load comparison' })

// --- Recruiter side ------------------------------------------------------
export function rankCandidatesForJob(jobId, { minScore, skill, status, sort } = {}) {
  const params = new URLSearchParams()
  if (minScore !== undefined && minScore !== null && minScore !== '') params.set('min_score', minScore)
  if (skill) params.set('skill', skill)
  if (status) params.set('status', status)
  if (sort) params.set('sort', sort)
  const qs = params.toString()
  return apiJson(`/jobs/${jobId}/candidates${qs ? `?${qs}` : ''}`, { fallback: 'Could not load candidates' })
}
export const changeApplicationStatus = (id, status) =>
  apiJson(`/applications/${id}/status`, { method: 'PATCH', body: { status }, fallback: 'Could not update status' })
export const addApplicationNote = (id, body) =>
  apiJson(`/applications/${id}/notes`, { method: 'POST', body: { body }, fallback: 'Could not add note' })
export const getShortlist = () => apiJson('/shortlist', { fallback: 'Could not load shortlist' })
