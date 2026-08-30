import { ArrowDownIcon } from './icons.jsx'
import { skillLabel } from '../utils/skillLabel.js'

export default function SkillGapRoadmap({ roadmap }) {
  if (!roadmap || roadmap.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">Skill gap roadmap</h2>
        <p className="skill-empty">
          No skill gaps detected — every taxonomy skill found in the job description was also found in your
          resume.
        </p>
      </div>
    )
  }

  const top = roadmap.slice(0, 6)

  return (
    <div className="panel">
      <h2 className="panel-title">Skill gap roadmap</h2>
      <p className="panel-subtitle">
        Ranked by importance in the job description; skills with a known prerequisite relationship are ordered
        accordingly. This is a simple rule-based ordering, not personalized career advice.
      </p>

      <h3 className="roadmap-subheading">Your priority gaps</h3>
      <ol className="roadmap-list">
        {top.map((item, i) => (
          <li key={item.skill} className="roadmap-item">
            <span className="roadmap-rank">{i + 1}</span>
            <span className="roadmap-skill">{skillLabel(item.skill)}</span>
            <span className={`importance-badge importance-${item.importance.toLowerCase()}`}>{item.importance}</span>
            {item.note && <span className="roadmap-note">{item.note}</span>}
          </li>
        ))}
      </ol>

      {top.length > 1 && (
        <div className="roadmap-order">
          <h3 className="roadmap-subheading">Suggested order</h3>
          <div className="roadmap-chain">
            {top.map((item, i) => (
              <span key={item.skill} className="roadmap-chain-item">
                {skillLabel(item.skill)}
                {i < top.length - 1 && <ArrowDownIcon size={13} className="roadmap-chain-arrow" />}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
