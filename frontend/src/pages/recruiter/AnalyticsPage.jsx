import { useEffect, useState } from 'react'
import EmptyState from '../../components/EmptyState.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { getAnalyticsOverview } from '../../utils/analytics.js'

function BarRow({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
      <span style={{ width: 130, fontSize: '0.82rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: 'var(--accent)', height: '100%', borderRadius: 999 }} />
      </div>
      <span style={{ width: 28, textAlign: 'right', fontSize: '0.82rem', fontWeight: 700 }}>{value}</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAnalyticsOverview().then(setOverview).catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="field-error">{error}</p>
  if (!overview) return null

  const maxStatus = Math.max(1, ...Object.values(overview.status_distribution))
  const maxScore = Math.max(1, ...overview.score_distribution.map((b) => b.count))
  const maxSkill = Math.max(1, ...overview.skills_demand.map((s) => s.count))

  return (
    <>
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Analytics</h1>
        <p className="hero-subtitle">Computed live from your jobs and applications — nothing here is estimated.</p>
      </section>

      <div className="form-grid cols-2">
        <div className="panel">
          <h2 className="panel-title">Candidate distribution</h2>
          <p className="panel-subtitle">Applications by pipeline status</p>
          <div style={{ marginTop: '1rem' }}>
            {Object.entries(overview.status_distribution).map(([status, count]) => (
              <BarRow key={status} label={status} value={count} max={maxStatus} />
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 className="panel-title">Match score distribution</h2>
          <p className="panel-subtitle">Every application's match score, bucketed</p>
          <div style={{ marginTop: '1rem' }}>
            {overview.score_distribution.map((b) => (
              <BarRow key={b.range} label={`${b.range}%`} value={b.count} max={maxScore} />
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1.2rem' }}>
        <h2 className="panel-title">Skills demand</h2>
        <p className="panel-subtitle">Most-requested skills across your job postings (required + preferred)</p>
        {overview.skills_demand.length === 0 ? (
          <EmptyState title="No skills tagged yet" subtitle="Add required/preferred skills to your jobs to see demand here." />
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {overview.skills_demand.map((s) => (
              <BarRow key={s.skill} label={skillLabel(s.skill)} value={s.count} max={maxSkill} />
            ))}
          </div>
        )}
      </div>

      <div className="panel" style={{ marginTop: '1.2rem' }}>
        <h2 className="panel-title">Hiring pipeline</h2>
        <div className="pipeline-board">
          {Object.entries(overview.pipeline).map(([stage, count]) => (
            <div className="pipeline-column" key={stage}>
              <span className="pipeline-column-label">{stage}</span>
              <span className="pipeline-column-value">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
