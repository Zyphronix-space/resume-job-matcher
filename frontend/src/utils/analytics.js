import { apiDownload, apiJson } from './api.js'

export const getAnalyticsOverview = () => apiJson('/analytics/overview', { fallback: 'Could not load analytics' })
export const downloadJobReport = (jobId, jobTitle) =>
  apiDownload(`/reports/job/${jobId}`, `job-matching-report-${(jobTitle || 'job').toLowerCase().replace(/\s+/g, '-')}.csv`)
export const downloadShortlistReport = () => apiDownload('/reports/shortlist', 'shortlist-report.csv')

// Client-side CSV export for ad-hoc comparisons the backend has no fixed
// report for (an arbitrary set of compared candidates) — real field values
// only, same as the server-generated reports.
export function downloadComparisonCsv(applications) {
  const header = ['Candidate', 'Match %', 'Matched skills', 'Missing skills', 'Experience', 'Education', 'Status']
  const rows = applications.map((a) => [
    a.candidate.full_name, a.match_score, a.matched_skills.join('; '), a.missing_skills.join('; '),
    a.job.experience, a.job.education, a.status,
  ])
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'candidate-comparison.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
