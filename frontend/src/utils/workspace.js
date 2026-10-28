import { apiJson } from './api.js'

// --- Job index (public; a signed-in candidate also gets skill overlap) -------
export function searchPostings(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== false) params.set(key, value)
  })
  const qs = params.toString()
  return apiJson(`/postings${qs ? `?${qs}` : ''}`, { fallback: 'Could not load jobs' })
}
export const getPostingFacets = () => apiJson('/postings/facets', { fallback: 'Could not load filters' })
export const getPosting = (id) => apiJson(`/postings/${id}`, { fallback: 'Could not load this job' })
export const assessPosting = (id) => apiJson(`/postings/${id}/assessment`, { fallback: 'Could not assess this job' })

// --- Candidate profile ---------------------------------------------------------
export const getCandidateProfile = () => apiJson('/profile', { fallback: 'Could not load your profile' })
export const saveCandidateProfile = (body) => apiJson('/profile', { method: 'PUT', body, fallback: 'Could not save your profile' })
export const getProfileSuggestions = () => apiJson('/profile/suggestions', { fallback: 'Could not read your resume' })

// --- Tracker -------------------------------------------------------------------
export const TRACKER_STAGES = ['Saved', 'Preparing', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn']
export const CLOSED_STAGES = ['Offer', 'Rejected', 'Withdrawn']

export const listTracked = () => apiJson('/tracker', { fallback: 'Could not load your tracker' })
export const getTrackerSummary = () => apiJson('/tracker/summary', { fallback: 'Could not load your tracker' })
export const trackPosting = (postingId) =>
  apiJson('/tracker', { method: 'POST', body: { posting_id: postingId }, fallback: 'Could not save this job' })
export const trackManual = (body) => apiJson('/tracker/manual', { method: 'POST', body, fallback: 'Could not add this job' })
export const trackImport = (url) => apiJson('/tracker/import', { method: 'POST', body: { url }, fallback: 'Could not import that link' })
export const getTracked = (id) => apiJson(`/tracker/${id}`, { fallback: 'Could not load this job' })
export const updateTracked = (id, body) => apiJson(`/tracker/${id}`, { method: 'PATCH', body, fallback: 'Could not save changes' })
export const removeTracked = (id) => apiJson(`/tracker/${id}`, { method: 'DELETE', fallback: 'Could not remove this job' })
export const getTrackedAssessment = (id) => apiJson(`/tracker/${id}/assessment`, { fallback: 'Could not assess this job' })
export const generateDocument = (id, kind, replaceEdited = false) =>
  apiJson(`/tracker/${id}/documents/${kind}/generate`, {
    method: 'POST', body: { replace_edited: replaceEdited }, fallback: 'Could not create a draft',
  })
export const saveDocument = (id, kind, content) =>
  apiJson(`/tracker/${id}/documents/${kind}`, { method: 'PUT', body: { content }, fallback: 'Could not save the draft' })
export const getInterviewPrep = (id) => apiJson(`/tracker/${id}/prep`, { fallback: 'Could not load interview prep' })

// --- Admin: source registry and curation ----------------------------------------
export const listSources = () => apiJson('/admin/sources', { fallback: 'Could not load sources' })
export const addSource = (body) => apiJson('/admin/sources', { method: 'POST', body, fallback: 'Could not add that source' })
export const updateSource = (id, body) => apiJson(`/admin/sources/${id}`, { method: 'PATCH', body, fallback: 'Could not update source' })
export const syncSource = (id) => apiJson(`/admin/sources/${id}/sync`, { method: 'POST', fallback: 'Sync failed' })
export const syncAllSources = () => apiJson('/admin/sources/sync-all', { method: 'POST', fallback: 'Sync failed' })
export const seedSources = () => apiJson('/admin/sources/seed', { method: 'POST', fallback: 'Could not add the starter sources' })
export const addManualPosting = (body) => apiJson('/admin/postings', { method: 'POST', body, fallback: 'Could not add that vacancy' })
export const setPostingStatus = (id, status) =>
  apiJson(`/admin/postings/${id}`, { method: 'PATCH', body: { status }, fallback: 'Could not update that vacancy' })

// --- Account -------------------------------------------------------------------
export const deleteAccount = (password) =>
  apiJson('/auth/delete-account', { method: 'POST', body: { password }, fallback: 'Could not delete your account' })

// --- Formatting ------------------------------------------------------------------
export function relativeDays(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export function formatDate(isoOrDate) {
  if (!isoOrDate) return ''
  // Plain YYYY-MM-DD dates are calendar days, not instants: parse them as
  // local dates so they don't shift a day west of UTC.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? new Date(`${isoOrDate}T00:00:00`) : new Date(isoOrDate)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export const SOURCE_LABELS = {
  greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', smartrecruiters: 'SmartRecruiters',
  workable: 'Workable', manual: 'Added by ResumeMatch',
}

// One line of facts about a vacancy. Only fields the source actually stated
// are shown; "Unspecified" values are left out rather than guessed.
export function postingFacts(p) {
  return [
    p.location || p.country || null,
    p.work_mode !== 'Unspecified' ? p.work_mode : null,
    p.experience_level !== 'Unspecified' ? p.experience_level : null,
    p.employment_type && p.employment_type !== 'Unspecified' ? p.employment_type : null,
  ].filter(Boolean)
}

export function sourceLabel(source) {
  return SOURCE_LABELS[source?.kind] || 'Employer job board'
}

export function isOverdue(dateStr) {
  return Boolean(dateStr) && new Date(`${dateStr}T23:59:59`) < new Date()
}

export function tabPanelProps(id) {
  return { role: 'tabpanel', id: `panel-${id}`, 'aria-labelledby': `tab-${id}`, tabIndex: 0 }
}
