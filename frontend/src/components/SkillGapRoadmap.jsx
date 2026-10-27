import { skillLabel } from '../utils/skillLabel.js'

// Generated guidance, so it's visibly set apart from the evidence above it
// and says what it's based on.
export default function SkillGapRoadmap({ roadmap }) {
  if (!roadmap || roadmap.length === 0) return null

  const top = roadmap.slice(0, 6)

  return (
    <section className="match-section suggestion" aria-labelledby="roadmap-title">
      <div className="suggestion-head">
        <h4 id="roadmap-title" className="skill-column-title">Suggested order to close the gaps</h4>
        <span className="suggestion-tag">Rule-based suggestion</span>
      </div>
      <p className="suggestion-note">
        Ordered by how strongly the posting emphasizes each skill, with prerequisites first. It’s a simple rule,
        not personalized career advice.
      </p>
      <ol className="roadmap-list">
        {top.map((item) => (
          <li key={item.skill} className="roadmap-item">
            <span className="roadmap-skill">{skillLabel(item.skill)}</span>
            <span className={`importance-tag importance-${item.importance.toLowerCase()}`}>{item.importance}</span>
            {item.note && <span className="roadmap-note">{item.note}</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}
