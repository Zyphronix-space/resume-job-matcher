import { useEffect, useState } from 'react'
import { CheckIcon } from './icons.jsx'

// Purely visual pacing — the backend performs one single /analyze request.
// These stages do not correspond to separate API calls.
const STAGES = [
  'Reading resume',
  'Understanding job requirements',
  'Comparing skills',
  'Preparing your results',
]

export default function LoadingState() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setActiveIndex(STAGES.length - 1)
      return
    }
    const interval = setInterval(() => {
      setActiveIndex((i) => (i < STAGES.length - 1 ? i + 1 : i))
    }, 1100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="loading-state">
      <div className="loading-ring" aria-hidden="true" />
      <h2 className="loading-title">Analyzing your resume</h2>

      <ul className="loading-stages">
        {STAGES.map((label, i) => {
          const status = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
          return (
            <li key={label} className={`loading-stage loading-stage-${status}`}>
              <span className="loading-stage-marker">
                {status === 'done' ? <CheckIcon size={13} /> : <span className="loading-stage-dot" />}
              </span>
              {label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
