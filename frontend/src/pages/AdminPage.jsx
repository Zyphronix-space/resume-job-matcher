import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiJson } from '../utils/api.js'

export default function AdminPage() {
  const { user: currentUser } = useAuth()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        apiJson('/admin/stats', { fallback: 'Could not load admin stats' }),
        apiJson('/admin/users', { fallback: 'Could not load users' }),
      ])
      setStats(statsData)
      setUsers(usersData)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleRole = async (u) => {
    await apiJson(`/admin/users/${u.id}/role?is_admin=${!u.is_admin}`, { method: 'PATCH', fallback: 'Could not update role' })
    load()
  }

  const removeUser = async (u) => {
    await apiJson(`/admin/users/${u.id}`, { method: 'DELETE', fallback: 'Could not remove user' })
    load()
  }

  return (
    <>
      <section className="hero">
        <h1 className="hero-title">Admin panel</h1>
        <p className="hero-subtitle">System-wide oversight — visible only to admin accounts.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-tile"><span className="stat-tile-label">Users</span><span className="stat-tile-value">{stats.total_users}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Recruiters</span><span className="stat-tile-value">{stats.total_recruiters}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Candidates</span><span className="stat-tile-value">{stats.total_candidates}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Jobs</span><span className="stat-tile-value">{stats.total_jobs}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Resumes</span><span className="stat-tile-value">{stats.total_resumes}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Applications</span><span className="stat-tile-value">{stats.total_applications}</span></div>
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Users</h2>
        <p className="panel-subtitle">The first account to sign up becomes admin automatically; admins can promote or remove others below.</p>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Jobs</th><th>Applications</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td data-label="Name">{u.full_name || '—'}</td>
                  <td data-label="Email">{u.email}</td>
                  <td data-label="Role">{u.role}{u.is_admin ? ' · Admin' : ''}</td>
                  <td data-label="Jobs">{u.jobs_count}</td>
                  <td data-label="Applications">{u.applications_count}</td>
                  <td data-label="Joined">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td data-label="Actions">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="new-analysis-btn"
                        onClick={() => toggleRole(u)}
                        disabled={u.id === currentUser.id && u.is_admin}
                      >
                        {u.is_admin ? 'Revoke admin' : 'Make admin'}
                      </button>
                      <button
                        type="button"
                        className="file-card-remove"
                        onClick={() => removeUser(u)}
                        disabled={u.id === currentUser.id}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
