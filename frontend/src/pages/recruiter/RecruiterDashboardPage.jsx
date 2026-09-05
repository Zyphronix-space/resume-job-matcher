import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getAnalyticsOverview } from '../../utils/analytics.js'

export default function RecruiterDashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAnalyticsOverview().then(setOverview).catch((err) => setError(err.message))
  }, [])

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Welcome back{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</h1>
        <p className="hero-subtitle">Your recruitment overview — built from your own jobs and applications.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      {overview && (
        <>
          <div className="stat-grid">
            <div className="stat-tile"><span className="stat-tile-label">Open Jobs</span><span className="stat-tile-value">{overview.open_jobs}</span></div>
            <div className="stat-tile"><span className="stat-tile-label">Total Candidates</span><span className="stat-tile-value">{overview.total_candidates}</span></div>
            <div className="stat-tile"><span className="stat-tile-label">New Applications (7d)</span><span className="stat-tile-value">{overview.new_applications}</span></div>
            <div className="stat-tile"><span className="stat-tile-label">Shortlisted</span><span className="stat-tile-value">{overview.shortlisted_candidates}</span></div>
          </div>

          <div className="panel" style={{ marginTop: '1.2rem' }}>
            <h2 className="panel-title">Pipeline</h2>
            <div className="pipeline-board">
              {Object.entries(overview.pipeline).map(([stage, count]) => (
                <div className="pipeline-column" key={stage}>
                  <span className="pipeline-column-label">{stage}</span>
                  <span className="pipeline-column-value">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-grid cols-2" style={{ marginTop: '1.2rem' }}>
            <div className="panel">
              <h2 className="panel-title">Recent candidates</h2>
              {overview.recent_candidates.length === 0 ? (
                <EmptyState title="No applications yet" subtitle="They'll show up here once candidates start applying." />
              ) : (
                <ul className="note-list">
                  {overview.recent_candidates.map((c) => (
                    <li className="note-item" key={c.application_id}>
                      <Link to={`/candidates/${c.candidate_id}`}>{c.candidate_name}</Link> applied to{' '}
                      <Link to={`/jobs/${c.job_id}`}>{c.job_title}</Link> — {Math.round(c.match_score)}% match
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <h2 className="panel-title">Recent jobs</h2>
              {overview.recent_jobs.length === 0 ? (
                <EmptyState title="No jobs yet" subtitle="Create your first job posting to start matching candidates." action={<Link className="analyze-btn" to="/jobs">Create a job</Link>} />
              ) : (
                <ul className="note-list">
                  {overview.recent_jobs.map((j) => (
                    <li className="note-item" key={j.id}>
                      <Link to={`/jobs/${j.id}`}>{j.title}</Link> — <span className="status-pill">{j.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="panel" style={{ marginTop: '1.2rem' }}>
            <h2 className="panel-title">Top matches</h2>
            {overview.top_matches.length === 0 ? (
              <EmptyState title="No matches yet" />
            ) : (
              <ul className="note-list">
                {overview.top_matches.map((m) => (
                  <li className="note-item" key={m.application_id}>
                    <Link to={`/candidates/${m.candidate_id}`}>{m.candidate_name}</Link> — {Math.round(m.match_score)}% for{' '}
                    <Link to={`/jobs/${m.job_id}`}>{m.job_title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  )
}
