import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { listMyJobs } from '../../utils/jobs.js'

export default function MatchingPage() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    listMyJobs().then(setJobs).catch((err) => setError(err.message))
  }, [])

  return (
    <>
      <PageHeader title="Matching" description="Choose a job to see each applicant’s score and skill breakdown." />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!jobs && !error && <LoadingBlock rows={3} label="Loading jobs" />}
      {jobs && jobs.length === 0 && <GlassEmptyState title="No jobs yet" subtitle="Matching works per job, so create one first." action={<GlassButton as={Link} variant="primary" to="/jobs">Create a job</GlassButton>} />}

      {jobs && jobs.length > 0 && (
        <ul className="link-list">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link to={`/jobs/${j.id}?tab=${encodeURIComponent('Match breakdown')}`} className="link-list-item">
                <span className="link-list-main">
                  <span className="link-list-title">{j.title}</span>
                  <span className="link-list-meta">{j.location || 'Location not set'}</span>
                </span>
                <span className="link-list-count num">{j.applicants_count} applicant{j.applicants_count === 1 ? '' : 's'}</span>
                <GlassBadge status={j.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
