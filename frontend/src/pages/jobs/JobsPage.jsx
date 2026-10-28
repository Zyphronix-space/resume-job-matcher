import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassCheckbox from '../../components/glass/GlassCheckbox.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassInput from '../../components/glass/GlassInput.jsx'
import GlassSelect from '../../components/glass/GlassSelect.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { PostedLine, PostingBadges } from '../../components/PostingFacts.jsx'
import { SearchIcon, WarningIcon } from '../../components/icons.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getPostingFacets, postingFacts, relativeDays, searchPostings, trackPosting } from '../../utils/workspace.js'

const PAGE_SIZE = 20
const EARLY_CAREER = 'Internship,Graduate,Junior'
// The product's starting focus. Applied only when someone arrives with no
// filters at all; every filter stays visible and clearable.
const DEFAULT_FILTERS = { open_to_sri_lanka: 'true', level: EARLY_CAREER }
const FILTER_KEYS = ['q', 'company', 'country', 'location', 'work_mode', 'employment_type', 'level', 'posted_within', 'open_to_sri_lanka', 'sort']

const LEVEL_OPTIONS = [
  { value: '', label: 'Any level' },
  { value: EARLY_CAREER, label: 'Early career (intern, graduate, junior)' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Graduate', label: 'Graduate' },
  { value: 'Junior', label: 'Junior' },
  { value: 'Mid', label: 'Mid' },
  { value: 'Senior', label: 'Senior' },
]
const POSTED_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Past week' },
  { value: '30', label: 'Past 30 days' },
  { value: '90', label: 'Past 90 days' },
]

function facetOptions(rows, anyLabel) {
  return [{ value: '', label: anyLabel }, ...(rows || []).map((r) => ({ value: r.value, label: `${r.value} (${r.count})` }))]
}

function SkillOverlap({ overlap }) {
  if (!overlap) return null
  return (
    <span className="posting-overlap">
      <span className="num">{overlap.found}</span> of <span className="num">{overlap.total}</span> listed skills on your resume
    </span>
  )
}

