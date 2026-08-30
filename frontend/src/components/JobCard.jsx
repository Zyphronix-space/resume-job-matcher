import { BookmarkIcon, ExternalLinkIcon, LocationIcon } from './icons.jsx'
import DemoBadge from './DemoBadge.jsx'
import { skillLabel } from '../utils/skillLabel.js'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

export default function JobCard({ job, matchResult, isSaved, onOpenDetail, onToggleSave }) {
  return (
    <div className="job-card">
      <div className="job-card-head">
        <div>
          <h3 className="job-card-title">{job.title}</h3>
          <p className="job-card-company">{job.company}</p>
        </div>
        <div className="job-card-head-actions">
          {job.is_demo ? <DemoBadge /> : <span className="job-card-attribution">via The Muse</span>}
          <button
            type="button"
            className={`icon-btn job-card-save-btn ${isSaved ? 'is-saved' : ''}`}
            onClick={() => onToggleSave(job)}
            aria-label={isSaved ? 'Remove from saved' : 'Save internship'}
          >
            <BookmarkIcon size={16} filled={isSaved} />
          </button>
        </div>
      </div>

      <p className="job-card-meta">
        <LocationIcon size={13} /> {job.location} · {job.work_mode}
      </p>

      {matchResult ? (
        <div className={`job-card-match ${SCORE_STATE_CLASS[interpretScore(matchResult.match_score)]}`}>
          <span className="job-card-match-value">{Math.round(matchResult.match_score)}%</span>
          <span className="job-card-match-label">match</span>
        </div>
      ) : (
        <p className="job-card-no-match">Upload your CV on the Analyze page to see your match score.</p>
      )}

      {matchResult && (
        <div className="job-card-skills">
          {matchResult.matched_skills.length > 0 && (
            <div className="job-card-skill-row">
              <span className="job-card-skill-row-label">Matched</span>
              <div className="skill-pills job-card-pills">
                {matchResult.matched_skills.slice(0, 5).map((s) => (
                  <span key={s} className="skill-pill skill-pill-matched">{skillLabel(s)}</span>
                ))}
              </div>
            </div>
          )}
          {matchResult.missing_skills.length > 0 && (
            <div className="job-card-skill-row">
              <span className="job-card-skill-row-label">Missing</span>
              <div className="skill-pills job-card-pills">
                {matchResult.missing_skills.slice(0, 5).map((s) => (
                  <span key={s} className="skill-pill skill-pill-missing">{skillLabel(s)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="job-card-actions">
        <button
          type="button"
          className="job-card-btn job-card-btn-secondary"
          onClick={() => job.application_url && window.open(job.application_url, '_blank', 'noopener,noreferrer')}
          disabled={!job.application_url}
        >
          <ExternalLinkIcon size={14} /> View opportunity
        </button>
        <button type="button" className="job-card-btn job-card-btn-primary" onClick={() => onOpenDetail(job.id)}>
          Analyze match
        </button>
      </div>
    </div>
  )
}
