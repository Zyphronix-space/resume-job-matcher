import { useState } from 'react'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

const METRIC_INFO = {
  semantic:
    "Based on sentence-transformer embeddings (all-MiniLM-L6-v2) and cosine similarity between the full text of your resume and the job description. Measures how similar the overall meaning is, not whether specific skills are present.",
  coverage:
    'The percentage of taxonomy skills detected in the job description that were also detected in your resume. Measures keyword/skill overlap, not overall meaning.',
}

function StatTile({ label, value, suffix = '%', info, tone }) {
  const [open, setOpen] = useState(false)
  const toneClass = tone ? SCORE_STATE_CLASS[tone] : ''

  return (
    <div className={`stat-tile ${toneClass}`}>
      <div className="stat-tile-head">
        <span className="stat-tile-label">{label}</span>
        {info && (
          <button
            type="button"
            className="stat-tile-info-btn"
            aria-label={`About ${label}`}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            ?
          </button>
        )}
      </div>
      <span className="stat-tile-value">
        {value}
        {suffix}
      </span>
      {open && info && <p className="stat-tile-info">{info}</p>}
    </div>
  )
}

export default function ScoreSummary({ result }) {
  return (
    <div className="panel">
      <h2 className="panel-title">Resume vs job</h2>
      <p className="panel-subtitle">
        Semantic match and skill coverage are different measurements. They can (and often do) disagree.
      </p>

      <div className="stat-grid">
        <StatTile
          label="Semantic match"
          value={result.match_score}
          tone={interpretScore(result.match_score)}
          info={METRIC_INFO.semantic}
        />
        <StatTile
          label="Skill coverage"
          value={result.skill_coverage}
          tone={interpretScore(result.skill_coverage)}
          info={METRIC_INFO.coverage}
        />
        <StatTile label="Matched skills" value={result.matched_skills.length} suffix="" />
        <StatTile label="Missing skills" value={result.missing_skills.length} suffix="" />
      </div>
    </div>
  )
}
