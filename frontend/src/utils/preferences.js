// User preferences (preferred roles/locations/work mode/technologies) —
// backed by the FastAPI + SQLite /preferences endpoint (a single row,
// since this app has no accounts). Used purely to bias the explainable
// "Recommended for you" ranking — never combined into a hidden score.

import { API_URL } from './apiUrl.js'
import { authHeaders } from './auth.js'

const DEFAULT_PREFERENCES = {
  roles: [],
  locations: [],
  workMode: 'Any',
  technologies: [],
}

export const ROLE_OPTIONS = [
  'Software Engineer', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer',
  'Data Analyst', 'ML Engineer', 'DevOps',
]

export const LOCATION_OPTIONS = ['Colombo', 'Remote', 'Kandy', 'Gampaha']

export const WORK_MODE_OPTIONS = ['Any', 'Remote', 'Hybrid', 'On-site']

export const TECHNOLOGY_OPTIONS = [
  'Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL',
  'Docker', 'AWS', 'Kubernetes', 'Machine Learning',
]

export async function loadPreferences() {
  try {
    const res = await fetch(`${API_URL}/preferences`, { headers: authHeaders() })
    if (!res.ok) return { ...DEFAULT_PREFERENCES }
    const data = await res.json()
    return {
      roles: data.roles,
      locations: data.locations,
      workMode: data.work_mode,
      technologies: data.technologies,
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export async function savePreferences(preferences) {
  try {
    await fetch(`${API_URL}/preferences`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        roles: preferences.roles,
        locations: preferences.locations,
        work_mode: preferences.workMode,
        technologies: preferences.technologies,
      }),
    })
  } catch {
    // ignore — backend unreachable
  }
}
