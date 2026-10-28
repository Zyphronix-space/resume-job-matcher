import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import GlassBadge from '../../components/glass/GlassBadge.jsx'
import GlassButton from '../../components/glass/GlassButton.jsx'
import GlassCard from '../../components/glass/GlassCard.jsx'
import GlassEmptyState from '../../components/glass/GlassEmptyState.jsx'
import GlassInput from '../../components/glass/GlassInput.jsx'
import GlassSelect from '../../components/glass/GlassSelect.jsx'
import { useToast } from '../../components/glass/GlassToast.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import AssessmentView from '../../components/AssessmentView.jsx'
import CollapsibleText from '../../components/CollapsibleText.jsx'
import Tabs from '../../components/Tabs.jsx'
import { WarningIcon } from '../../components/icons.jsx'
import { listResumes } from '../../utils/resumes.js'
import {
  formatDate, generateDocument, getInterviewPrep, getTracked, getTrackedAssessment, removeTracked,
  saveDocument, tabPanelProps, TRACKER_STAGES, updateTracked,
} from '../../utils/workspace.js'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'fit', label: 'Fit' },
  { id: 'documents', label: 'Drafts' },
  { id: 'prep', label: 'Interview prep' },
]
const STAGE_OPTIONS = TRACKER_STAGES.map((s) => ({ value: s, label: s }))
const DOC_KINDS = [
  { kind: 'resume', title: 'Tailored resume', hint: 'Your own entries, reordered so the ones relevant to this job come first.' },
  { kind: 'cover_letter', title: 'Cover letter', hint: 'Built around the requirements your resume actually shows.' },
  { kind: 'outreach', title: 'Outreach message (optional)', hint: 'A short note you could send a hiring contact yourself. Nothing is sent from here.' },
]

