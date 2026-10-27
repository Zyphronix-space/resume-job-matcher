import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassCandidateCard from '../../components/glass/GlassCandidateCard.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { getShortlist } from '../../utils/applications.js'
import { downloadShortlistReport } from '../../utils/analytics.js'
import { downloadCandidatesPdf } from '../../utils/pdfReport.js'

export default function ShortlistsPage() {
  const [shortlist, setShortlist] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getShortlist().then(setShortlist).catch((err) => setError(err.message))
  }, [])

  const byJob = useMemo(() => {
    if (!shortlist) return []
    const groups = new Map()
    for (const app of shortlist) {
      if (!groups.has(app.job.id)) groups.set(app.job.id, { job: app.job, apps: [] })
      groups.get(app.job.id).apps.push(app)
    }
    return [...groups.values()]
  }, [shortlist])

  return (
    <>
      <PageHeader
        title="Shortlist"
        description="Shortlisted candidates across every job, grouped by role."
        actions={shortlist && shortlist.length > 0 && (
          <>
            <GlassButton variant="secondary" onClick={downloadShortlistReport}>Download CSV</GlassButton>
            <GlassButton variant="secondary" onClick={() => downloadCandidatesPdf('Shortlist Report', shortlist)}>Download PDF</GlassButton>
          </>
        )}
      />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!shortlist && !error && <LoadingBlock rows={3} label="Loading shortlist" />}

      {shortlist && shortlist.length === 0 && (
        <GlassEmptyState title="No one shortlisted yet" subtitle="Open a job’s Candidates tab and choose Shortlist for the people you want to move forward." />
      )}

      {byJob.map(({ job, apps }) => (
        <GlassCard key={job.id} title={<Link to={`/jobs/${job.id}`}>{job.title}</Link>} className="stack-item">
          <div className="candidate-stack">
            {apps.map((a) => (
              <GlassCandidateCard
                key={a.id}
                name={a.candidate.full_name}
                score={a.match_score}
                actions={<GlassButton as={Link} to={`/candidates/${a.candidate.id}`} variant="secondary" size="sm">View</GlassButton>}
              />
            ))}
          </div>
        </GlassCard>
      ))}
    </>
  )
}
