import { useEffect, useState } from 'react'
import ExplainScoreModal from './ExplainScoreModal.jsx'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

const SUMMARY_HEADLINE = {
  'Excellent match': 'Your resume is an excellent match for this role.',
  'Strong match': 'Your resume is a strong match for this role.',
  'Good potential': 'Your resume shows good potential for this role.',
  'Needs improvement': 'Your resume could be a stronger match for this role.',
  'Low match': "Your resume doesn't align closely with this role yet.",
}

const SUMMARY_BODY = {
  'Excellent match': 'Your resume closely aligns with the language and skills found in the job description.',
  'Strong match': 'Your resume aligns well with the language and skills found in the job description.',
  'Good potential': 'Your resume partially aligns with the language and skills found in the job description.',
  'Needs improvement': 'Your resume has limited overlap with the language and skills found in the job description.',
  'Low match': 'Your resume shows little overlap with the language and skills found in the job description.',
}

const RADIUS = 88
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function MatchScore({ score }) {
  const [animated, setAnimated] = useState(0)
  const [explainOpen, setExplainOpen] = useState(false)
  const label = interpretScore(score)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setAnimated(score)
      return
    }
    const id = requestAnimationFrame(() => setAnimated(score))
    return () => cancelAnimationFrame(id)
  }, [score])

  const offset = CIRCUMFERENCE - (Math.max(0, Math.min(100, animated)) / 100) * CIRCUMFERENCE

  return (
    <div className={`score-card ${SCORE_STATE_CLASS[label]}`}>
      <div className="score-ring-wrap">
        <svg viewBox="0 0 200 200" className="score-ring">
          <circle cx="100" cy="100" r={RADIUS} className="score-ring-track" />
          <circle
            cx="100" cy="100" r={RADIUS}
            className="score-ring-fill"
            style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: offset }}
          />
        </svg>
        <div className="score-ring-center">
          <span className="score-value">{Math.round(score)}%</span>
          <span className="score-label">{label}</span>
        </div>
      </div>

      <div className="score-summary">
        <h2 className="score-summary-headline">{SUMMARY_HEADLINE[label]}</h2>
        <p className="score-summary-body">{SUMMARY_BODY[label]}</p>
        <p className="score-summary-meta">
          <strong>Semantic match</strong>: based on semantic similarity between your resume and the job description.
        </p>
        <button type="button" className="explain-score-btn" onClick={() => setExplainOpen(true)}>
          Explain my score
        </button>
      </div>

      {explainOpen && <ExplainScoreModal onClose={() => setExplainOpen(false)} />}
    </div>
  )
}
