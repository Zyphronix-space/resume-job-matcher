import { apiJson } from './api.js'

export const listMyJobs = () => apiJson('/jobs', { fallback: 'Could not load jobs' })
export const getJob = (id) => apiJson(`/jobs/${id}`, { fallback: 'Could not load job' })
export const createJob = (payload) => apiJson('/jobs', { method: 'POST', body: payload, fallback: 'Could not create job' })
export const updateJob = (id, payload) => apiJson(`/jobs/${id}`, { method: 'PATCH', body: payload, fallback: 'Could not update job' })
export const deleteJob = (id) => apiJson(`/jobs/${id}`, { method: 'DELETE', fallback: 'Could not delete job' })
