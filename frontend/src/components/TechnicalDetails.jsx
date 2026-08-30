import { useState } from 'react'
import { ChevronDownIcon } from './icons.jsx'

const ROWS = [
  ['Model', 'all-MiniLM-L6-v2'],
  ['Similarity', 'Cosine similarity'],
  ['Document extraction', 'pdfplumber'],
  ['Skill detection', 'Curated taxonomy + regex word boundaries'],
]

export default function TechnicalDetails() {
  const [open, setOpen] = useState(false)

  return (
    <div className="tech-details">
      <button
        type="button"
        className="tech-details-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        About this analysis
        <ChevronDownIcon size={16} className={`tech-details-chevron ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <dl className="tech-details-list">
          {ROWS.map(([label, value]) => (
            <div className="tech-details-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
