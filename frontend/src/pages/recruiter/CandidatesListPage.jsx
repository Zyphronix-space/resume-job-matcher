import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassTable from '../../components/glass/GlassTable.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import ScoreMeter from '../../components/ScoreMeter.jsx'
import { SearchIcon, WarningIcon } from '../../components/icons.jsx'
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
      <PageHeader title="Candidates" description="Everyone who has applied to one of your jobs." />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!candidates && !error && <LoadingBlock rows={4} label="Loading candidates" />}

      {candidates && candidates.length > 0 && (
        <div className="toolbar">
          <label className="search-field">
            <SearchIcon size={16} />
            <span className="visually-hidden">Search candidates</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" />
          </label>
          <span className="toolbar-count num">{filtered.length} of {candidates.length}</span>
        </div>
      )}

      {candidates && candidates.length === 0 && (
        <GlassEmptyState title="No candidates yet" subtitle="People appear here once they apply to one of your jobs." />
      )}

      {candidates && candidates.length > 0 && filtered.length === 0 && (
        <GlassEmptyState title={`No candidates match “${query}”`} subtitle="Check the spelling, or search by email instead." />
      )}

      {filtered.length > 0 && (
        <GlassTable>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Headline</th><th>Applications</th><th>Best match</th><th>Latest status</th><th><span className="visually-hidden">Actions</span></th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td data-label="Name"><Link to={`/candidates/${c.id}`}>{c.full_name}</Link></td>
                <td data-label="Email" className="cell-wrap">{c.email}</td>
                <td data-label="Headline" className="cell-muted">{c.headline || 'Not set'}</td>
                <td data-label="Applications" className="num">{c.applications_count}</td>
                <td data-label="Best match"><ScoreMeter score={c.best_match_score} /></td>
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
