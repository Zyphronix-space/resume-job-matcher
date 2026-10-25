import JobRequirements from './JobRequirements.jsx'
import SkillGapRoadmap from './SkillGapRoadmap.jsx'
import { skillLabel } from '../utils/skillLabel.js'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

// A neutral (no "your resume"/first-person) match breakdown, used anywhere
// a score needs explaining regardless of who's looking at it: a candidate's
// own match list, a recruiter ranking candidates for a job, or a candidate
// detail page. The numbers and skill lists are exactly what job_matcher.py
// computes; the only generated text is a template sentence built from them.
export default function MatchSummary({ result, showRoadmap = false }) {
  if (!result) return null
  const band = interpretScore(result.match_score)
  const matched = result.matched_skills
  const missing = result.missing_skills
  const total = matched.length + missing.length

  const gapSentence = (() => {
    if (total === 0) return 'No skills from the skills list were detected in this job description.'
    if (missing.length === 0) return 'Every skill detected in the job was also found in the resume.'
    const shown = missing.slice(0, 3).map(skillLabel).join(', ')
    const more = missing.length > 3 ? ` and ${missing.length - 3} more` : ''
    return `Not found in the resume: ${shown}${more}.`
  })()

  return (
    <div className="match-summary">
      <div className="match-head">
        <div className={`match-score-block ${SCORE_STATE_CLASS[band]}`}>
          <span className="match-score-label">Match score</span>
          <span className="match-score num">{Math.round(result.match_score)}<span className="match-score-max">/100</span></span>
          <span className="match-band"><span className="match-band-dot" aria-hidden="true" />{band}</span>
        </div>

        <div className="match-coverage">
          <span className="match-score-label">
            Skill coverage{total > 0 && <> <strong className="num">{matched.length} of {total}</strong></>}
          </span>
          {total > 0 && (
            <div className="coverage" role="img" aria-label={`${matched.length} of ${total} job skills found in the resume`}>
              {matched.map((s) => <span key={s} className="coverage-seg is-matched" />)}
              {missing.map((s) => <span key={s} className="coverage-seg is-missing" />)}
            </div>
          )}
          <p className="match-coverage-sentence">{gapSentence}</p>
        </div>
      </div>

      <details className="score-explainer">
        <summary>How these numbers are calculated</summary>
        <p>
          The match score compares the full resume text with the job description using sentence embeddings
          (cosine similarity, 0 to 100). Skill coverage counts the job’s skills that also appear in the resume.
          The label is a fixed band of the score. Both are sorting aids, not a prediction of whether someone
          will be hired.
        </p>
      </details>

      <JobRequirements result={result} />
      {showRoadmap && <SkillGapRoadmap roadmap={result.skill_gap_roadmap} />}
    </div>
  )
}
