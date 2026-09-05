import { useEffect, useState } from 'react'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { listMyJobs } from '../../utils/jobs.js'
import { downloadJobReport, downloadShortlistReport } from '../../utils/analytics.js'
import { rankCandidatesForJob, getShortlist } from '../../utils/applications.js'
import { downloadCandidatesPdf } from '../../utils/pdfReport.js'

export default function ReportsPage() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    listMyJobs().then(setJobs).catch((err) => setError(err.message))
  }, [])

  const handleJobPdf = async (job) => {
    setBusyId(job.id)
    try {
      const candidates = await rankCandidatesForJob(job.id, {})
      downloadCandidatesPdf(`Job Matching Report - ${job.title}`, candidates)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleShortlistPdf = async () => {
    setBusyId('shortlist')
    try {
      const shortlist = await getShortlist()
      downloadCandidatesPdf('Shortlist Report', shortlist)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Reports</h1>
        <p className="hero-subtitle">Export CSV or PDF reports built from real applicant data.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      <GlassCard title="Shortlist report" subtitle="Every shortlisted candidate across all your jobs." style={{ marginBottom: '1.2rem' }}>
        <div className="form-actions">
          <GlassButton variant="primary" onClick={downloadShortlistReport}>Download CSV</GlassButton>
          <GlassButton variant="secondary" disabled={busyId === 'shortlist'} onClick={handleShortlistPdf}>
            {busyId === 'shortlist' ? 'Preparing…' : 'Download PDF'}
          </GlassButton>
        </div>
      </GlassCard>

      <GlassCard
        title="Job matching reports"
        subtitle="One report per job — every candidate, their match score, and skill breakdown. For a side-by-side candidate comparison export, use the Compare action on a job's Candidates tab."
      >
        {jobs && jobs.length === 0 && <GlassEmptyState title="No jobs yet" />}
        {jobs && jobs.length > 0 && (
          <ul className="note-list">
            {jobs.map((j) => (
              <li className="note-item" key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                <span>{j.title} — {j.applicants_count} applicant{j.applicants_count === 1 ? '' : 's'}</span>
                <div className="data-table-actions">
                  <GlassButton variant="secondary" size="sm" onClick={() => downloadJobReport(j.id, j.title)}>CSV</GlassButton>
                  <GlassButton variant="secondary" size="sm" disabled={busyId === j.id} onClick={() => handleJobPdf(j)}>
                    {busyId === j.id ? 'Preparing…' : 'PDF'}
                  </GlassButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  )
}
