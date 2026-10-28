import { useEffect, useState } from 'react'
import GlassBadge from '../components/glass/GlassBadge.jsx'
import GlassButton from '../components/glass/GlassButton.jsx'
import GlassCard from '../components/glass/GlassCard.jsx'
import GlassEmptyState from '../components/glass/GlassEmptyState.jsx'
import GlassInput from '../components/glass/GlassInput.jsx'
import GlassSelect from '../components/glass/GlassSelect.jsx'
import GlassTable from '../components/glass/GlassTable.jsx'
import { useToast } from '../components/glass/GlassToast.jsx'
import PageHeader from '../components/PageHeader.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import { WarningIcon } from '../components/icons.jsx'
import {
  addManualPosting, addSource, listSources, relativeDays, seedSources, SOURCE_LABELS, syncAllSources,
  syncSource, updateSource,
} from '../utils/workspace.js'

const KIND_OPTIONS = ['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workable'].map((k) => ({ value: k, label: SOURCE_LABELS[k] }))
const MODE_OPTIONS = ['Unspecified', 'Remote', 'Hybrid', 'On-site'].map((m) => ({ value: m, label: m === 'Unspecified' ? 'Not stated' : m }))
const EMPTY_SOURCE = { kind: 'greenhouse', board: '', company: '', website: '', notes: '' }
const EMPTY_POSTING = {
  title: '', company: '', location: '', description: '', apply_url: '', source_url: '',
  work_mode: 'Unspecified', employment_type: '', posted_on: '', closes_on: '',
}

function syncSummary(r) {
  if (r.status !== 'ok') return `${r.source || 'Source'}: ${r.error}`
  return `${r.source || 'Source'}: ${r.listed} listed, ${r.added} new, ${r.updated} updated, ${r.expired} no longer listed`
}

