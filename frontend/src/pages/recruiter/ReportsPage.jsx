import { useEffect, useState } from 'react'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { listMyJobs } from '../../utils/jobs.js'
import { downloadJobReport, downloadShortlistReport } from '../../utils/analytics.js'
import { rankCandidatesForJob, getShortlist } from '../../utils/applications.js'
import { downloadCandidatesPdf } from '../../utils/pdfReport.js'

export default function ReportsPage() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    listMyJobs().then(setJobs).catch((err) => setError(err.message))
  }, [])

  const handleJobPdf = async (job) => {
    setBusyId(job.id)
    try {
      const candidates = await rankCandidatesForJob(job.id, {})
      downloadCandidatesPdf(`Job Matching Report - ${job.title}`, candidates)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleShortlistPdf = async () => {
    setBusyId('shortlist')
    try {
      const shortlist = await getShortlist()
      downloadCandidatesPdf('Shortlist Report', shortlist)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader title="Reports" description="Download CSV or PDF reports of your applicants and their match results." />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}

      <div className="stack">
        <GlassCard title="Shortlist" subtitle="Every shortlisted candidate across all your jobs.">
          <div className="button-row">
            <GlassButton variant="secondary" onClick={downloadShortlistReport}>Download CSV</GlassButton>
            <GlassButton variant="secondary" loading={busyId === 'shortlist'} loadingText="Preparing PDF…" onClick={handleShortlistPdf}>
              Download PDF
            </GlassButton>
          </div>
        </GlassCard>

        <GlassCard
          title="By job"
          subtitle="Every applicant to a job with their score and skills. To compare a few candidates side by side, select them on the job’s Candidates tab."
        >
          {!jobs && !error && <LoadingBlock rows={2} label="Loading jobs" />}
          {jobs && jobs.length === 0 && <GlassEmptyState title="No jobs yet" subtitle="Reports become available once you’ve posted a job." />}
          {jobs && jobs.length > 0 && (
            <ul className="row-list">
              {jobs.map((j) => (
                <li className="row-list-item" key={j.id}>
                  <div className="row-list-main">
                    <span className="row-list-title">{j.title}</span>
                    <span className="row-list-meta">{j.applicants_count} applicant{j.applicants_count === 1 ? '' : 's'}</span>
                  </div>
                  <div className="data-table-actions">
                    <GlassButton variant="secondary" size="sm" onClick={() => downloadJobReport(j.id, j.title)} aria-label={`Download CSV for ${j.title}`}>CSV</GlassButton>
                    <GlassButton variant="secondary" size="sm" loading={busyId === j.id} onClick={() => handleJobPdf(j)} aria-label={`Download PDF for ${j.title}`}>
                      PDF
                    </GlassButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </>
  )
}
