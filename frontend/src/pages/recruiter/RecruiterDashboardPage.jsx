import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { GlassMetricGrid } from '../../components/glass/GlassMetric.jsx'
import GlassMetric from '../../components/glass/GlassMetric.jsx'
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
          <GlassMetricGrid>
            <GlassMetric label="Open Jobs" value={overview.open_jobs} />
            <GlassMetric label="Total Candidates" value={overview.total_candidates} />
            <GlassMetric label="New Applications (7d)" value={overview.new_applications} />
            <GlassMetric label="Shortlisted" value={overview.shortlisted_candidates} />
          </GlassMetricGrid>

          <GlassCard title="Pipeline" style={{ marginTop: '1.2rem' }}>
            <div className="pipeline-board">
              {Object.entries(overview.pipeline).map(([stage, count]) => (
                <div className="pipeline-column" key={stage}>
                  <span className="pipeline-column-label">{stage}</span>
                  <span className="pipeline-column-value">{count}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <div className="form-grid cols-2" style={{ marginTop: '1.2rem' }}>
            <GlassCard title="Recent candidates">
              {overview.recent_candidates.length === 0 ? (
                <GlassEmptyState title="No applications yet" subtitle="They'll show up here once candidates start applying." />
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
            </GlassCard>

            <GlassCard title="Recent jobs">
              {overview.recent_jobs.length === 0 ? (
                <GlassEmptyState title="No jobs yet" subtitle="Create your first job posting to start matching candidates." action={<GlassButton as={Link} variant="primary" size="sm" to="/jobs">Create a job</GlassButton>} />
              ) : (
                <ul className="note-list">
                  {overview.recent_jobs.map((j) => (
                    <li className="note-item" key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Link to={`/jobs/${j.id}`}>{j.title}</Link> <GlassBadge status={j.status} />
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </div>

          <GlassCard title="Top matches" style={{ marginTop: '1.2rem' }}>
            {overview.top_matches.length === 0 ? (
              <GlassEmptyState title="No matches yet" />
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
          </GlassCard>
        </>
      )}
    </>
  )
}
