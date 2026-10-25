import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

// Compact score for lists and rows: the number, plus a short bar so a column
// of scores can be scanned at a glance. The band label stays available to
// assistive tech and on hover; the color comes from the shared score bands.
export default function ScoreMeter({ score, label = 'match' }) {
  const value = Math.round(score)
  const band = interpretScore(score)
  return (
    <span className={`score-meter ${SCORE_STATE_CLASS[band]}`} title={`${band}: ${value}/100`}>
      <span className="score-meter-value num">{value}</span>
      <span className="score-meter-track" aria-hidden="true">
        <span className="score-meter-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </span>
      <span className="visually-hidden"> out of 100 {label}, {band}</span>
    </span>
  )
}