function placeholderCount(text) {
  return (text.match(/\[ADD:/g) || []).length
}

function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function Overview({ tracked, resumes, onSaved }) {
  const showToast = useToast()
  const [form, setForm] = useState({
    stage: tracked.stage,
    applied_on: tracked.applied_on || '',
    next_follow_up: tracked.next_follow_up || '',
    resume_id: tracked.resume_id || '',
    notes: tracked.notes,
  })
  const [details, setDetails] = useState({
    title: tracked.title, company: tracked.company, location: tracked.location,
    apply_url: tracked.apply_url, description: tracked.description,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const editableJob = tracked.origin === 'pasted'

  const bind = (setter, key) => ({ value: (setter === setForm ? form : details)[key], onChange: (e) => setter((f) => ({ ...f, [key]: e.target.value })) })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        applied_on: form.applied_on || null,
        next_follow_up: form.next_follow_up || null,
        resume_id: form.resume_id || null,
        ...(editableJob ? details : {}),
      }
      onSaved(await updateTracked(tracked.id, body))
      showToast('Saved', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const resumeOptions = [
    { value: '', label: 'Active resume (default)' },
    ...resumes.map((r) => ({ value: r.id, label: `${r.filename} (v${r.version})${r.is_active ? ', active' : ''}` })),
  ]

  return (
    <form onSubmit={save} className="detail-grid">
      <div className="stack">
        <GlassCard title="Progress">
          <div className="form-grid cols-2">
            <GlassSelect label="Stage" value={form.stage} onChange={(v) => setForm((f) => ({ ...f, stage: v }))} options={STAGE_OPTIONS} />
            <GlassSelect label="Resume version used" value={form.resume_id} onChange={(v) => setForm((f) => ({ ...f, resume_id: v }))} options={resumeOptions} />
            <GlassInput label="Applied on" type="date" {...bind(setForm, 'applied_on')} hint="Set automatically when you move to Applied." />
            <GlassInput label="Next follow-up" type="date" {...bind(setForm, 'next_follow_up')} hint="Shows on your overview when it’s close." />
            <GlassInput as="textarea" rows={5} label="Notes" className="span-all" maxLength={20000} {...bind(setForm, 'notes')} />
          </div>
        </GlassCard>

        {editableJob && (
          <GlassCard title="Job details" subtitle="You added this job yourself, so you can edit it.">
            <div className="form-grid cols-2">
              <GlassInput label="Job title" required maxLength={300} {...bind(setDetails, 'title')} />
              <GlassInput label="Company" maxLength={200} {...bind(setDetails, 'company')} />
              <GlassInput label="Location" maxLength={500} {...bind(setDetails, 'location')} />
              <GlassInput label="Link to apply" type="url" maxLength={1000} {...bind(setDetails, 'apply_url')} />
              <GlassInput
                as="textarea" rows={10} label="Job description" className="span-all" maxLength={30000}
                hint="Needed for the fit check, drafts and interview prep."
                {...bind(setDetails, 'description')}
              />
            </div>
          </GlassCard>
        )}

        <div className="form-actions">
          {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
          <GlassButton type="submit" variant="primary" loading={saving} loadingText="Saving…">Save changes</GlassButton>
        </div>

        {!editableJob && (
          <GlassCard title="Job description">
            {tracked.description
              ? <CollapsibleText text={tracked.description} />
              : <p className="form-hint">No description available.</p>}
          </GlassCard>
        )}
      </div>

      <aside className="stack">
        <GlassCard title="Apply">
          {tracked.apply_url ? (
            <>
              <p className="form-hint">Applications are made on the employer’s own site. ResumeMatch never applies or sends anything for you.</p>
              <GlassButton as="a" href={tracked.apply_url} target="_blank" rel="noopener noreferrer" variant="primary" block>
                Open the application page
              </GlassButton>
            </>
          ) : (
            <p className="form-hint">No application link saved. Add one under Job details.</p>
          )}
          {tracked.posting_id && (
            <p className="form-hint">
              <Link className="text-link" to={`/openings/${tracked.posting_id}`}>View the listing</Link>
              {tracked.posting_last_verified_at && <>, last checked {formatDate(tracked.posting_last_verified_at)}</>}
            </p>
          )}
        </GlassCard>

        <GlassCard title="History">
          <ol className="history-list">
            {[...tracked.events].reverse().map((e, i) => (
              <li key={`${e.at}-${i}`}>
                <span className="history-stage">{e.from ? `${e.from} → ${e.to}` : `Added as ${e.to}`}</span>
                <span className="history-date">{formatDate(e.at)}</span>
              </li>
            ))}
          </ol>
        </GlassCard>
      </aside>
    </form>
  )
}

function Fit({ trackedId }) {
  const [assessment, setAssessment] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    setError(null)
    try { setAssessment(await getTrackedAssessment(trackedId)) } catch (err) { setError(err.message) } finally { setLoading(false) }
  }

  useEffect(() => { run() }, [trackedId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingBlock rows={3} label="Comparing your resume with this job" />
  if (error) return <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>
  return <GlassCard><AssessmentView assessment={assessment} /></GlassCard>
}

function DraftEditor({ tracked, spec, onUpdated }) {
  const showToast = useToast()
  const saved = tracked.documents[spec.kind]
  const [text, setText] = useState(saved?.content || '')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const dirty = text !== (saved?.content || '')

  useEffect(() => { setText(saved?.content || '') }, [saved?.content])

  const generate = async () => {
    if ((saved?.edited || dirty) && !window.confirm('Replace your edited draft with a fresh one? Your edits will be lost.')) return
    setBusy('generate')
    setError(null)
    try {
      onUpdated(await generateDocument(tracked.id, spec.kind, Boolean(saved?.edited)))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    setBusy('save')
    setError(null)
    try {
      onUpdated(await saveDocument(tracked.id, spec.kind, text))
      showToast('Draft saved', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('Copied', 'success')
    } catch {
      showToast('Couldn’t copy. Select the text and copy it instead.', 'error')
    }
  }

  const missing = placeholderCount(text)
  const fileBase = `${tracked.company || 'job'}-${spec.kind}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return (
    <GlassCard
      title={spec.title}
      subtitle={spec.hint}
      actions={(
        <GlassButton variant={saved ? 'secondary' : 'primary'} size="sm" loading={busy === 'generate'} loadingText="Drafting…" onClick={generate}>
          {saved ? 'Redraft' : 'Create draft'}
        </GlassButton>
      )}
    >
      {saved && (
        <div className="draft-status">
          {saved.generator
            ? <GlassBadge variant="neutral">Template draft{saved.edited ? ', edited by you' : ''}</GlassBadge>
            : <GlassBadge variant="neutral">Written by you</GlassBadge>}
          {missing > 0 && <GlassBadge variant="warning">{missing} {missing === 1 ? 'gap' : 'gaps'} to fill in</GlassBadge>}
          {saved.updated_at && <span className="form-hint">Saved {formatDate(saved.updated_at)}</span>}
        </div>
      )}
      <GlassInput
        as="textarea"
        rows={saved ? 16 : 4}
        label={`${spec.title} text`}
        className="draft-text"
        placeholder={'Create a draft from your resume, or write your own here.'}
        value={text}
        maxLength={30000}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      <div className="button-row">
        <GlassButton variant="primary" size="sm" disabled={!dirty} loading={busy === 'save'} onClick={save}>Save edits</GlassButton>
        <GlassButton variant="secondary" size="sm" disabled={!text} onClick={copy}>Copy</GlassButton>
        <GlassButton variant="secondary" size="sm" disabled={!text} onClick={() => downloadText(`${fileBase}.txt`, text)}>Download .txt</GlassButton>
      </div>
    </GlassCard>
  )
}

function Documents({ tracked, onUpdated }) {
  return (
    <div className="stack">
      <p className="form-alert is-info" role="note">
        Drafts are filled in by a fixed template using only what’s in your resume and profile. They’re not written by AI,
        and nothing is invented: wherever something is missing you’ll see <code>[ADD: …]</code> for you to complete, honestly,
        or delete. Review every line before using a draft.
      </p>
      {DOC_KINDS.map((spec) => <DraftEditor key={spec.kind} tracked={tracked} spec={spec} onUpdated={onUpdated} />)}
    </div>
  )
}

function Prep({ tracked, onSaved }) {
  const showToast = useToast()
  const [prep, setPrep] = useState(null)
  const [error, setError] = useState(null)
  const [notes, setNotes] = useState(tracked.prep_notes)
  const [saving, setSaving] = useState(false)

  useEffect(() => { getInterviewPrep(tracked.id).then(setPrep).catch((err) => setError(err.message)) }, [tracked.id])

  const saveNotes = async () => {
    setSaving(true)
    try {
      onSaved(await updateTracked(tracked.id, { prep_notes: notes }))
      showToast('Prep notes saved', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
      {!prep && !error && <LoadingBlock rows={3} label="Building practice prompts" />}
      {prep && (
        <>
          <p className="form-hint">{prep.note}</p>
          {prep.walk_through.length > 0 && (
            <GlassCard title="Talk through your experience" subtitle="Skills this job asks for that your resume shows you’ve used.">
              <ul className="prep-list">
                {prep.walk_through.map((p) => (
                  <li key={p.skill}>
                    <p>{p.prompt}</p>
                    <p className="evidence-quote">From your {p.section}: “{p.from_resume}”</p>
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
          {prep.gaps.length > 0 && (
            <GlassCard title="Prepare for gaps" subtitle="Skills the posting names that your resume doesn’t show.">
              <ul className="prep-list">{prep.gaps.map((p) => <li key={p.skill}><p>{p.prompt}</p></li>)}</ul>
            </GlassCard>
          )}
          {prep.requirements_to_check.length > 0 && (
            <GlassCard title="Requirements to have an answer for">
              <ul className="prep-list">
                {prep.requirements_to_check.map((r) => <li key={r.text}><p>“{r.text}”</p><p className="form-hint">{r.note}</p></li>)}
              </ul>
            </GlassCard>
          )}
          <div className="split">
            <GlassCard title="Common questions">
              <ul className="plain-list">{prep.general.map((q) => <li key={q}>{q}</li>)}</ul>
            </GlassCard>
            <GlassCard title="Questions you could ask">
              <ul className="plain-list">{prep.questions_to_ask.map((q) => <li key={q}>{q}</li>)}</ul>
            </GlassCard>
          </div>
        </>
      )}
      <GlassCard title="Your prep notes">
        <GlassInput as="textarea" rows={6} label="Prep notes" maxLength={20000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="button-row">
          <GlassButton variant="primary" size="sm" disabled={notes === tracked.prep_notes} loading={saving} onClick={saveNotes}>Save notes</GlassButton>
        </div>
      </GlassCard>
    </div>
  )
}

export default function TrackedJobPage() {
  const { trackedId } = useParams()
  const navigate = useNavigate()
  const showToast = useToast()
  const [tracked, setTracked] = useState(null)
  const [resumes, setResumes] = useState([])
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    getTracked(trackedId).then(setTracked).catch((err) => setError(err.message))
    listResumes().then(setResumes).catch(() => setResumes([]))
  }, [trackedId])

  const remove = async () => {
    if (!window.confirm(`Remove “${tracked.title}” from your tracker? Its notes and drafts are deleted too.`)) return
    try {
      await removeTracked(tracked.id)
      showToast('Removed from your tracker', 'info')
      navigate('/tracker')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (error) {
    return (
      <GlassEmptyState
        title="Not found in your tracker"
        subtitle={error}
        action={<GlassButton as={Link} to="/tracker" variant="secondary">Back to tracker</GlassButton>}
      />
    )
  }
  if (!tracked) return <LoadingBlock rows={4} label="Loading" />

  const noDescription = !tracked.description.trim()

  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/tracker">Tracker</Link> / {tracked.company || tracked.title}</nav>
      <PageHeader
        title={tracked.title}
        meta={(
          <>
            {[tracked.company, tracked.location].filter(Boolean).join(' · ')}
            {' '}<GlassBadge variant="neutral">{tracked.stage}</GlassBadge>
            {tracked.posting_status === 'expired' && <> <GlassBadge variant="danger">No longer listed</GlassBadge></>}
          </>
        )}
        actions={<GlassButton variant="danger" size="sm" onClick={remove}>Remove</GlassButton>}
      />

      {tracked.posting_status === 'expired' && (
        <p className="form-alert is-warning" role="status">
          <WarningIcon size={15} />The employer’s board stopped listing this job, so it has probably closed. Check before spending time on it.
        </p>
      )}

      <Tabs tabs={TABS} current={tab} onChange={setTab} label="Job workspace" />
      <div {...tabPanelProps(tab)}>
        {tab === 'overview' && <Overview key={tracked.updated_at} tracked={tracked} resumes={resumes} onSaved={setTracked} />}
        {tab !== 'overview' && noDescription && (
          <GlassEmptyState
            title="Add the job description first"
            subtitle="The fit check, drafts and interview prep all compare your resume with the job’s description."
            action={<GlassButton variant="primary" onClick={() => setTab('overview')}>Go to job details</GlassButton>}
          />
        )}
        {!noDescription && tab === 'fit' && <Fit trackedId={tracked.id} />}
        {!noDescription && tab === 'documents' && <Documents tracked={tracked} onUpdated={setTracked} />}
        {!noDescription && tab === 'prep' && <Prep tracked={tracked} onSaved={setTracked} />}
      </div>
    </>
  )
}
