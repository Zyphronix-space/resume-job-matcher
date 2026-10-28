import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassSelect from '../../components/glass/GlassSelect.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import AddJobModal from '../../components/AddJobModal.jsx'
import Tabs from '../../components/Tabs.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { CLOSED_STAGES, formatDate, isOverdue, listTracked, TRACKER_STAGES, updateTracked } from '../../utils/workspace.js'

const VIEWS = [
  { id: 'active', label: 'In progress' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
]
const STAGE_OPTIONS = TRACKER_STAGES.map((s) => ({ value: s, label: s }))

export default function TrackerPage() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [view, setView] = useState('active')
  const [adding, setAdding] = useState(false)
  const showToast = useToast()
  const navigate = useNavigate()

  useEffect(() => { listTracked().then(setItems).catch((err) => setError(err.message)) }, [])

  const groups = useMemo(() => {
    if (!items) return null
    const active = items.filter((t) => !CLOSED_STAGES.includes(t.stage))
    const closed = items.filter((t) => CLOSED_STAGES.includes(t.stage))
    return { active, closed, all: items }
  }, [items])

  const changeStage = async (item, stage) => {
    try {
      const updated = await updateTracked(item.id, { stage })
      setItems((list) => list.map((t) => (t.id === item.id ? { ...t, ...updated } : t)))
      showToast(`Moved to ${stage}`, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const shown = groups ? groups[view] : []

  return (
    <>
      <PageHeader
        title="Tracker"
        description="Every job you’re considering, preparing for or have applied to. Private to you."
        actions={(
          <>
            <GlassButton as={Link} to="/openings" variant="secondary">Find jobs</GlassButton>
            <GlassButton variant="primary" onClick={() => setAdding(true)}>Add a job</GlassButton>
          </>
        )}
      />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!items && !error && <LoadingBlock rows={4} label="Loading your tracker" />}

      {items && items.length === 0 && (
        <GlassEmptyState
          title="Nothing tracked yet"
          subtitle="Save a job from the Jobs page, or add one you found elsewhere by pasting its link or description."
          action={(
            <div className="button-row">
              <GlassButton as={Link} to="/openings" variant="primary">Browse jobs</GlassButton>
              <GlassButton variant="secondary" onClick={() => setAdding(true)}>Add a job</GlassButton>
            </div>
          )}
        />
      )}

      {items && items.length > 0 && (
        <>
          <Tabs
            tabs={VIEWS} current={view} onChange={setView} label="Filter tracked jobs"
            counts={{ active: groups.active.length, closed: groups.closed.length, all: groups.all.length }}
          />
          {shown.length === 0 ? (
            <GlassEmptyState title={view === 'closed' ? 'No closed applications' : 'Nothing in progress'} />
          ) : (
            <ul className="tracker-list">
              {shown.map((t) => (
                <li key={t.id} className="tracker-row">
                  <div className="tracker-row-main">
                    <Link to={`/tracker/${t.id}`} className="tracker-row-title">{t.title}</Link>
                    <span className="tracker-row-meta">
                      {[t.company, t.location].filter(Boolean).join(' · ') || 'No company added'}
                    </span>
                    <span className="tracker-row-dates">
                      {t.applied_on && <span>Applied {formatDate(t.applied_on)}</span>}
                      {t.next_follow_up && (
                        <span className={isOverdue(t.next_follow_up) ? 'is-overdue' : ''}>
                          Follow up {formatDate(t.next_follow_up)}{isOverdue(t.next_follow_up) && ' (overdue)'}
                        </span>
                      )}
                      {!t.applied_on && !t.next_follow_up && <span>Added {formatDate(t.created_at)}</span>}
                    </span>
                  </div>
                  <div className="tracker-row-side">
                    {t.posting_status === 'expired' && <GlassBadge variant="danger">No longer listed</GlassBadge>}
                    {t.origin === 'pasted' && <GlassBadge variant="neutral">Added by you</GlassBadge>}
                    <GlassSelect
                      ariaLabel={`Stage for ${t.title}`}
                      className="tracker-stage"
                      value={t.stage}
                      onChange={(stage) => stage !== t.stage && changeStage(t, stage)}
                      options={STAGE_OPTIONS}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {adding && (
        <AddJobModal
          onClose={() => setAdding(false)}
          onAdded={(tracked) => {
            setAdding(false)
            showToast('Added to your tracker', 'success')
            navigate(`/tracker/${tracked.id}`)
          }}
        />
      )}
    </>
  )
}
