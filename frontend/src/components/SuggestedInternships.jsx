import JobCard from './JobCard.jsx'

// Surfaced right on the CV-analysis results page: the same jobs/matches
// state Find Internships uses, just narrowed to the top few — so
// analyzing a resume immediately turns into "here's what to apply to"
// rather than requiring a separate trip to Find Internships.
export default function SuggestedInternships({ jobs, matches, savedJobIds, onToggleSave, onOpenDetail, onGoToFind, limit = 3 }) {
  const top = jobs
    .filter((j) => matches[j.id])
    .sort((a, b) => matches[b.id].match_score - matches[a.id].match_score)
    .slice(0, limit)

  if (top.length === 0) return null

  return (
    <div className="panel">
      <div className="skill-card-head">
        <div>
          <h2 className="panel-title">Internships that match your resume</h2>
          <p className="panel-subtitle">Real postings, matched against the CV you just analyzed.</p>
        </div>
        <button type="button" className="new-analysis-btn" onClick={onGoToFind}>See all internships</button>
      </div>
      <div className="job-grid">
        {top.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            matchResult={matches[job.id]}
            isSaved={savedJobIds.has(job.id)}
            onOpenDetail={onOpenDetail}
            onToggleSave={() => onToggleSave(job, matches[job.id])}
          />
        ))}
      </div>
    </div>
  )
}
