import { useState } from 'react'
import EmptyState from '../components/EmptyState.jsx'
import { TrackIcon } from '../components/icons.jsx'
import { STATUSES } from '../utils/applications.js'
import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ApplicationRow({ app, onStatusChange, onRemove }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="application-row">
      <div className="application-row-main">
        <div className="application-row-info">
          <strong>{app.company}</strong>
          <span className="job-card-company">{app.title}</span>
        </div>
        {app.matchScore != null && (
          <span className={`history-item-score ${SCORE_STATE_CLASS[interpretScore(app.matchScore)]}`}>
            {Math.round(app.matchScore)}%
          </span>
        )}
        <select
          className="application-status-select"
          value={app.status}
          onChange={(e) => onStatusChange(app.id, e.target.value)}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="button" className="tech-details-toggle application-timeline-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Timeline
        </button>
      </div>

      {open && (
        <ol className="application-timeline">
          {app.timeline.map((t, i) => (
            <li key={i}>
              <span className="application-timeline-date">{formatDate(t.date)}</span>
              <span>{t.label}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="application-row-actions">
        {app.applicationUrl && (
          <a className="job-card-btn job-card-btn-secondary" href={app.applicationUrl} target="_blank" rel="noopener noreferrer">
            Official posting
          </a>
        )}
        <button type="button" className="file-card-remove" onClick={() => onRemove(app.id)}>Remove</button>
      </div>
    </li>
  )
}

export default function ApplicationsPage({ applications, onStatusChange, onRemove }) {
  return (
    <section>
      <section className="hero">
        <h1 className="hero-title">My applications</h1>
        <p className="hero-subtitle">Track every internship you're preparing, applying to, or hearing back from.</p>
      </section>

      {applications.length === 0 ? (
        <EmptyState
          icon={<TrackIcon size={28} />}
          title="Your application tracker is empty"
          subtitle="Start by finding an internship."
        />
      ) : (
        <ul className="application-list">
          {applications.map((app) => (
            <ApplicationRow key={app.id} app={app} onStatusChange={onStatusChange} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </section>
  )
}
