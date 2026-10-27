import { useEffect, useState } from 'react'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import PipelineFunnel from '../../components/PipelineFunnel.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { skillLabel } from '../../utils/skillLabel.js'
import { getAnalyticsOverview } from '../../utils/analytics.js'

function BarRow({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <li className="bar-row">
      <span className="bar-row-label">{label}</span>
      <span className="bar-row-track" aria-hidden="true"><span className="bar-row-fill" style={{ width: `${pct}%` }} /></span>
      <span className="bar-row-value num">{value}</span>
    </li>
  )
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAnalyticsOverview().then(setOverview).catch((err) => setError(err.message))
  }, [])

  const header = <PageHeader title="Analytics" description="Calculated from your own jobs and applications each time this page loads." />
  if (error) return <>{header}<p className="field-error" role="alert"><WarningIcon size={15} />{error}</p></>
  if (!overview) return <>{header}<LoadingBlock rows={3} label="Loading analytics" /></>

  const maxStatus = Math.max(1, ...Object.values(overview.status_distribution))
  const maxScore = Math.max(1, ...overview.score_distribution.map((b) => b.count))
  const maxSkill = Math.max(1, ...overview.skills_demand.map((s) => s.count))

  return (
    <>
      {header}

      <div className="stack">
        <div className="split">
          <GlassCard title="Applications by status">
            <ul className="bar-list">
              {Object.entries(overview.status_distribution).map(([status, count]) => (
                <BarRow key={status} label={status} value={count} max={maxStatus} />
              ))}
            </ul>
          </GlassCard>

          <GlassCard title="Match scores" subtitle="Number of applications in each score range.">
            <ul className="bar-list">
              {overview.score_distribution.map((b) => (
                <BarRow key={b.range} label={`${b.range}%`} value={b.count} max={maxScore} />
              ))}
            </ul>
          </GlassCard>
        </div>

        <GlassCard title="Most requested skills" subtitle="Required and preferred skills across your job postings.">
          {overview.skills_demand.length === 0 ? (
            <GlassEmptyState title="No skills tagged yet" subtitle="Add required or preferred skills to your jobs to see them here." />
          ) : (
            <ul className="bar-list">
              {overview.skills_demand.map((s) => (
                <BarRow key={s.skill} label={skillLabel(s.skill)} value={s.count} max={maxSkill} />
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard title="Pipeline">
          <PipelineFunnel pipeline={overview.pipeline} />
        </GlassCard>
      </div>
    </>
  )
}
