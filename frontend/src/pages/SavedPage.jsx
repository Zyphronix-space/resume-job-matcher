import JobCard from '../components/JobCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { BookmarkIcon } from '../components/icons.jsx'

export default function SavedPage({ savedJobs, onOpenDetail, onRemove }) {
  return (
    <section>
      <section className="hero">
        <h1 className="hero-title">Saved</h1>
        <p className="hero-subtitle">Internships you've bookmarked to revisit.</p>
      </section>

      {savedJobs.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon size={28} />}
          title="Nothing saved yet"
          subtitle="Save internships you want to revisit."
        />
      ) : (
        <div className="job-grid">
          {savedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              matchResult={job.matchResult}
              isSaved
              onOpenDetail={onOpenDetail}
              onToggleSave={() => onRemove(job.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
