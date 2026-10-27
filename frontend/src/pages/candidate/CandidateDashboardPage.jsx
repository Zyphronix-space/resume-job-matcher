import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassMetric, { GlassMetricGrid } from '../../components/glass/GlassMetric.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import ScoreMeter from '../../components/ScoreMeter.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { DocumentIcon, WarningIcon } from '../../components/icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getCandidateMatches, listMyApplications } from '../../utils/applications.js'
import { listResumes } from '../../utils/resumes.js'

// The panel at the top answers "what should I do next?" from real state:
// no resume yet, a resume but nothing applied to, or applications in flight.
function NextStep({ activeResume, matches, applications }) {
  if (!activeResume) {
    return (
      <section className="next-step" aria-labelledby="next-step-title">
        <span className="next-step-icon"><DocumentIcon size={20} /></span>
        <div className="next-step-text">
          <h2 id="next-step-title">Start with your resume</h2>
          <p>Upload a PDF and every open role will be ranked against it, with the skills you have and the ones you’re missing.</p>
        </div>
        <GlassButton as={Link} to="/resumes" variant="primary">Upload resume</GlassButton>
      </section>
    )
  }

  const best = matches.find((m) => !m.already_applied)
  if (best) {
    return (
      <section className="next-step" aria-labelledby="next-step-title">
        <div className="next-step-text">
          <h2 id="next-step-title">Your strongest open match: {best.job.title}</h2>
          <p>
            Scored against {activeResume.filename}. Check the missing skills before you apply.
          </p>
        </div>
        <ScoreMeter score={best.match_score} />
        <GlassButton as={Link} to="/matches" variant="primary">Review matches</GlassButton>
      </section>
    )
  }

  if (applications.length === 0) {
    return (
      <section className="next-step" aria-labelledby="next-step-title">
        <div className="next-step-text">
          <h2 id="next-step-title">No open roles right now</h2>
          <p>Your resume is ready. Matches will appear here as soon as recruiters open new jobs.</p>
        </div>
      </section>
    )
  }

  return null
}

export default function CandidateDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([listMyApplications(), getCandidateMatches(), listResumes()])
      .then(([applications, matches, resumes]) => setData({
        applications,
        matches,
        activeResume: resumes.find((r) => r.is_active) || null,
      }))
      .catch((err) => setError(err.message))
  }, [])

  const counts = useMemo(() => {
    if (!data) return null
    const by = (status) => data.applications.filter((a) => a.status === status).length
    return { total: data.applications.length, shortlisted: by('Shortlisted'), interview: by('Interview'), offer: by('Offer') }
  }, [data])

  const firstName = user.full_name ? user.full_name.split(' ')[0] : null

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        description="Your matches and applications."
      />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!data && !error && <LoadingBlock rows={3} label="Loading your overview" />}

      {data && (
        <div className="stack">
          <NextStep {...data} />

          {counts.total > 0 && (
            <GlassMetricGrid>
              <GlassMetric label="Applications" value={counts.total} />
              <GlassMetric label="Shortlisted" value={counts.shortlisted} />
              <GlassMetric label="Interviewing" value={counts.interview} />
              <GlassMetric label="Offers" value={counts.offer} />
            </GlassMetricGrid>
          )}

          <div className="split">
            <GlassCard
              title="Top matches"
              actions={data.matches.length > 0 && <Link to="/matches" className="text-link">View all</Link>}
            >
              {data.matches.length === 0 ? (
                <GlassEmptyState
                  title="No matches yet"
                  subtitle={data.activeResume ? 'There are no open roles to compare against yet.' : 'Upload a resume to see how you match open roles.'}
                />
              ) : (
                <ul className="row-list">
                  {data.matches.slice(0, 5).map((m) => (
                    <li className="row-list-item" key={m.job.id}>
                      <div className="row-list-main">
                        <span className="row-list-title">{m.job.title}</span>
                        <span className="row-list-meta">
                          {m.matched_skills.length} of {m.matched_skills.length + m.missing_skills.length} skills found
                        </span>
                      </div>
                      {m.already_applied && <GlassBadge status={m.application_status} />}
                      <ScoreMeter score={m.match_score} />
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>

            <GlassCard title="Applications">
              {data.applications.length === 0 ? (
                <GlassEmptyState title="No applications yet" subtitle="When you apply to a role, its status shows up here." />
              ) : (
                <ul className="row-list">
                  {data.applications.slice(0, 5).map((a) => (
                    <li className="row-list-item" key={a.id}>
                      <div className="row-list-main">
                        <span className="row-list-title">{a.job.title}</span>
                        <span className="row-list-meta">Applied {new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                      <GlassBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </>
  )
}
