import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassTable from '../../components/glass/GlassTable.jsx'
import GlassInput from '../../components/glass/GlassInput.jsx'
import { listCandidates } from '../../utils/candidates.js'

export default function CandidatesListPage() {
  const [candidates, setCandidates] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listCandidates().then(setCandidates).catch((err) => setError(err.message))
  }, [])

  const filtered = useMemo(() => {
    if (!candidates) return []
    const q = query.trim().toLowerCase()
    if (!q) return candidates
    return candidates.filter((c) => c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
  }, [candidates, query])

  return (
    <>
      <section className="hero" style={{ padding: '1.5rem 0' }}>
        <h1 className="hero-title" style={{ fontSize: '2rem' }}>Candidates</h1>
        <p className="hero-subtitle">Everyone who has applied to one of your jobs.</p>
      </section>

      {error && <p className="field-error">{error}</p>}

      <GlassInput label="Search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" style={{ maxWidth: 320, marginBottom: '1rem' }} />

      {candidates && candidates.length === 0 && (
        <GlassEmptyState title="No candidates yet" subtitle="They'll appear here once someone applies to one of your jobs." />
      )}

      {filtered.length > 0 && (
        <GlassTable>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Headline</th><th>Applications</th><th>Best match</th><th>Latest status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td data-label="Name">{c.full_name}</td>
                <td data-label="Email">{c.email}</td>
                <td data-label="Headline">{c.headline || 'N/A'}</td>
                <td data-label="Applications">{c.applications_count}</td>
                <td data-label="Best match">{Math.round(c.best_match_score)}%</td>
                <td data-label="Latest status"><GlassBadge status={c.latest_status} /></td>
                <td data-label="Actions"><GlassButton as={Link} to={`/candidates/${c.id}`} variant="secondary" size="sm">View</GlassButton></td>
              </tr>
            ))}
          </tbody>
        </GlassTable>
      )}
    </>
  )
}
