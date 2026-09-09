import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassMetric, { GlassMetricGrid } from '../../components/glass/GlassMetric.jsx'
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
        <GlassMetricGrid>
          <GlassMetric label="Applications" value={counts.total} />
          <GlassMetric label="Shortlisted" value={counts.shortlisted} />
          <GlassMetric label="Interviews" value={counts.interview} />
          <GlassMetric label="Offers" value={counts.offer} />
        </GlassMetricGrid>
      )}

      <div className="form-grid cols-2" style={{ marginTop: '1.2rem' }}>
        <GlassCard title="Top matches">
          {!matches || matches.length === 0 ? (
            <GlassEmptyState title="No matches yet" subtitle="Upload a resume to see how you match against open roles." action={<GlassButton as={Link} variant="primary" size="sm" to="/resumes">Upload resume</GlassButton>} />
          ) : (
            <ul className="note-list">
              {matches.slice(0, 5).map((m) => (
                <li className="note-item" key={m.job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem' }}>
                  <span>{m.job.title}: {Math.round(m.match_score)}% match</span>
                  {m.already_applied && <GlassBadge status={m.application_status} />}
                </li>
              ))}
            </ul>
          )}
          <div className="form-actions"><GlassButton as={Link} variant="secondary" size="sm" to="/matches">View all matches</GlassButton></div>
        </GlassCard>

        <GlassCard title="Recent applications">
          {!applications || applications.length === 0 ? (
            <GlassEmptyState title="No applications yet" />
          ) : (
            <ul className="note-list">
              {applications.slice(0, 5).map((a) => (
                <li className="note-item" key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {a.job.title} <GlassBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </>
  )
}