export default function JobsPage() {
  const { user } = useAuth()
  const showToast = useToast()
  const [params, setParams] = useSearchParams()
  const [facets, setFacets] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [savingId, setSavingId] = useState(null)
  const [query, setQuery] = useState(params.get('q') || '')
  const isCandidate = user?.role === 'candidate'

  useEffect(() => {
    if (!FILTER_KEYS.some((k) => params.has(k)) && !params.has('all')) setParams(DEFAULT_FILTERS, { replace: true })
  }, [params, setParams])

  useEffect(() => { getPostingFacets().then(setFacets).catch(() => setFacets(null)) }, [])

  const filters = useMemo(() => Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || ''])), [params])

  const awaitingDefaults = !FILTER_KEYS.some((k) => params.has(k)) && !params.has('all')

  useEffect(() => {
    if (awaitingDefaults) return undefined
    let cancelled = false
    setData(null)
    setError(null)
    searchPostings({ ...filters, limit: PAGE_SIZE })
      .then((res) => { if (!cancelled) setData(res) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [filters, awaitingDefaults])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (![...next.keys()].some((k) => FILTER_KEYS.includes(k))) next.set('all', '1')
    else next.delete('all')
    setParams(next)
  }

  const clearAll = () => { setQuery(''); setParams({ all: '1' }) }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await searchPostings({ ...filters, limit: PAGE_SIZE, offset: data.results.length })
      setData((d) => ({ ...res, results: [...d.results, ...res.results] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  const save = async (posting) => {
    setSavingId(posting.id)
    try {
      const tracked = await trackPosting(posting.id)
      setData((d) => ({ ...d, results: d.results.map((p) => (p.id === posting.id ? { ...p, tracked_id: tracked.id } : p)) }))
      showToast(`Saved “${posting.title}” to your tracker`, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  const activeFilters = FILTER_KEYS.filter((k) => k !== 'sort' && filters[k])
  const isDefaultView = filters.open_to_sri_lanka === 'true' && filters.level === EARLY_CAREER && activeFilters.length === 2

  return (
    <>
      <PageHeader
        title="Jobs"
        description={
          facets
            ? `${facets.total} open roles from ${facets.companies.length} employers’ own job boards${
              facets.last_synced_at ? `, last synced ${relativeDays(facets.last_synced_at)}` : ''
            }. You apply on the employer’s site.`
            : 'Real openings from employers’ own job boards. Apply on the employer’s own site.'
        }
      />

      <form
        className="jobs-search"
        role="search"
        onSubmit={(e) => { e.preventDefault(); setFilter('q', query.trim()) }}
      >
        <GlassInput
          label="Search"
          className="jobs-search-field"
          placeholder="Job title, skill, company or keyword"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={200}
        />
        <GlassButton type="submit" variant="primary" icon={<SearchIcon size={16} />}>Search</GlassButton>
      </form>

      <div className="jobs-filters" aria-label="Filters">
        <GlassSelect label="Experience" value={filters.level} onChange={(v) => setFilter('level', v)} options={LEVEL_OPTIONS} />
        <GlassSelect
          label="Work mode" value={filters.work_mode} onChange={(v) => setFilter('work_mode', v)}
          options={[{ value: '', label: 'Any' }, { value: 'Remote', label: 'Remote' }, { value: 'Hybrid', label: 'Hybrid' }, { value: 'On-site', label: 'On-site' }]}
        />
        <GlassSelect label="Country" value={filters.country} onChange={(v) => setFilter('country', v)} options={facetOptions(facets?.countries, 'Any country')} />
        <GlassSelect label="Company" value={filters.company} onChange={(v) => setFilter('company', v)} options={facetOptions(facets?.companies, 'Any company')} />
        <GlassSelect label="Job type" value={filters.employment_type} onChange={(v) => setFilter('employment_type', v)} options={facetOptions(facets?.employment_types?.filter((r) => r.value !== 'Unspecified'), 'Any type')} />
        <GlassSelect label="Posted" value={filters.posted_within} onChange={(v) => setFilter('posted_within', v)} options={POSTED_OPTIONS} />
        <div className="jobs-filter-toggles">
          <GlassCheckbox
            label="Open to applicants in Sri Lanka"
            checked={filters.open_to_sri_lanka === 'true'}
            onChange={(e) => setFilter('open_to_sri_lanka', e.target.checked ? 'true' : '')}
          />
          {isCandidate && data?.has_resume && (
            <GlassCheckbox
              label="Most skills in common first"
              checked={filters.sort === 'skills'}
              onChange={(e) => setFilter('sort', e.target.checked ? 'skills' : '')}
            />
          )}
        </div>
      </div>

      <div className="toolbar">
        <p className="toolbar-count" aria-live="polite">
          {data ? `${data.total} ${data.total === 1 ? 'role' : 'roles'}` : 'Searching…'}
          {isDefaultView && ' for early-career applicants in Sri Lanka, including remote roles that accept them'}
        </p>
        {activeFilters.length > 0 && (
          <GlassButton variant="ghost" size="sm" onClick={clearAll}>
            {isDefaultView ? `Show all ${facets?.total ?? ''} roles` : 'Clear filters'}
          </GlassButton>
        )}
      </div>

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!data && !error && <LoadingBlock rows={4} label="Loading jobs" />}

      {data && data.results.length === 0 && (
        <GlassEmptyState
          title="No roles match these filters"
          subtitle={facets?.total === 0
            ? 'No job boards have been synced yet. Check back soon, or add a job you found elsewhere to your tracker.'
            : 'Try fewer filters or a broader search. Only real, currently listed openings are shown.'}
          action={activeFilters.length > 0 && <GlassButton variant="secondary" onClick={clearAll}>Clear filters</GlassButton>}
        />
      )}

      {data && data.results.length > 0 && (
        <>
          <ul className="posting-list">
            {data.results.map((p) => (
              <li key={p.id} className="posting-card">
                <div className="posting-card-main">
                  <h2 className="posting-card-title"><Link to={`/openings/${p.id}`}>{p.title}</Link></h2>
                  <p className="posting-card-company">{p.company}</p>
                  <p className="posting-card-meta">{postingFacts(p).join(' · ') || 'Location not stated'}</p>
                  <div className="posting-card-badges">
                    <PostingBadges posting={p} />
                    <SkillOverlap overlap={p.skill_overlap} />
                  </div>
                  <p className="posting-card-source">
                    <PostedLine posting={p} />
                  </p>
                </div>
                <div className="posting-card-actions">
                  {isCandidate && (p.tracked_id ? (
                    <GlassButton as={Link} to={`/tracker/${p.tracked_id}`} variant="secondary" size="sm">In your tracker</GlassButton>
                  ) : (
                    <GlassButton
                      variant="secondary" size="sm" loading={savingId === p.id} loadingText="Saving…"
                      onClick={() => save(p)} aria-label={`Save ${p.title} at ${p.company}`}
                    >
                      Save
                    </GlassButton>
                  ))}
                  <GlassButton as={Link} to={`/openings/${p.id}`} variant="ghost" size="sm" aria-label={`View ${p.title} at ${p.company}`}>
                    {user ? 'Check fit' : 'View'}
                  </GlassButton>
                </div>
              </li>
            ))}
          </ul>
          {data.results.length < data.total && (
            <div className="load-more">
              <GlassButton variant="secondary" loading={loadingMore} loadingText="Loading…" onClick={loadMore}>
                Show more ({data.total - data.results.length} left)
              </GlassButton>
            </div>
          )}
        </>
      )}

      {!user && (
        <p className="landing-footnote">
          <Link to="/signup" className="text-link">Create a free account</Link> to see how your resume fits each role,
          save jobs, and track your applications.
        </p>
      )}
    </>
  )
}
