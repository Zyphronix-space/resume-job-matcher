import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassTable from '../../components/glass/GlassTable.jsx'
import GlassModal from '../../components/glass/GlassModal.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import JobForm from '../../components/JobForm.jsx'
import { PlusIcon } from '../../components/icons.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { createJob, deleteJob, listMyJobs } from '../../utils/jobs.js'

export default function JobsListPage() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const showToast = useToast()

  const load = () => listMyJobs().then(setJobs).catch((err) => setError(err.message))
  useEffect(() => { load() }, [])

  const handleCreate = async (job) => {
    await createJob(job)
    setShowForm(false)
    showToast(`"${job.title}" created`, 'success')
    load()
  }

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This also removes its applications.`)) return
    await deleteJob(job.id)
    showToast(`"${job.title}" deleted`, 'info')
    load()
  }

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Your job postings. Applicants to open jobs are scored against them automatically."
        actions={<GlassButton variant="primary" icon={<PlusIcon size={15} />} onClick={() => setShowForm(true)}>New job</GlassButton>}
      />

      {showForm && (
        <GlassModal title="New job" onClose={() => setShowForm(false)} width={720}>
          <JobForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="Create job" />
        </GlassModal>
      )}

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!jobs && !error && <LoadingBlock rows={4} label="Loading jobs" />}

      {jobs && jobs.length === 0 && (
        <GlassEmptyState
          title="No jobs yet"
          subtitle="Create a job with a description and the skills you need. Applicants are ranked against it."
          action={<GlassButton variant="primary" icon={<PlusIcon size={15} />} onClick={() => setShowForm(true)}>New job</GlassButton>}
        />
      )}

      {jobs && jobs.length > 0 && (
        <GlassTable>
          <thead>
            <tr><th>Title</th><th>Location</th><th>Type</th><th>Status</th><th>Applicants</th><th>Shortlisted</th><th><span className="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td data-label="Title"><Link to={`/jobs/${j.id}`}>{j.title}</Link></td>
                <td data-label="Location" className="cell-muted">{j.location || 'Not set'}</td>
                <td data-label="Type">{j.employment_type}</td>
                <td data-label="Status"><GlassBadge status={j.status} /></td>
                <td data-label="Applicants" className="num">{j.applicants_count}</td>
                <td data-label="Shortlisted" className="num">{j.shortlisted_count}</td>
                <td data-label="Actions">
                  <div className="data-table-actions">
                    <GlassButton as={Link} to={`/jobs/${j.id}`} variant="secondary" size="sm">View</GlassButton>
                    <GlassButton variant="danger" size="sm" onClick={() => handleDelete(j)}>Delete</GlassButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
      )}
    </>
  )
}
