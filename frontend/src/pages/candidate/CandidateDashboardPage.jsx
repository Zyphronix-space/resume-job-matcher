import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getCandidateMatches, listMyApplications } from '../../utils/applications.js'

export default function CandidateDashboardPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState(null)
  const [matches, setMatches] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([listMyApplications(), getCandidateMatches()])
      .then(([apps, m]) => { setApplications(apps); setMatches(m) })
      .catch((err) => setError(err.message))
  }, [])

  const counts = useMemo(() => {
    if (!applications) return null
    const by = (status) => applications.filter((a) => a.status === status).length
    return {
      total: applications.length,
      shortlisted: by('Shortlisted'),
      interview: by('Interview'),
      offer: by('Offer'),
    }
  }, [applications])

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Welcome back{user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</h1>
        <p className="hero-subtitle">Your applications and top job matches, in one place.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      {counts && (
        <div className="stat-grid">
          <div className="stat-tile"><span className="stat-tile-label">Applications</span><span className="stat-tile-value">{counts.total}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Shortlisted</span><span className="stat-tile-value">{counts.shortlisted}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Interviews</span><span className="stat-tile-value">{counts.interview}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Offers</span><span className="stat-tile-value">{counts.offer}</span></div>
        </div>
      )}

      <div className="form-grid cols-2" style={{ marginTop: '1.2rem' }}>
        <div className="panel">
          <h2 className="panel-title">Top matches</h2>
          {!matches || matches.length === 0 ? (
            <EmptyState title="No matches yet" subtitle="Upload a resume to see how you match against open roles." action={<Link className="analyze-btn" to="/resumes">Upload resume</Link>} />
          ) : (
            <ul className="note-list">
              {matches.slice(0, 5).map((m) => (
                <li className="note-item" key={m.job.id}>
                  {m.job.title} — {Math.round(m.match_score)}% match {m.already_applied && <span className="status-pill">{m.application_status}</span>}
                </li>
              ))}
            </ul>
          )}
          <div className="form-actions"><Link className="new-analysis-btn" to="/matches">View all matches</Link></div>
        </div>

        <div className="panel">
          <h2 className="panel-title">Recent applications</h2>
          {!applications || applications.length === 0 ? (
            <EmptyState title="No applications yet" />
          ) : (
            <ul className="note-list">
              {applications.slice(0, 5).map((a) => (
                <li className="note-item" key={a.id}>
                  {a.job.title} — <span className="status-pill">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
