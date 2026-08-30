import { useEffect } from 'react'
import { ArrowDownIcon, CloseIcon } from './icons.jsx'

const SCORE_FLOW = ['Resume PDF', 'Text extraction', 'Sentence embedding', 'Cosine similarity', 'Semantic match']
const SKILL_FLOW = ['Skill taxonomy', 'Word-boundary matching', 'Matched / missing skills']

function FlowColumn({ title, steps }) {
  return (
    <div className="flow-column">
      <span className="flow-column-title">{title}</span>
      {steps.map((step, i) => (
        <div key={step} className="flow-step-wrap">
          <div className="flow-step">{step}</div>
          {i < steps.length - 1 && <ArrowDownIcon size={14} className="flow-arrow" />}
        </div>
      ))}
    </div>
  )
}

export default function ExplainScoreModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="How your score works"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <CloseIcon size={18} />
        </button>

        <h2 className="panel-title">How your score works</h2>
        <p className="panel-subtitle">
          This isn't a black box — here's exactly what happens to your resume and the job description.
        </p>

        <div className="flow-columns">
          <FlowColumn title="Semantic match" steps={SCORE_FLOW} />
          <FlowColumn title="Skill detection" steps={SKILL_FLOW} />
        </div>

        <div className="modal-explain-text">
          <p>
            The semantic score measures how similar the meaning of your resume and the job description is,
            using sentence embeddings — it doesn't check for specific skills.
          </p>
          <p>
            Skill matching checks whether skills from the curated taxonomy appear in the extracted text of
            both documents, using word-boundary matching — not a machine-learning classifier.
          </p>
          <p className="modal-disclaimer">
            The score is not a probability of getting hired. It's a measure of textual and skill overlap to
            help you understand where your resume aligns with a role.
          </p>
        </div>
      </div>
    </div>
  )
}
