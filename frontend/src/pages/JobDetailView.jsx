import { BookmarkIcon, ExternalLinkIcon, LocationIcon } from '../components/icons.jsx'
import DemoBadge from '../components/DemoBadge.jsx'
import WhyMatchPanel from '../components/WhyMatchPanel.jsx'
import { skillLabel } from '../utils/skillLabel.js'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

function formatDate(iso) {
  if (!iso) return 'Not provided'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function JobDetailView({
  job,
  matchResult,
  hasCv,
  isSaved,
  preferences,
  onBack,
  onToggleSave,
  onPrepareApplication,
  onGoToAnalyze,
}) {
  if (!job) {
    return (
      <div className="panel">
        <p className="skill-empty">That internship couldn't be found.</p>
        <button type="button" className="new-analysis-btn" onClick={onBack}>Back</button>
      </div>
    )
  }

  return (
    <section className="job-detail">
      <button type="button" className="back-link" onClick={onBack}>&larr; Back</button>

      <div className="panel job-detail-header">
        <div className="job-detail-header-top">
          <span className="job-detail-attribution">
            {job.is_demo ? <DemoBadge /> : 'via The Muse'}
          </span>
          <button
            type="button"
            className={`icon-btn job-card-save-btn ${isSaved ? 'is-saved' : ''}`}
            onClick={() => onToggleSave(job, matchResult)}
            aria-label={isSaved ? 'Remove from saved' : 'Save internship'}
          >
            <BookmarkIcon size={17} filled={isSaved} />
          </button>
        </div>
        <h1 className="job-detail-title">{job.title}</h1>
        <p className="job-detail-company">{job.company}</p>
        <p className="job-detail-meta"><LocationIcon size={14} /> {job.location} · {job.work_mode}</p>

        <dl className="job-detail-facts">
          <div><dt>Posted</dt><dd>{formatDate(job.posted_date)}</dd></div>
          <div><dt>Application deadline</dt><dd>{formatDate(job.application_deadline)}</dd></div>
        </dl>

        <div className="job-detail-actions">
          <button
            type="button"
            className="job-card-btn job-card-btn-secondary"
            onClick={() => job.application_url && window.open(job.application_url, '_blank', 'noopener,noreferrer')}
            disabled={!job.application_url}
          >
            <ExternalLinkIcon size={14} /> Continue to official application
          </button>
          <button type="button" className="job-card-btn job-card-btn-primary" onClick={() => onPrepareApplication(job, matchResult)}>
            Prepare application
          </button>
        </div>
      </div>

      {matchResult ? (
        <div className={`panel score-summary-inline ${SCORE_STATE_CLASS[interpretScore(matchResult.match_score)]}`}>
          <div>
            <span className="stat-tile-label">Semantic match</span>
            <span className="stat-tile-value">{matchResult.match_score}%</span>
          </div>
          <div>
            <span className="stat-tile-label">Skill coverage</span>
            <span className="stat-tile-value">{matchResult.skill_coverage}%</span>
          </div>
          <div>
            <span className="stat-tile-label">Matched skills</span>
            <span className="stat-tile-value">{matchResult.matched_skills.length}</span>
          </div>
          <div>
            <span className="stat-tile-label">Missing skills</span>
            <span className="stat-tile-value">{matchResult.missing_skills.length}</span>
          </div>
        </div>
      ) : (
        <div className="panel">
          <p className="skill-empty">
            Upload your CV on the Analyze page to see your match score, matched skills, and skill gaps for
            this internship.
          </p>
          {hasCv === false && (
            <button type="button" className="new-analysis-btn" onClick={onGoToAnalyze}>Go to Analyze</button>
          )}
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Job description</h2>
        <p className="job-detail-description">{job.description}</p>

        {job.required_skills.length === 0 && job.preferred_skills.length === 0 ? (
          <p className="job-detail-facts-not-provided">
            This posting doesn't list structured required/preferred skills. Skill matching below is based on
            the taxonomy detected directly in the job description text.
          </p>
        ) : (
          <>
            <h3 className="req-category-title" style={{ marginTop: '1.2rem' }}>Required skills</h3>
            {job.required_skills.length > 0 ? (
              <div className="skill-pills">
                {job.required_skills.map((s) => (
                  <span key={s} className="skill-pill skill-pill-matched">{skillLabel(s)}</span>
                ))}
              </div>
            ) : (
              <p className="job-detail-facts-not-provided">Not provided</p>
            )}

            {job.preferred_skills.length > 0 && (
              <>
                <h3 className="req-category-title" style={{ marginTop: '1rem' }}>Preferred skills</h3>
                <div className="skill-pills">
                  {job.preferred_skills.map((s) => (
                    <span key={s} className="skill-pill skill-pill-missing">{skillLabel(s)}</span>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {matchResult && (
        <div className="panel">
          <WhyMatchPanel job={job} matchResult={matchResult} preferences={preferences} />
        </div>
      )}
    </section>
  )
}
