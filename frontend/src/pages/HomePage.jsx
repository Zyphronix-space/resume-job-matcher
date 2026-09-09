import { interpretScore, SCORE_STATE_CLASS } from '../utils/score.js'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function StatTile({ label, value }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value">{value}</span>
    </div>
  )
}

export default function HomePage({ jobs, matches, applications, savedCount, onOpenDetail, onGoTo }) {
  const bestMatches = jobs
    .filter((j) => matches[j.id])
    .sort((a, b) => matches[b.id].match_score - matches[a.id].match_score)
    .slice(0, 3)

  const activity = applications
    .flatMap((app) => app.timeline.map((t) => ({ ...t, company: app.company, title: app.title })))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)

  return (
    <section>
      <section className="hero">
        <h1 className="hero-title">Good luck with your next application.</h1>
        <p className="hero-subtitle">Find your fit. Close your gaps. Land your internship.</p>
      </section>

      <div className="stat-grid">
        <StatTile label="Applications" value={applications.length} />
        <StatTile label="Interviews" value={applications.filter((a) => a.status === 'Interview').length} />
        <StatTile label="Offers" value={applications.filter((a) => a.status === 'Offer').length} />
        <StatTile label="Saved" value={savedCount} />
      </div>

      <div className="panel">
        <div className="skill-card-head">
          <h2 className="panel-title">Best matches</h2>
          <button type="button" className="new-analysis-btn" onClick={() => onGoTo('find')}>Find more</button>
        </div>
        {bestMatches.length === 0 ? (
          <p className="skill-empty">Upload your CV and search internships to see your best matches here.</p>
        ) : (
          <ul className="history-list">
            {bestMatches.map((job) => (
              <li key={job.id}>
                <button type="button" className="history-item" onClick={() => onOpenDetail(job.id)}>
                  <span className="history-item-job">{job.title} · {job.company}</span>
                  <span className={`history-item-score ${SCORE_STATE_CLASS[interpretScore(matches[job.id].match_score)]}`}>
                    {Math.round(matches[job.id].match_score)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel">
        <h2 className="panel-title">Application activity</h2>
        {activity.length === 0 ? (
          <p className="skill-empty">Nothing yet. Save or prepare an internship to start your timeline.</p>
        ) : (
          <ol className="application-timeline home-activity-timeline">
            {activity.map((event, i) => (
              <li key={i}>
                <span className="application-timeline-date">{formatDate(event.date)}</span>
                <span>{event.label}: {event.title} at {event.company}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
