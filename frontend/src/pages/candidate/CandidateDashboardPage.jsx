import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassMetric, { GlassMetricGrid } from '../../components/glass/GlassMetric.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { BriefcaseIcon, DocumentIcon, UserIcon, WarningIcon } from '../../components/icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { listMyApplications } from '../../utils/applications.js'
import { listResumes } from '../../utils/resumes.js'
import { formatDate, getCandidateProfile, getTrackerSummary, postingFacts, searchPostings } from '../../utils/workspace.js'

// "What should I do next?", answered from real state in a fixed order:
// resume, reviewed profile, a first saved job, then follow-ups that are due.
function NextStep({ activeResume, profile, summary }) {
  const overdue = summary.follow_ups.filter((f) => f.overdue)
  const step = !activeResume ? {
    Icon: DocumentIcon, title: 'Start with your resume',
    body: 'Upload a PDF. Every job you look at can then be checked against it, requirement by requirement.',
    action: <GlassButton as={Link} to="/resumes" variant="primary">Upload resume</GlassButton>,
  } : !profile.confirmed ? {
    Icon: UserIcon, title: 'Check what was read from your resume',
    body: 'Review the experience, projects and skills taken from your resume. Your drafts only use what you confirm.',
    action: <GlassButton as={Link} to="/profile" variant="primary">Review profile</GlassButton>,
  } : summary.total === 0 ? {
    Icon: BriefcaseIcon, title: 'Save your first job',
    body: 'Browse real openings or paste one you found elsewhere. Saved jobs get a fit check, drafts and interview prep.',
    action: <GlassButton as={Link} to="/openings" variant="primary">Browse jobs</GlassButton>,
  } : overdue.length > 0 ? {
    Icon: WarningIcon, title: `${overdue.length} follow-up${overdue.length === 1 ? ' is' : 's are'} overdue`,
    body: `Starting with ${overdue[0].title}${overdue[0].company ? ` at ${overdue[0].company}` : ''}.`,
    action: <GlassButton as={Link} to={`/tracker/${overdue[0].id}`} variant="primary">Open it</GlassButton>,
  } : null

  if (!step) return null
  return (
    <section className="next-step" aria-labelledby="next-step-title">
      <span className="next-step-icon"><step.Icon size={20} /></span>
      <div className="next-step-text">
        <h2 id="next-step-title">{step.title}</h2>
        <p>{step.body}</p>
      </div>
      {step.action}
    </section>
  )
}

export default function CandidateDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([listResumes(), getCandidateProfile(), getTrackerSummary(), listMyApplications()])
      .then(([resumes, profile, summary, applications]) => setData({
        activeResume: resumes.find((r) => r.is_active) || null, profile, summary, applications,
      }))
      .catch((err) => setError(err.message))
    searchPostings({ open_to_sri_lanka: 'true', level: 'Internship,Graduate,Junior', sort: 'skills', limit: 5 })
      .then(setJobs)
      .catch(() => setJobs({ results: [], total: 0 }))
  }, [])

  const firstName = user.full_name ? user.full_name.split(' ')[0] : null
  const by = data?.summary.by_stage || {}

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        description="Your job search: what to do next, what’s due, and openings worth a look."
      />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!data && !error && <LoadingBlock rows={3} label="Loading your overview" />}

      {data && (
        <div className="stack">
          <NextStep {...data} />

          {data.summary.total > 0 && (
            <GlassMetricGrid>
              <GlassMetric label="Saved or preparing" value={(by.Saved || 0) + (by.Preparing || 0)} />
              <GlassMetric label="Applied" value={(by.Applied || 0) + (by.Assessment || 0)} />
              <GlassMetric label="Interviewing" value={by.Interview || 0} />
              <GlassMetric label="Offers" value={by.Offer || 0} />
            </GlassMetricGrid>
          )}

          {data.summary.expired_saved.length > 0 && (
            <p className="form-alert is-warning" role="status">
              <WarningIcon size={15} />
              {data.summary.expired_saved.length === 1
                ? `“${data.summary.expired_saved[0].title}” is no longer listed by the employer.`
                : `${data.summary.expired_saved.length} jobs you saved are no longer listed by their employers.`}
              {' '}<Link className="text-link" to={`/tracker/${data.summary.expired_saved[0].id}`}>Check it</Link>
            </p>
          )}

          <div className="split">
            <GlassCard
              title="Follow-ups"
              subtitle="Due in the next two weeks."
              actions={data.summary.total > 0 && <Link to="/tracker" className="text-link">Tracker</Link>}
            >
              {data.summary.follow_ups.length === 0 ? (
                <GlassEmptyState
                  title="Nothing due"
                  subtitle={data.summary.total > 0 ? 'Set a follow-up date on a tracked job and it shows up here.' : 'Track a job to plan follow-ups.'}
                />
              ) : (
                <ul className="row-list">
                  {data.summary.follow_ups.slice(0, 6).map((f) => (
                    <li className="row-list-item" key={f.id}>
                      <div className="row-list-main">
                        <Link to={`/tracker/${f.id}`} className="row-list-title">{f.title}</Link>
                        <span className="row-list-meta">{f.company || 'No company'} · {f.stage}</span>
                      </div>
                      <GlassBadge variant={f.overdue ? 'danger' : 'neutral'}>
                        {f.overdue ? 'Overdue' : formatDate(f.next_follow_up)}
                      </GlassBadge>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>

            <GlassCard
              title="Openings worth a look"
              subtitle={data.activeResume ? 'Early-career roles open to Sri Lanka, most skills in common first.' : 'Early-career roles open to applicants in Sri Lanka.'}
              actions={<Link to="/openings" className="text-link">All jobs</Link>}
            >
              {!jobs && <LoadingBlock rows={2} label="Loading jobs" />}
              {jobs && jobs.results.length === 0 && (
                <GlassEmptyState title="No matching openings right now" subtitle="Browse all jobs or widen the filters." />
              )}
              {jobs && jobs.results.length > 0 && (
                <ul className="row-list">
                  {jobs.results.map((p) => (
                    <li className="row-list-item" key={p.id}>
                      <div className="row-list-main">
                        <Link to={`/openings/${p.id}`} className="row-list-title">{p.title}</Link>
                        <span className="row-list-meta">{[p.company, ...postingFacts(p).slice(0, 2)].join(' · ')}</span>
                      </div>
                      {p.skill_overlap && (
                        <span className="row-list-meta is-fixed num">{p.skill_overlap.found}/{p.skill_overlap.total} skills</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </div>

          {data.applications.length > 0 && (
            <GlassCard title="Applications sent through ResumeMatch" subtitle="Roles a recruiter posted here directly, and their status.">
              <ul className="row-list">
                {data.applications.slice(0, 5).map((a) => (
                  <li className="row-list-item" key={a.id}>
                    <div className="row-list-main">
                      <span className="row-list-title">{a.job.title}</span>
                      <span className="row-list-meta">Applied {formatDate(a.created_at)}</span>
                    </div>
                    <GlassBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      )}
    </>
  )
}
