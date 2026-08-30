import { CheckIcon, WarningIcon } from './icons.jsx'

const SECTION_ORDER = [
  'Contact Information', 'Professional Summary', 'Education', 'Work Experience',
  'Projects', 'Skills', 'Certifications', 'Languages', 'Achievements',
]

export default function AtsAnalysis({ sections, score }) {
  const known = SECTION_ORDER.filter((name) => name in (sections || {}))

  return (
    <div className="panel">
      <h2 className="panel-title">Resume structure analysis</h2>
      <p className="panel-subtitle">
        Checks for resume sections that help both applicant-tracking systems and human reviewers parse your
        resume. This is a structural check, not a simulation of any specific company's ATS software.
      </p>

      <div className="ats-score-row">
        <span className="ats-score-label">ATS readiness</span>
        <span className="ats-score-value">{score} / 100</span>
      </div>

      <ul className="ats-checklist">
        {known.map((name) => {
          const ok = sections[name]
          return (
            <li key={name} className={`ats-check-row ${ok ? 'is-ok' : 'is-warning'}`}>
              {ok ? <CheckIcon size={15} /> : <WarningIcon size={15} />}
              <span>{name} {ok ? 'section detected' : 'section missing'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
