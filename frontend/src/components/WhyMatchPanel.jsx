import { CheckIcon, CloseIcon } from './icons.jsx'
import { skillLabel } from '../utils/skillLabel.js'
import { getMatchReasons } from '../utils/recommendations.js'

// Shared by the internship detail view ("Why this internship matches you")
// and the "Recommended for you" list ("Why am I seeing this?") — same
// underlying explainable checklist in both places, just a different title.
export default function WhyMatchPanel({ job, matchResult, preferences, title = 'Why this internship matches you' }) {
  if (!matchResult) return null
  const { checks, missingSkills } = getMatchReasons(job, matchResult, preferences)

  return (
    <div className="why-match">
      <h3 className="why-match-title">{title}</h3>
      <ul className="why-match-checks">
        {checks.map((c) => (
          <li key={c.key} className={`why-match-check ${c.ok ? 'is-ok' : 'is-warning'}`}>
            {c.ok ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
            {c.label}
          </li>
        ))}
      </ul>
      {missingSkills.length > 0 && (
        <p className="why-match-missing">
          Missing: {missingSkills.map(skillLabel).join(', ')}
        </p>
      )}
      <p className="why-match-disclaimer">
        The semantic match measures similarity between your resume and this job description using
        sentence embeddings — it doesn't measure your actual ability, and it isn't a prediction of
        getting hired.
      </p>
    </div>
  )
}
