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
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Jobs</h1>
        <p className="hero-subtitle">Create and manage your job postings.</p>
      </section>

      <div className="form-actions" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <GlassButton variant="primary" icon={<PlusIcon size={16} />} onClick={() => setShowForm(true)}>Create job</GlassButton>
      </div>

      {showForm && (
        <GlassModal title="New job" onClose={() => setShowForm(false)} width={720}>
          <JobForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="Create job" />
        </GlassModal>
      )}

      {error && <p className="field-error">{error}</p>}

      {jobs && jobs.length === 0 && (
        <GlassEmptyState title="No jobs yet" subtitle="Create your first job to start receiving matched candidates." />
      )}

      {jobs && jobs.length > 0 && (
        <GlassTable>
          <thead>
            <tr><th>Title</th><th>Location</th><th>Type</th><th>Status</th><th>Applicants</th><th>Shortlisted</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td data-label="Title"><Link to={`/jobs/${j.id}`}>{j.title}</Link></td>
                <td data-label="Location">{j.location || 'N/A'}</td>
                <td data-label="Type">{j.employment_type}</td>
                <td data-label="Status"><GlassBadge status={j.status} /></td>
                <td data-label="Applicants">{j.applicants_count}</td>
                <td data-label="Shortlisted">{j.shortlisted_count}</td>
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
