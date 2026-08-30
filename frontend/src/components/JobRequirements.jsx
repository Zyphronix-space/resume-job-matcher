import { useState } from 'react'
import { CheckIcon, CloseIcon } from './icons.jsx'
import { skillLabel } from '../utils/skillLabel.js'

const IMPORTANCE_CLASS = {
  Critical: 'importance-critical',
  High: 'importance-high',
  Medium: 'importance-medium',
}

function SkillRow({ skill, matched, importance, evidence, selected, onSelect }) {
  const clickable = matched && Boolean(evidence)

  return (
    <li className="req-row">
      <button
        type="button"
        className={`req-row-btn ${selected ? 'is-selected' : ''} ${clickable ? '' : 'is-static'}`}
        onClick={() => clickable && onSelect(skill)}
        disabled={!clickable}
      >
        <span className={`req-status ${matched ? 'is-matched' : 'is-missing'}`}>
          {matched ? <CheckIcon size={13} /> : <CloseIcon size={13} />}
        </span>
        <span className="req-name">{skillLabel(skill)}</span>
        {importance && (
          <span className={`importance-badge ${IMPORTANCE_CLASS[importance.level] || ''}`}>{importance.level}</span>
        )}
      </button>

      {selected && evidence && (
        <div className="req-evidence">
          <p className="req-evidence-label">Detected in:</p>
          <div className="req-evidence-sections">
            {evidence.sections.length ? (
              evidence.sections.map((s) => (
                <span key={s} className="req-evidence-section-pill">{s}</span>
              ))
            ) : (
              <span className="req-evidence-section-pill">Elsewhere in resume</span>
            )}
          </div>
          {evidence.snippet && <p className="req-evidence-snippet">"{evidence.snippet}"</p>}
        </div>
      )}
    </li>
  )
}

export default function JobRequirements({ result }) {
  const [selectedSkill, setSelectedSkill] = useState(null)
  const categories = result.skill_categories || {}
  const categoryNames = Object.keys(categories)
  const totalDetected = result.matched_skills.length + result.missing_skills.length
  const coveragePct = totalDetected ? Math.round((result.matched_skills.length / totalDetected) * 100) : 0

  return (
    <div className="panel">
      <h2 className="panel-title">Job requirements</h2>
      <p className="panel-subtitle">
        Skills detected in the job description via the curated taxonomy, grouped by category. Click a matched
        skill to see where it was found in your resume.
      </p>

      <div className="keyword-coverage-summary">
        <span>{result.matched_skills.length} / {totalDetected} detected</span>
        <span className="keyword-coverage-pct">{coveragePct}% keyword coverage</span>
      </div>

      {categoryNames.length === 0 && (
        <p className="skill-empty">No taxonomy skills were detected in this job description.</p>
      )}

      {categoryNames.map((cat) => {
        const { matched = [], missing = [] } = categories[cat]
        const rows = [...matched.map((s) => [s, true]), ...missing.map((s) => [s, false])]
        return (
          <div key={cat} className="req-category">
            <h3 className="req-category-title">{cat}</h3>
            <ul className="req-list">
              {rows.map(([skill, isMatched]) => (
                <SkillRow
                  key={skill}
                  skill={skill}
                  matched={isMatched}
                  importance={result.skill_importance?.[skill]}
                  evidence={result.skill_evidence?.[skill]}
                  selected={selectedSkill === skill}
                  onSelect={(s) => setSelectedSkill((cur) => (cur === s ? null : s))}
                />
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
