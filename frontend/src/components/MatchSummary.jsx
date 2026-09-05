import JobRequirements from './JobRequirements.jsx'
import SkillGapRoadmap from './SkillGapRoadmap.jsx'
import { skillLabel } from '../utils/skillLabel.js'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

// A neutral (no "your resume"/first-person) match breakdown, used anywhere
// a score needs explaining regardless of who's looking at it: a candidate's
// own match list, a recruiter ranking candidates for a job, a candidate
// detail page, or a side-by-side comparison. The score and skill fields are
// exactly what job_matcher.py computes — nothing here is generated text,
// just a template sentence built from those real numbers.
export default function MatchSummary({ result, showRoadmap = false }) {
  if (!result) return null
  const label = interpretScore(result.match_score)
  const total = result.matched_skills.length + result.missing_skills.length

  const summarySentence = (() => {
    // Doesn't restate the label — that's already shown right above this
    // sentence in the score header — just the supporting detail.
    const base = `${result.matched_skills.length} of ${total} detected skills present`
    if (result.missing_skills.length === 0) return `${base}.`
    const shown = result.missing_skills.slice(0, 3).map(skillLabel).join(', ')
    const more = result.missing_skills.length > 3 ? ', and more' : ''
    return `${base}. Missing ${shown}${more}.`
  })()

  return (
    <div className="match-summary">
      <div className={`match-summary-head ${SCORE_STATE_CLASS[label]}`}>
        <span className="match-summary-score">{Math.round(result.match_score)}<span className="match-summary-score-max">/100</span></span>
        <div>
          <span className="match-summary-label">{label}</span>
          {result.skill_coverage !== undefined && (
            <span className="match-summary-coverage">{result.skill_coverage}% skill coverage</span>
          )}
          <p className="match-summary-sentence">{summarySentence}</p>
        </div>
      </div>

      <div className="match-summary-skill-lists">
        <div>
          <h4>Matched Skills</h4>
          {result.matched_skills.length ? (
            <ul className="skill-check-list">
              {result.matched_skills.map((s) => <li key={s} className="is-matched">✓ {skillLabel(s)}</li>)}
            </ul>
          ) : <p className="skill-empty">None detected</p>}
        </div>
        <div>
          <h4>Missing Skills</h4>
          {result.missing_skills.length ? (
            <ul className="skill-check-list">
              {result.missing_skills.map((s) => <li key={s} className="is-missing">⚠ {skillLabel(s)}</li>)}
            </ul>
          ) : <p className="skill-empty">None — every detected skill is covered</p>}
        </div>
      </div>

      <JobRequirements result={result} />
      {showRoadmap && <SkillGapRoadmap roadmap={result.skill_gap_roadmap} />}
    </div>
  )
}
