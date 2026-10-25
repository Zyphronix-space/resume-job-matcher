import { useId, useMemo, useState } from 'react'
import { CheckIcon, ChevronDownIcon, CloseIcon } from './icons.jsx'
import { skillLabel } from '../utils/skillLabel.js'

const IMPORTANCE_ORDER = { Critical: 0, High: 1, Medium: 2 }

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Marks the skill inside the quoted resume sentence, the way someone would
// run a highlighter over a printed resume. Plain string split, no HTML
// injection.
function HighlightedSnippet({ text, term }) {
  if (!term) return text
  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, 'ig'))
  return parts.map((part, i) => (
    part.toLowerCase() === term.toLowerCase() ? <mark key={i}>{part}</mark> : part
  ))
}

function SkillItem({ idPrefix, skill, matched, category, importance, evidence, expanded, onToggle }) {
  const hasEvidence = matched && Boolean(evidence)
  const evidenceId = `${idPrefix}-${skill.replace(/[^a-z0-9]/gi, '-')}`

  const content = (
    <>
      <span className={`skill-mark ${matched ? 'is-matched' : 'is-missing'}`} aria-hidden="true">
        {matched ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
      </span>
      <span className="skill-name">{skillLabel(skill)}</span>
      {category && <span className="skill-category">{category}</span>}
      {importance && <span className={`importance-tag importance-${importance.level.toLowerCase()}`}>{importance.level}</span>}
      {hasEvidence && <ChevronDownIcon size={14} className={`skill-chevron ${expanded ? 'is-open' : ''}`} />}
    </>
  )

  return (
    <li className="skill-item">
      {hasEvidence ? (
        <button type="button" className="skill-row is-expandable" aria-expanded={expanded} aria-controls={evidenceId} onClick={onToggle}>
          {content}
        </button>
      ) : (
        <div className="skill-row">{content}</div>
      )}

      {hasEvidence && expanded && (
        <div className="skill-evidence" id={evidenceId}>
          <p className="skill-evidence-source">
            Found in {evidence.sections.length ? evidence.sections.join(', ') : 'the resume, outside a named section'}
          </p>
          {evidence.snippet && (
            <blockquote className="evidence-quote">“<HighlightedSnippet text={evidence.snippet} term={skill} />”</blockquote>
          )}
        </div>
      )}
    </li>
  )
}

// Side-by-side comparison of the job's skills: what the resume has (with
// evidence where the API returned it) and what it doesn't, each sorted by
// how much the posting emphasizes it.
export default function JobRequirements({ result }) {
  const [expanded, setExpanded] = useState(null)
  const idPrefix = useId()

  const categoryOf = useMemo(() => {
    const map = {}
    for (const [cat, { matched = [], missing = [] }] of Object.entries(result.skill_categories || {})) {
      for (const s of [...matched, ...missing]) map[s] = cat
    }
    return map
  }, [result.skill_categories])

  const byImportance = (list) => [...list].sort((a, b) => (
    (IMPORTANCE_ORDER[result.skill_importance?.[a]?.level] ?? 3) - (IMPORTANCE_ORDER[result.skill_importance?.[b]?.level] ?? 3)
  ))

  const hasEvidence = result.skill_evidence && Object.keys(result.skill_evidence).length > 0
  const columns = [
    { key: 'matched', title: 'Found in resume', skills: byImportance(result.matched_skills), matched: true, empty: 'None of the job’s skills were found.' },
    { key: 'missing', title: 'Not found in resume', skills: byImportance(result.missing_skills), matched: false, empty: 'Nothing missing.' },
  ]

  return (
    <section className="match-section" aria-label="Skills compared with the job">
      <div className="skill-columns">
        {columns.map((col) => (
          <div key={col.key} className="skill-column">
            <h4 className="skill-column-title">
              {col.title} <span className="num">{col.skills.length}</span>
            </h4>
            {col.skills.length === 0 ? (
              <p className="skill-empty">{col.empty}</p>
            ) : (
              <ul className="skill-list">
                {col.skills.map((s) => (
                  <SkillItem
                    key={s}
                    idPrefix={idPrefix}
                    skill={s}
                    matched={col.matched}
                    category={categoryOf[s]}
                    importance={result.skill_importance?.[s]}
                    evidence={result.skill_evidence?.[s]}
                    expanded={expanded === s}
                    onToggle={() => setExpanded((cur) => (cur === s ? null : s))}
                  />
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {hasEvidence && <p className="match-footnote">Select a found skill to see the resume line it came from.</p>}
    </section>
  )
}
