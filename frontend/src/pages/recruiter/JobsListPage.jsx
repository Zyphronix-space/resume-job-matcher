import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/EmptyState.jsx'
import JobForm from '../../components/JobForm.jsx'
import { PlusIcon } from '../../components/icons.jsx'
import { createJob, deleteJob, listMyJobs } from '../../utils/jobs.js'

export default function JobsListPage() {
  const [jobs, setJobs] = useState(null)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const load = () => listMyJobs().then(setJobs).catch((err) => setError(err.message))
  useEffect(() => { load() }, [])

  const handleCreate = async (job) => {
    await createJob(job)
    setShowForm(false)
    load()
  }

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This also removes its applications.`)) return
    await deleteJob(job.id)
    load()
  }

  return (
    <>
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Jobs</h1>
        <p className="hero-subtitle">Create and manage your job postings.</p>
      </section>

      <div className="form-actions" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button type="button" className="analyze-btn" onClick={() => setShowForm((s) => !s)}>
          <PlusIcon size={16} /> {showForm ? 'Close' : 'Create job'}
        </button>
      </div>

      {showForm && (
        <div className="panel" style={{ marginBottom: '1.2rem' }}>
          <h2 className="panel-title">New job</h2>
          <JobForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} submitLabel="Create job" />
        </div>
      )}

      {error && <p className="field-error">{error}</p>}

      {jobs && jobs.length === 0 && !showForm && (
        <EmptyState title="No jobs yet" subtitle="Create your first job to start receiving matched candidates." />
      )}

      {jobs && jobs.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Location</th><th>Type</th><th>Status</th><th>Applicants</th><th>Shortlisted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td data-label="Title"><Link to={`/jobs/${j.id}`}>{j.title}</Link></td>
                  <td data-label="Location">{j.location || '—'}</td>
                  <td data-label="Type">{j.employment_type}</td>
                  <td data-label="Status"><span className={`status-pill status-${j.status.toLowerCase()}`}>{j.status}</span></td>
                  <td data-label="Applicants">{j.applicants_count}</td>
                  <td data-label="Shortlisted">{j.shortlisted_count}</td>
                  <td data-label="Actions">
                    <div className="data-table-actions">
                      <Link className="new-analysis-btn" to={`/jobs/${j.id}`}>View</Link>
                      <button type="button" className="file-card-remove" onClick={() => handleDelete(j)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