// The registry of employer job boards the index is built from, plus hand
// curation of single adverts. Only official public posting APIs on fixed
// hosts are supported; adding a board shows a preview first so the admin
// can confirm it's the employer they meant.
export default function AdminSourcesPage() {
  const showToast = useToast()
  const [sources, setSources] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [sourceForm, setSourceForm] = useState(EMPTY_SOURCE)
  const [preview, setPreview] = useState(null)
  const [postingForm, setPostingForm] = useState(EMPTY_POSTING)
  const [formError, setFormError] = useState({})

  const load = () => listSources().then(setSources).catch((err) => setError(err.message))
  useEffect(() => { load() }, [])

  const run = async (key, fn) => {
    setBusy(key)
    try { await fn() } catch (err) { showToast(err.message, 'error') } finally { setBusy(null) }
  }

  const syncOne = (s) => run(`sync-${s.id}`, async () => {
    const { result } = await syncSource(s.id)
    showToast(syncSummary({ source: s.company, ...result }), result.status === 'ok' ? 'success' : 'error')
    load()
  })

  const syncAll = () => run('sync-all', async () => {
    const { results } = await syncAllSources()
    const failed = results.filter((r) => r.status !== 'ok')
    showToast(failed.length ? `${failed.length} of ${results.length} failed. ${failed.map(syncSummary).join('; ')}` : `Synced ${results.length} sources`, failed.length ? 'error' : 'success', 8000)
    load()
  })

  const toggle = (s) => run(`toggle-${s.id}`, async () => {
    if (s.enabled && !window.confirm(`Disable ${s.company}? Its ${s.active_postings} open postings will be marked as no longer listed.`)) return
    await updateSource(s.id, { enabled: !s.enabled })
    load()
  })

  const seed = () => run('seed', async () => {
    const { created } = await seedSources()
    showToast(created.length ? `Added ${created.join(', ')}. Sync them to import postings.` : 'All starter sources are already registered', 'info')
    load()
  })

  const submitSource = (e) => {
    e.preventDefault()
    setFormError({})
    run('add-source', async () => {
      try {
        const res = await addSource({ ...sourceForm, board: sourceForm.board.trim(), company: sourceForm.company.trim() })
        setPreview(res)
        setSourceForm(EMPTY_SOURCE)
        load()
      } catch (err) {
        setFormError({ source: err.message })
      }
    })
  }

  const submitPosting = (e) => {
    e.preventDefault()
    setFormError({})
    run('add-posting', async () => {
      try {
        await addManualPosting({ ...postingForm, posted_on: postingForm.posted_on || null, closes_on: postingForm.closes_on || null })
        setPostingForm(EMPTY_POSTING)
        showToast('Vacancy added to the job index', 'success')
        load()
      } catch (err) {
        setFormError({ posting: err.message })
      }
    })
  }

  const bindSource = (key) => ({ value: sourceForm[key], onChange: (e) => setSourceForm((f) => ({ ...f, [key]: e.target.value })) })
  const bindPosting = (key) => ({ value: postingForm[key], onChange: (e) => setPostingForm((f) => ({ ...f, [key]: e.target.value })) })

  return (
    <>
      <PageHeader
        title="Job sources"
        description="Employer job boards the public job index is built from. Only official public posting APIs are used, and every posting links back to its source."
        actions={(
          <>
            <GlassButton variant="secondary" loading={busy === 'seed'} onClick={seed}>Add starter sources</GlassButton>
            <GlassButton variant="primary" loading={busy === 'sync-all'} loadingText="Syncing…" onClick={syncAll}>Sync all</GlassButton>
          </>
        )}
      />

      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!sources && !error && <LoadingBlock rows={3} label="Loading sources" />}

      <div className="stack">
        {sources && sources.length === 0 && (
          <GlassEmptyState
            title="No sources yet"
            subtitle="Add the starter sources (a few employers with public job boards that hire remotely or in Sri Lanka), or register a board below."
          />
        )}
        {sources && sources.length > 0 && (
          <GlassCard flush>
            <GlassTable>
              <caption className="visually-hidden">Registered job sources</caption>
              <thead>
                <tr><th scope="col">Employer</th><th scope="col">Open postings</th><th scope="col">Last sync</th><th scope="col"><span className="visually-hidden">Actions</span></th></tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Employer" className="cell-wrap">
                      <strong>{s.company}</strong>
                      <div className="form-hint">{SOURCE_LABELS[s.kind] || s.kind}{s.board && <> · <code>{s.board}</code></>}{!s.enabled && ' · disabled'}</div>
                      {s.notes && <div className="form-hint">{s.notes}</div>}
                    </td>
                    <td data-label="Open postings" className="num">{s.active_postings}</td>
                    <td data-label="Last sync" className="cell-wrap">
                      {s.last_status === 'ok' && <GlassBadge variant="success">OK</GlassBadge>}
                      {s.last_status === 'error' && <GlassBadge variant="danger">Failed</GlassBadge>}
                      {s.last_status === 'never' && <GlassBadge variant="neutral">Never synced</GlassBadge>}
                      {s.last_synced_at && <div className="form-hint">{relativeDays(s.last_synced_at)}, {s.last_count} listed</div>}
                      {s.last_error && <div className="form-hint">{s.last_error}</div>}
                    </td>
                    <td className="data-table-actions">
                      {s.kind !== 'manual' && (
                        <>
                          <GlassButton size="sm" variant="secondary" disabled={!s.enabled} loading={busy === `sync-${s.id}`} onClick={() => syncOne(s)}>Sync</GlassButton>
                          <GlassButton size="sm" variant="ghost" loading={busy === `toggle-${s.id}`} onClick={() => toggle(s)}>{s.enabled ? 'Disable' : 'Enable'}</GlassButton>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </GlassTable>
          </GlassCard>
        )}

        <div className="split">
          <GlassCard title="Register an employer’s job board" subtitle="The board is read once first, so you can check it’s the employer you meant.">
            <form onSubmit={submitSource} className="form-grid">
              <GlassSelect label="Board type" value={sourceForm.kind} onChange={(v) => setSourceForm((f) => ({ ...f, kind: v }))} options={KIND_OPTIONS} />
              <GlassInput label="Board name" required maxLength={100} hint="The company’s slug in the board’s URL, e.g. “gitlab” in boards.greenhouse.io/gitlab." {...bindSource('board')} />
              <GlassInput label="Employer" required maxLength={200} {...bindSource('company')} />
              <GlassInput label="Careers page" type="url" maxLength={500} {...bindSource('website')} />
              <GlassInput as="textarea" rows={3} label="Notes" maxLength={2000} hint="Terms checked, coverage, who verified it." {...bindSource('notes')} />
              <div className="form-actions">
                {formError.source && <p className="field-error" role="alert"><WarningIcon size={15} />{formError.source}</p>}
                <GlassButton type="submit" variant="primary" loading={busy === 'add-source'} loadingText="Reading board…">Check and save</GlassButton>
              </div>
            </form>
            {preview && (
              <div className="source-preview" role="status">
                <p><strong>{preview.source.company}</strong> lists {preview.listed} postings. {preview.message}</p>
                <ul className="plain-list">{preview.preview.map((p, i) => <li key={i}>{p.title}{p.location && ` · ${p.location}`}</li>)}</ul>
              </div>
            )}
          </GlassCard>

          <GlassCard title="Add a single vacancy" subtitle="Copied from an employer’s own published advert. Link to that advert so it can be checked.">
            <form onSubmit={submitPosting} className="form-grid">
              <GlassInput label="Job title" required maxLength={300} {...bindPosting('title')} />
              <GlassInput label="Employer" required maxLength={200} {...bindPosting('company')} />
              <GlassInput label="Location" maxLength={500} {...bindPosting('location')} />
              <GlassSelect label="Work mode" value={postingForm.work_mode} onChange={(v) => setPostingForm((f) => ({ ...f, work_mode: v }))} options={MODE_OPTIONS} />
              <GlassInput label="Employment type" maxLength={40} placeholder="e.g. Internship, Full-time" {...bindPosting('employment_type')} />
              <GlassInput label="Original advert URL" type="url" required maxLength={1000} {...bindPosting('source_url')} />
              <GlassInput label="Application URL" type="url" required maxLength={1000} {...bindPosting('apply_url')} />
              <GlassInput label="Posted on" type="date" {...bindPosting('posted_on')} />
              <GlassInput label="Closes on" type="date" hint="It’s marked as closed after this date." {...bindPosting('closes_on')} />
              <GlassInput as="textarea" rows={6} label="Description" required minLength={20} maxLength={30000} {...bindPosting('description')} />
              <div className="form-actions">
                {formError.posting && <p className="field-error" role="alert"><WarningIcon size={15} />{formError.posting}</p>}
                <GlassButton type="submit" variant="primary" loading={busy === 'add-posting'}>Add vacancy</GlassButton>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </>
  )
}
