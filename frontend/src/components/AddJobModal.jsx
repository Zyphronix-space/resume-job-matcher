import { useState } from 'react'
import GlassButton from './glass/GlassButton.jsx'
import GlassInput from './glass/GlassInput.jsx'
import GlassModal from './glass/GlassModal.jsx'
import Tabs from './Tabs.jsx'
import { WarningIcon } from './icons.jsx'
import { tabPanelProps, trackImport, trackManual } from '../utils/workspace.js'

const MODES = [
  { id: 'link', label: 'From a job-board link' },
  { id: 'paste', label: 'Paste the details' },
]

// Adds a job found anywhere else to the candidate's private tracker. A link
// is only parsed (Greenhouse, Lever, Ashby, SmartRecruiters, Workable) and
// read from that board's public API by the server; it's never fetched as
// given. Anything else is pasted by hand.
export default function AddJobModal({ onClose, onAdded }) {
  const [mode, setMode] = useState('link')
  const [url, setUrl] = useState('')
  const [fields, setFields] = useState({ title: '', company: '', location: '', apply_url: '', description: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const bind = (key) => ({ value: fields[key], onChange: (e) => setFields((f) => ({ ...f, [key]: e.target.value })) })

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const tracked = mode === 'link' ? await trackImport(url.trim()) : await trackManual({
        ...fields, title: fields.title.trim(), apply_url: fields.apply_url.trim(),
      })
      onAdded(tracked)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassModal title="Add a job you found elsewhere" onClose={onClose} width={620}>
      <Tabs tabs={MODES} current={mode} onChange={(m) => { setMode(m); setError(null) }} label="How to add the job" />
      <form onSubmit={submit} className="form-grid" {...tabPanelProps(mode)}>
        {mode === 'link' ? (
          <GlassInput
            label="Link to the job posting"
            type="url"
            inputMode="url"
            required
            placeholder="https://boards.greenhouse.io/company/jobs/123"
            hint="Works with Greenhouse, Lever, Ashby, SmartRecruiters and Workable job pages. For any other site, paste the details instead."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={2000}
          />
        ) : (
          <>
            <GlassInput label="Job title" required maxLength={300} {...bind('title')} />
            <GlassInput label="Company" maxLength={200} {...bind('company')} />
            <GlassInput label="Location" maxLength={500} {...bind('location')} />
            <GlassInput label="Link to apply" type="url" inputMode="url" placeholder="https://…" maxLength={1000} {...bind('apply_url')} />
            <GlassInput
              as="textarea" rows={8} label="Job description" maxLength={30000}
              hint="Paste the full advert. It’s what your resume is compared with, and it stays private to you."
              {...bind('description')}
            />
          </>
        )}
        <div className="form-actions">
          {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
          <GlassButton variant="ghost" onClick={onClose}>Cancel</GlassButton>
          <GlassButton type="submit" variant="primary" loading={busy} loadingText={mode === 'link' ? 'Reading the posting…' : 'Adding…'}>
            Add to tracker
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  )
}
