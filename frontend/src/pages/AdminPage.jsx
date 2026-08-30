import { useEffect, useState } from 'react'
import { API_URL } from '../utils/apiUrl.js'
import { authHeaders } from '../utils/auth.js'

export default function AdminPage({ currentUserId }) {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: authHeaders() }),
        fetch(`${API_URL}/admin/users`, { headers: authHeaders() }),
      ])
      if (!statsRes.ok || !usersRes.ok) throw new Error('Could not load admin data')
      setStats(await statsRes.json())
      setUsers(await usersRes.json())
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleRole = async (user) => {
    await fetch(`${API_URL}/admin/users/${user.id}/role?is_admin=${!user.is_admin}`, {
      method: 'PATCH',
      headers: authHeaders(),
    })
    load()
  }

  const removeUser = async (user) => {
    await fetch(`${API_URL}/admin/users/${user.id}`, { method: 'DELETE', headers: authHeaders() })
    load()
  }

  return (
    <section>
      <section className="hero">
        <h1 className="hero-title">Admin panel</h1>
        <p className="hero-subtitle">System-wide oversight — visible only to admin accounts.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-tile"><span className="stat-tile-label">Users</span><span className="stat-tile-value">{stats.total_users}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Saved jobs</span><span className="stat-tile-value">{stats.total_saved_jobs}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">Applications</span><span className="stat-tile-value">{stats.total_applications}</span></div>
          <div className="stat-tile"><span className="stat-tile-label">History entries</span><span className="stat-tile-value">{stats.total_history_entries}</span></div>
        </div>
      )}

      <div className="panel">
        <h2 className="panel-title">Users</h2>
        <p className="panel-subtitle">The first account to sign up becomes admin automatically; admins can promote or remove others below.</p>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Saved</th><th>Applications</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.is_admin ? 'Admin' : 'User'}</td>
                  <td>{u.saved_jobs_count}</td>
                  <td>{u.applications_count}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="new-analysis-btn"
                        onClick={() => toggleRole(u)}
                        disabled={u.id === currentUserId && u.is_admin}
                      >
                        {u.is_admin ? 'Revoke admin' : 'Make admin'}
                      </button>
                      <button
                        type="button"
                        className="file-card-remove"
                        onClick={() => removeUser(u)}
                        disabled={u.id === currentUserId}
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
    </section>
  )
}
