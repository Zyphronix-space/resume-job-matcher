import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassCandidateCard from '../../components/glass/GlassCandidateCard.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
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
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Shortlists</h1>
        <p className="hero-subtitle">Shortlisted candidates across every job, grouped by role.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      {shortlist && shortlist.length > 0 && (
        <div className="form-actions" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <GlassButton variant="secondary" onClick={downloadShortlistReport}>Download CSV</GlassButton>
          <GlassButton variant="secondary" onClick={() => downloadCandidatesPdf('Shortlist Report', shortlist)}>Download PDF</GlassButton>
        </div>
      )}

      {shortlist && shortlist.length === 0 && (
        <GlassEmptyState title="No shortlisted candidates yet" subtitle="Shortlist candidates from a job's Candidates tab." />
      )}

      {byJob.map(({ job, apps }) => (
        <GlassCard key={job.id} title={<Link to={`/jobs/${job.id}`}>{job.title}</Link>} style={{ marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
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
