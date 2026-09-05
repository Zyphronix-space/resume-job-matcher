// Small shared fetch wrapper so every jobs/resumes/applications/analytics
// util below doesn't repeat the same headers/error-parsing boilerplate.

import { API_URL } from './apiUrl.js'
import { authHeaders } from './auth.js'

async function parseErrorOrThrow(res, fallback) {
  const data = await res.json().catch(() => ({}))
  const detail = data.detail
  const message = Array.isArray(detail) ? detail.map((d) => d.msg).join('; ') : detail
  throw new Error(message || fallback)
}

export async function apiJson(path, { method = 'GET', body, fallback } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) await parseErrorOrThrow(res, fallback || 'Request failed')
  if (res.status === 204) return null
  return res.json()
}

export async function apiUpload(path, file, fallback) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  })
  if (!res.ok) await parseErrorOrThrow(res, fallback || 'Upload failed')
  return res.json()
}

export function apiFileUrl(path) {
  return `${API_URL}${path}`
}

// Downloads a backend response (CSV, resume PDF) as a real user-visible
// download — needed because those endpoints require an Authorization
// header, so a plain <a href> can't be used directly.
export async function apiDownload(path, filenameFallback) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() })
  if (!res.ok) await parseErrorOrThrow(res, 'Could not download file')
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const filename = match ? match[1] : filenameFallback

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
