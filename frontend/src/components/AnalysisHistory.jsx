import { useEffect, useState } from 'react'
import { clearHistory, loadHistory } from '../utils/history.js'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AnalysisHistory({ version, onSelect, onCleared }) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    let cancelled = false
    loadHistory().then((rows) => {
      if (!cancelled) setEntries(rows)
    })
    return () => {
      cancelled = true
    }
  }, [version])

  if (entries.length === 0) return null

  return (
    <div className="panel history-panel">
      <div className="skill-card-head">
        <div>
          <h2 className="panel-title">Analysis history</h2>
          <p className="panel-subtitle">
            Stored in the local database — scores and skill lists, not your resume or job description text.
          </p>
        </div>
        <button
          type="button"
          className="history-clear-btn"
          onClick={async () => {
            await clearHistory()
            setEntries([])
            onCleared?.()
          }}
        >
          Clear history
        </button>
      </div>

      <ul className="history-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button type="button" className="history-item" onClick={() => onSelect(entry)}>
              <span className="history-item-job">{entry.job_label}</span>
              <span className={`history-item-score ${SCORE_STATE_CLASS[interpretScore(entry.match_score)]}`}>
                {Math.round(entry.match_score)}%
              </span>
              <span className="history-item-date">{formatDate(entry.created_at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
