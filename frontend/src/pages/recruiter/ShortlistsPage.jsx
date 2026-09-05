import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import { getShortlist } from '../../utils/applications.js'
import { downloadShortlistReport } from '../../utils/analytics.js'

export default function ShortlistsPage() {
  const [shortlist, setShortlist] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getShortlist().then(setShortlist).catch((err) => setError(err.message))
  }, [])

  const byJob = useMemo(() => {
    if (!shortlist) return []
    const groups = new Map()
    for (const app of shortlist) {
      if (!groups.has(app.job.id)) groups.set(app.job.id, { job: app.job, apps: [] })
      groups.get(app.job.id).apps.push(app)
    }
    return [...groups.values()]
  }, [shortlist])

  return (
    <>
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Shortlists</h1>
        <p className="hero-subtitle">Shortlisted candidates across every job, grouped by role.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      {shortlist && shortlist.length > 0 && (
        <div className="form-actions" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button type="button" className="new-analysis-btn" onClick={downloadShortlistReport}>Download shortlist report (CSV)</button>
        </div>
      )}

      {shortlist && shortlist.length === 0 && (
        <EmptyState title="No shortlisted candidates yet" subtitle="Shortlist candidates from a job's Candidates tab." />
      )}

      {byJob.map(({ job, apps }) => (
        <div className="panel" key={job.id} style={{ marginBottom: '1.2rem' }}>
          <h2 className="panel-title"><Link to={`/jobs/${job.id}`}>{job.title}</Link></h2>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Candidate</th><th>Match</th><th>Actions</th></tr></thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Candidate">{a.candidate.full_name}</td>
                    <td data-label="Match">{Math.round(a.match_score)}%</td>
                    <td data-label="Actions"><Link className="new-analysis-btn" to={`/candidates/${a.candidate.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  )
}
