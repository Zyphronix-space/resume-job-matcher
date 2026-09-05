import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import MatchSummary from '../../components/MatchSummary.jsx'
import { applyToJob, getCandidateMatches } from '../../utils/applications.js'

export default function MatchesPage() {
  const [matches, setMatches] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [applying, setApplying] = useState(null)

  const load = () => getCandidateMatches().then(setMatches).catch((err) => setError(err.message))
  useEffect(() => { load() }, [])

  const handleApply = async (jobId) => {
    setApplying(jobId)
    try {
      await applyToJob(jobId)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setApplying(null)
    }
  }

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Your matches</h1>
        <p className="hero-subtitle">Every open role, ranked by how well your active resume matches it.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      {matches && matches.length === 0 && (
        <EmptyState title="No matches yet" subtitle="Upload a resume to see how you match against open roles." action={<Link className="analyze-btn" to="/resumes">Upload resume</Link>} />
      )}

      {matches && matches.map((m) => (
        <div className="panel" key={m.job.id} style={{ marginBottom: '1rem' }}>
          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 className="panel-title">{m.job.title}</h2>
              <p className="panel-subtitle">{m.job.location || 'Location not set'} · {Math.round(m.match_score)}% match</p>
            </div>
            <div className="data-table-actions">
              <button type="button" className="new-analysis-btn" onClick={() => setExpanded((e) => (e === m.job.id ? null : m.job.id))}>
                {expanded === m.job.id ? 'Hide details' : 'View details'}
              </button>
              {m.already_applied ? (
                <span className="status-pill">{m.application_status}</span>
              ) : (
                <button type="button" className="analyze-btn" disabled={applying === m.job.id} onClick={() => handleApply(m.job.id)}>
                  {applying === m.job.id ? 'Applying…' : 'Apply'}
                </button>
              )}
            </div>
          </div>
          {expanded === m.job.id && <MatchSummary result={m} showRoadmap />}
        </div>
      ))}
    </>
  )
}
