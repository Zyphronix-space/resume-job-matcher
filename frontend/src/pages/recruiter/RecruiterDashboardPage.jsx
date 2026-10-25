import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassMetric, { GlassMetricGrid } from '../../components/glass/GlassMetric.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import PipelineFunnel from '../../components/PipelineFunnel.jsx'
import ScoreMeter from '../../components/ScoreMeter.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { BriefcaseIcon, PlusIcon, WarningIcon } from '../../components/icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getAnalyticsOverview } from '../../utils/analytics.js'

export default function RecruiterDashboardPage() {
  const { user } = useAuth()
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getAnalyticsOverview().then(setOverview).catch((err) => setError(err.message))
  }, [])

  const firstName = user.full_name ? user.full_name.split(' ')[0] : null
  const hasJobs = overview && overview.recent_jobs.length > 0
  const hasApplicants = overview && overview.recent_candidates.length > 0

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        description="Your jobs, applicants, and pipeline."
        actions={<GlassButton as={Link} to="/jobs" variant="primary" icon={<PlusIcon size={15} />}>New job</GlassButton>}
      />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!overview && !error && <LoadingBlock rows={3} label="Loading your overview" />}

      {overview && !hasJobs && (
        <section className="next-step" aria-labelledby="next-step-title">
          <span className="next-step-icon"><BriefcaseIcon size={20} /></span>
          <div className="next-step-text">
            <h2 id="next-step-title">Post your first job</h2>
            <p>Add a description and the skills you need. Candidates who apply are scored and ranked against it automatically.</p>
          </div>
          <GlassButton as={Link} to="/jobs" variant="primary">Create a job</GlassButton>
        </section>
      )}

      {overview && hasJobs && (
        <div className="stack">
          <GlassMetricGrid>
            <GlassMetric label="Open jobs" value={overview.open_jobs} />
            <GlassMetric label="Candidates" value={overview.total_candidates} />
            <GlassMetric label="New applications, last 7 days" value={overview.new_applications} />
            <GlassMetric label="Shortlisted" value={overview.shortlisted_candidates} />
          </GlassMetricGrid>

          <GlassCard title="Pipeline" actions={<Link to="/analytics" className="text-link">Analytics</Link>}>
            <PipelineFunnel pipeline={overview.pipeline} />
          </GlassCard>

          <div className="split">
            <GlassCard title="Strongest matches" subtitle="Highest-scoring applications across your jobs.">
              {overview.top_matches.length === 0 ? (
                <GlassEmptyState title="No applications yet" subtitle="Ranked applicants appear here once candidates apply." />
              ) : (
                <ul className="row-list">
                  {overview.top_matches.map((m) => (
                    <li className="row-list-item" key={m.application_id}>
                      <div className="row-list-main">
                        <Link to={`/candidates/${m.candidate_id}`} className="row-list-title is-link">{m.candidate_name}</Link>
                        <Link to={`/jobs/${m.job_id}`} className="row-list-meta is-link">{m.job_title}</Link>
                      </div>
                      <ScoreMeter score={m.match_score} />
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>

            <GlassCard title="Recent applicants">
              {!hasApplicants ? (
                <GlassEmptyState title="No applicants yet" subtitle="New applications show up here as they arrive." />
              ) : (
                <ul className="row-list">
                  {overview.recent_candidates.map((c) => (
                    <li className="row-list-item" key={c.application_id}>
                      <div className="row-list-main">
                        <Link to={`/candidates/${c.candidate_id}`} className="row-list-title is-link">{c.candidate_name}</Link>
                        <Link to={`/jobs/${c.job_id}`} className="row-list-meta is-link">{c.job_title}</Link>
                      </div>
                      <ScoreMeter score={c.match_score} />
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </div>

          <GlassCard title="Recent jobs" actions={<Link to="/jobs" className="text-link">All jobs</Link>}>
            <ul className="row-list">
              {overview.recent_jobs.map((j) => (
                <li className="row-list-item" key={j.id}>
                  <div className="row-list-main">
                    <Link to={`/jobs/${j.id}`} className="row-list-title is-link">{j.title}</Link>
                  </div>
                  <GlassBadge status={j.status} />
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>
      )}
    </>
  )
}
