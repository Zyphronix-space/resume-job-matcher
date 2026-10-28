import GlassBadge from './glass/GlassBadge.jsx'
import MatchSummary from './MatchSummary.jsx'
import { skillLabel } from '../utils/skillLabel.js'

const REQUIREMENT_STATUS = {
  met: { label: 'Shown in resume', variant: 'success' },
  partial: { label: 'Partly shown', variant: 'warning' },
  not_found: { label: 'Not found', variant: 'danger' },
  check: { label: 'For you to check', variant: 'neutral' },
}

// The full fit assessment for one real vacancy (backend: assessment.py).
// The score/skill block is the shared MatchSummary; below it, each
// requirement line from the posting with what the resume shows for it, and
// rule-based suggestions that never ask the candidate to claim anything
// they haven't done.
export default function AssessmentView({ assessment }) {
  if (!assessment) return null
  const counts = assessment.requirement_counts || {}
  const requirements = assessment.requirements || []

  return (
    <div className="assessment">
      <p className="assessment-basis">
        Compared with <strong>{assessment.resume.filename}</strong> (version {assessment.resume.version}). {assessment.summary}
      </p>

      <MatchSummary result={assessment} showRoadmap />

      {requirements.length > 0 && (
        <section className="match-section" aria-labelledby="req-title">
          <h3 id="req-title" className="subheading">Requirement by requirement</h3>
          <p className="form-hint">
            {counts.met || 0} shown, {counts.partial || 0} partly shown, {counts.not_found || 0} not found,
            and {counts.check || 0} for you to check yourself.
          </p>
          <ul className="requirement-list">
            {requirements.map((r) => {
              const status = REQUIREMENT_STATUS[r.status] || REQUIREMENT_STATUS.check
              return (
                <li key={r.text} className={`requirement is-${r.status}`}>
                  <div className="requirement-head">
                    <p className="requirement-text">{r.text}</p>
                    <GlassBadge variant={status.variant}>{status.label}</GlassBadge>
                  </div>
                  {r.skills_found.length > 0 && (
                    <p className="requirement-detail">Found: {r.skills_found.map(skillLabel).join(', ')}</p>
                  )}
                  {r.skills_missing.length > 0 && (
                    <p className="requirement-detail">Not found: {r.skills_missing.map(skillLabel).join(', ')}</p>
                  )}
                  {r.evidence.slice(0, 1).map((e) => (
                    <p key={e.skill} className="evidence-quote">“{e.snippet}”</p>
                  ))}
                  {r.note && <p className="requirement-detail">{r.note}</p>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {assessment.suggestions?.length > 0 && (
        <section className="match-section" aria-labelledby="suggest-title">
          <h3 id="suggest-title" className="subheading">What you could improve</h3>
          <ul className="suggestion-list">
            {assessment.suggestions.map((s) => (
              <li key={s.text} className="suggestion">
                <div className="suggestion-head">
                  <span className="suggestion-tag">{s.section}</span>
                  {s.priority !== 'Medium' && <span className="importance-tag">{s.priority} in this posting</span>}
                </div>
                <p>{s.text}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="score-explainer">
        <summary>How this assessment is produced</summary>
        <ul className="plain-list">
          {(assessment.method || []).map((m) => <li key={m}>{m}</li>)}
        </ul>
      </details>
    </div>
  )
}
