import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import { listMyJobs } from '../../utils/jobs.js'

export default function MatchingPage() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    listMyJobs().then(setJobs).catch((err) => setError(err.message))
  }, [])

  return (
    <>
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Matching</h1>
        <p className="hero-subtitle">Pick a job to see its candidates ranked by AI match score.</p>
      </section>

      {error && <p className="field-error">{error}</p>}
      {jobs && jobs.length === 0 && <EmptyState title="No jobs yet" subtitle="Create a job first." action={<Link className="analyze-btn" to="/jobs">Create a job</Link>} />}

      {jobs && jobs.length > 0 && (
        <div className="form-grid cols-2">
          {jobs.map((j) => (
            <Link key={j.id} to={`/jobs/${j.id}?tab=AI Matches`} className="panel job-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="job-card-head">
                <div>
                  <h3 className="job-card-title">{j.title}</h3>
                  <p className="job-card-company">{j.location || 'Location not set'}</p>
                </div>
                <span className={`status-pill status-${j.status.toLowerCase()}`}>{j.status}</span>
              </div>
              <p className="job-card-meta">{j.applicants_count} applicant{j.applicants_count === 1 ? '' : 's'}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
