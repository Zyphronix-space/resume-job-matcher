import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import MatchSummary from '../../components/MatchSummary.jsx'
import ScoreMeter from '../../components/ScoreMeter.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { ChevronDownIcon, WarningIcon } from '../../components/icons.jsx'
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
    setError(null)
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
      <PageHeader
        title="Roles posted here"
        description="Jobs recruiters posted directly on ResumeMatch, ranked against your active resume. Applying here shares your resume with that recruiter."
      />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!matches && !error && <LoadingBlock rows={4} label="Scoring open roles against your resume" />}

      {matches && matches.length === 0 && (
        <GlassEmptyState
          title="No roles posted here yet"
          subtitle="Recruiters haven’t opened roles on ResumeMatch directly. Real openings from employer job boards are on the Jobs page."
          action={<GlassButton as={Link} variant="primary" to="/openings">Browse jobs</GlassButton>}
        />
      )}

      {matches && matches.length > 0 && (
        <ul className="match-list">
          {matches.map((m) => {
            const isOpen = expanded === m.job.id
            const total = m.matched_skills.length + m.missing_skills.length
            return (
              <li key={m.job.id} className={`match-card ${isOpen ? 'is-open' : ''}`}>
                <div className="match-card-row">
                  <div className="match-card-main">
                    <h2 className="match-card-title">{m.job.title}</h2>
                    <p className="match-card-meta">
                      {[m.job.location, m.job.employment_type].filter(Boolean).join(', ') || 'Location not set'}
                      {total > 0 && <>. {m.matched_skills.length} of {total} skills found</>}
                    </p>
                  </div>
                  <ScoreMeter score={m.match_score} />
                  <div className="match-card-actions">
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : m.job.id)}
                    >
                      {isOpen ? 'Hide breakdown' : 'Breakdown'}
                      <ChevronDownIcon size={14} className={`skill-chevron ${isOpen ? 'is-open' : ''}`} />
                    </GlassButton>
                    {m.already_applied ? (
                      <GlassBadge status={m.application_status} />
                    ) : (
                      <GlassButton
                        variant="primary"
                        size="sm"
                        loading={applying === m.job.id}
                        loadingText="Applying…"
                        disabled={applying !== null && applying !== m.job.id}
                        onClick={() => handleApply(m.job.id, m.job.title)}
                      >
                        Apply
                      </GlassButton>
                    )}
                  </div>
                </div>
                {isOpen && (
                  <div className="match-card-body">
                    <MatchSummary result={m} showRoadmap />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
