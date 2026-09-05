import { API_URL } from './apiUrl.js'
import { authHeaders } from './auth.js'
import { apiDownload, apiJson, apiUpload } from './api.js'

export const listResumes = () => apiJson('/resumes', { fallback: 'Could not load resumes' })
export const getResumeSections = (id) => apiJson(`/resumes/${id}/sections`, { fallback: 'Could not load resume sections' })
export const uploadResume = (file) => apiUpload('/resumes', file, 'Could not upload resume')
export const deleteResume = (id) => apiJson(`/resumes/${id}`, { method: 'DELETE', fallback: 'Could not delete resume' })
export const downloadResume = (id, filename) => apiDownload(`/resumes/${id}/file`, filename || 'resume.pdf')

// Opens the PDF inline in a new tab. A plain <a href> can't be used since
// the endpoint requires an Authorization header, so the file is fetched as
// a blob first and handed to the browser via an object URL.
export async function viewResume(id) {
  const res = await fetch(`${API_URL}/resumes/${id}/file`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Could not open resume')
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}
