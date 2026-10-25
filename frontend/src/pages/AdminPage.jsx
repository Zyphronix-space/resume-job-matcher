import { useEffect, useState } from 'react'
import GlassCard from '../components/glass/GlassCard.jsx'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassTable from '../components/glass/GlassTable.jsx'
import GlassBadge from '../components/glass/GlassBadge.jsx'
import GlassMetric, { GlassMetricGrid } from '../components/glass/GlassMetric.jsx'
import { useToast } from '../components/glass/GlassToast.jsx'
import PageHeader from '../components/PageHeader.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import { WarningIcon } from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { apiJson } from '../utils/api.js'

export default function AdminPage() {
  const { user: currentUser } = useAuth()
  const showToast = useToast()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

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

  const runAction = async (u, action, successMessage) => {
    setBusyId(u.id)
    try {
      await action()
      showToast(successMessage, 'success')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const toggleRole = (u) => runAction(
    u,
    () => apiJson(`/admin/users/${u.id}/role?is_admin=${!u.is_admin}`, { method: 'PATCH', fallback: 'Could not update role' }),
    u.is_admin ? `${u.email} is no longer an admin` : `${u.email} is now an admin`,
  )

  const removeUser = (u) => {
    if (!window.confirm(`Remove ${u.email}? Their jobs, resumes, and applications are deleted too. This can’t be undone.`)) return
    runAction(u, () => apiJson(`/admin/users/${u.id}`, { method: 'DELETE', fallback: 'Could not remove user' }), `${u.email} removed`)
  }

  return (
    <>
      <PageHeader title="Admin" description="System-wide totals and user management. Only admin accounts can see this page." />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!stats && !error && <LoadingBlock rows={3} label="Loading admin data" />}

      <div className="stack">
        {stats && (
          <GlassMetricGrid>
            <GlassMetric label="Users" value={stats.total_users} />
            <GlassMetric label="Recruiters" value={stats.total_recruiters} />
            <GlassMetric label="Candidates" value={stats.total_candidates} />
            <GlassMetric label="Jobs" value={stats.total_jobs} />
            <GlassMetric label="Resumes" value={stats.total_resumes} />
            <GlassMetric label="Applications" value={stats.total_applications} />
          </GlassMetricGrid>
        )}

        {users && (
          <GlassCard title="Users" subtitle="The first account to sign up becomes an admin automatically. Admins can promote or remove other accounts.">
            <GlassTable>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Jobs</th><th>Applications</th><th>Joined</th><th><span className="visually-hidden">Actions</span></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Name" className="cell-strong">{u.full_name || 'Not set'}</td>
                    <td data-label="Email" className="cell-wrap">{u.email}</td>
                    <td data-label="Role">
                      <span className="cell-inline">
                        <span className="cap">{u.role}</span>
                        {u.is_admin && <GlassBadge variant="neutral">Admin</GlassBadge>}
                      </span>
                    </td>
                    <td data-label="Jobs" className="num">{u.jobs_count}</td>
                    <td data-label="Applications" className="num">{u.applications_count}</td>
                    <td data-label="Joined" className="cell-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td data-label="Actions">
                      <div className="data-table-actions">
                        <GlassButton
                          variant="secondary" size="sm" onClick={() => toggleRole(u)}
                          disabled={(u.id === currentUser.id && u.is_admin) || busyId === u.id}
                        >
                          {u.is_admin ? 'Revoke admin' : 'Make admin'}
                        </GlassButton>
                        <GlassButton variant="danger" size="sm" onClick={() => removeUser(u)} disabled={u.id === currentUser.id || busyId === u.id}>
                          Remove
                        </GlassButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </GlassTable>
          </GlassCard>
        )}
      </div>
    </>
  )
}
