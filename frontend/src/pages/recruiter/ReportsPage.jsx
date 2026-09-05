import { useEffect, useState } from 'react'
import EmptyState from '../../components/EmptyState.jsx'
import { listMyJobs } from '../../utils/jobs.js'
import { downloadJobReport, downloadShortlistReport } from '../../utils/analytics.js'

export default function ReportsPage() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    listMyJobs().then(setJobs).catch((err) => setError(err.message))
  }, [])

  return (
    <>
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Reports</h1>
        <p className="hero-subtitle">Export CSV reports built from real applicant data.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      <div className="panel" style={{ marginBottom: '1.2rem' }}>
        <h2 className="panel-title">Shortlist report</h2>
        <p className="panel-subtitle">Every shortlisted candidate across all your jobs.</p>
        <div className="form-actions">
          <button type="button" className="analyze-btn" onClick={downloadShortlistReport}>Download CSV</button>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel-title">Job matching reports</h2>
        <p className="panel-subtitle">One report per job — every candidate, their match score, and skill breakdown. For a side-by-side candidate comparison export, use the Compare action on a job's Candidates tab.</p>
        {jobs && jobs.length === 0 && <EmptyState title="No jobs yet" />}
        {jobs && jobs.length > 0 && (
          <ul className="note-list">
            {jobs.map((j) => (
              <li className="note-item" key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem' }}>
                <span>{j.title} — {j.applicants_count} applicant{j.applicants_count === 1 ? '' : 's'}</span>
                <button type="button" className="new-analysis-btn" onClick={() => downloadJobReport(j.id, j.title)}>Download CSV</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
