// Session handling for the FastAPI backend's JWT-based auth (see
// backend/auth.py). The token itself is the only thing kept in
// localStorage — it's an opaque, expiring session credential, not user
// data, so it doesn't belong in the database-backed stores the rest of the
// app uses.

import { API_URL } from './apiUrl.js'

const TOKEN_KEY = 'recruitai-token'

// "Remember me" decides which storage the token goes in: localStorage
// persists across browser restarts, sessionStorage clears when the tab
// closes. Both are checked on read since either could hold the live token.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token, rememberMe = true) {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    if (token) (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
  } catch {
    // ignore — storage unavailable
  }
}

export function authHeaders(extra = {}) {
  const token = getToken()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

async function parseErrorOrThrow(res, fallback) {
  const data = await res.json().catch(() => ({}))
  const detail = data.detail
  const message = Array.isArray(detail) ? detail.map((d) => d.msg).join('; ') : detail
  throw new Error(message || fallback)
}

export async function signup({ fullName, email, password, role }) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: fullName, email, password, role }),
  })
  if (!res.ok) await parseErrorOrThrow(res, 'Could not create an account')
  return res.json()
}

export async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) await parseErrorOrThrow(res, 'Could not sign in')
  return res.json()
}

export async function fetchCurrentUser() {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function updateProfile(patch) {
  const res = await fetch(`${API_URL}/auth/me`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  })
  if (!res.ok) await parseErrorOrThrow(res, 'Could not update profile')
  return res.json()
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  if (!res.ok) await parseErrorOrThrow(res, 'Could not change password')
  return res.json()
}

export async function forgotPassword(email) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) await parseErrorOrThrow(res, 'Could not process that request')
  return res.json()
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, new_password: newPassword }),
  })
  if (!res.ok) await parseErrorOrThrow(res, 'This reset link is invalid or has expired')
  return res.json()
}
