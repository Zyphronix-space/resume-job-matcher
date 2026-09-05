import { apiJson } from './api.js'

export const listCandidates = () => apiJson('/candidates', { fallback: 'Could not load candidates' })
export const getCandidateDetail = (id) => apiJson(`/candidates/${id}`, { fallback: 'Could not load candidate' })
