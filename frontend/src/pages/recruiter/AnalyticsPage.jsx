import { useEffect, useState } from 'react'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import PipelineFunnel from '../../components/PipelineFunnel.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { getAnalyticsOverview } from '../../utils/analytics.js'

function BarRow({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.6rem' }}>
      <span style={{ width: 130, fontSize: '0.82rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 'var(--radius-pill)', height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: 'var(--accent-gradient)', height: '100%', borderRadius: 'var(--radius-pill)' }} />
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
        <p className="hero-subtitle">Computed live from your jobs and applications. Nothing here is estimated.</p>
      </section>

      <div className="form-grid cols-2">
        <GlassCard title="Candidate distribution" subtitle="Applications by pipeline status">
          <div style={{ marginTop: '1rem' }}>
            {Object.entries(overview.status_distribution).map(([status, count]) => (
              <BarRow key={status} label={status} value={count} max={maxStatus} />
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Match score distribution" subtitle="Every application's match score, bucketed">
          <div style={{ marginTop: '1rem' }}>
            {overview.score_distribution.map((b) => (
              <BarRow key={b.range} label={`${b.range}%`} value={b.count} max={maxScore} />
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Skills demand" subtitle="Most-requested skills across your job postings (required + preferred)" style={{ marginTop: '1.2rem' }}>
        {overview.skills_demand.length === 0 ? (
          <GlassEmptyState title="No skills tagged yet" subtitle="Add required/preferred skills to your jobs to see demand here." />
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {overview.skills_demand.map((s) => (
              <BarRow key={s.skill} label={skillLabel(s.skill)} value={s.count} max={maxSkill} />
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard title="Hiring pipeline" style={{ marginTop: '1.2rem' }}>
        <PipelineFunnel pipeline={overview.pipeline} />
        <div className="pipeline-board" style={{ marginTop: '1rem' }}>
          {Object.entries(overview.pipeline).map(([stage, count]) => (
            <div className="pipeline-column" key={stage}>
              <span className="pipeline-column-label">{stage}</span>
              <span className="pipeline-column-value">{count}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  )
}
