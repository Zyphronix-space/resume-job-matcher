import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import MatchSummary from '../../components/MatchSummary.jsx'
import { applyToJob, getCandidateMatches } from '../../utils/applications.js'

export default function MatchesPage() {
  const [matches, setMatches] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [applying, setApplying] = useState(null)
  const showToast = useToast()

  const load = () => getCandidateMatches().then(setMatches).catch((err) => setError(err.message))
  useEffect(() => { load() }, [])

  const handleApply = async (jobId, title) => {
    setApplying(jobId)
    try {
      await applyToJob(jobId)
      showToast(`Applied to ${title}`, 'success')
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
        <GlassEmptyState title="No matches yet" subtitle="Upload a resume to see how you match against open roles." action={<GlassButton as={Link} variant="primary" to="/resumes">Upload resume</GlassButton>} />
      )}

      {matches && matches.map((m) => (
        <GlassCard key={m.job.id} style={{ marginBottom: '1rem' }}>
          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 className="glass-card-title">{m.job.title}</h2>
              <p className="glass-card-subtitle">{m.job.location || 'Location not set'} · {Math.round(m.match_score)}% match</p>
            </div>
            <div className="data-table-actions">
              <GlassButton variant="secondary" size="sm" onClick={() => setExpanded((e) => (e === m.job.id ? null : m.job.id))}>
                {expanded === m.job.id ? 'Hide details' : 'View details'}
              </GlassButton>
              {m.already_applied ? (
                <GlassBadge status={m.application_status} />
              ) : (
                <GlassButton variant="primary" size="sm" disabled={applying === m.job.id} onClick={() => handleApply(m.job.id, m.job.title)}>
                  {applying === m.job.id ? 'Applying…' : 'Apply'}
                </GlassButton>
              )}
            </div>
          </div>
          {expanded === m.job.id && <MatchSummary result={m} showRoadmap />}
        </GlassCard>
      ))}
    </>
  )
}
