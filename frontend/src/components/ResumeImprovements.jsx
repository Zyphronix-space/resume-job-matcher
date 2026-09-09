import { buildSuggestions } from '../utils/suggestions.js'

export default function ResumeImprovements({ result }) {
  const suggestions = buildSuggestions(result)

  return (
    <div className="panel">
      <h2 className="panel-title">Resume improvements</h2>
      <p className="panel-subtitle">
        Suggestions based only on what was actually detected, never a claim about skills you don't have.
      </p>

      {suggestions.length === 0 ? (
        <p className="skill-empty">
          No specific suggestions. Your resume's structure and detected skills line up well with this job
          description.
        </p>
      ) : (
        <ul className="suggestion-list">
          {suggestions.map((s) => (
            <li key={s.id} className="suggestion-item">
              <p className="suggestion-text">{s.text}</p>
              <p className="suggestion-detail">{s.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
