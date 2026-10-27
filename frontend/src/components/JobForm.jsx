import { useId, useState } from 'react'
import { CloseIcon, PlusIcon, WarningIcon } from './icons.jsx'
import GlassInput from './glass/GlassInput.jsx'
import GlassSelect from './glass/GlassSelect.jsx'
import GlassButton from './glass/GlassButton.jsx'
import { skillLabel } from '../utils/skillLabel.js'

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Temporary']
const STATUSES = ['Draft', 'Open', 'Closed']

function SkillChipInput({ label, hint, skills, onChange }) {
  const [draft, setDraft] = useState('')
  const inputId = useId()

  const add = () => {
    const value = draft.trim().toLowerCase()
    if (value && !skills.includes(value)) onChange([...skills, value])
    setDraft('')
  }

  return (
    <div className="glass-field span-all">
      <label className="glass-field-label" htmlFor={inputId}>{label}</label>
      <div className="inline-input">
        <input
          id={inputId}
          className="glass-field-control"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Type a skill and press Enter"
          aria-describedby={`${inputId}-hint`}
        />
        <GlassButton variant="secondary" onClick={add} disabled={!draft.trim()} aria-label={`Add to ${label.toLowerCase()}`}><PlusIcon size={16} /></GlassButton>
      </div>
      <span className="glass-field-hint" id={`${inputId}-hint`}>{hint}</span>
      {skills.length > 0 && (
        <ul className="tag-list" aria-label={label}>
          {skills.map((s) => (
            <li key={s} className="tag is-removable">
              {skillLabel(s)}
              <button type="button" onClick={() => onChange(skills.filter((x) => x !== s))} aria-label={`Remove ${skillLabel(s)}`}>
                <CloseIcon size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const EMPTY_JOB = {
  title: '', description: '', required_skills: [], preferred_skills: [],
  experience: '', education: '', location: '', employment_type: 'Internship', status: 'Open',
}

export default function JobForm({ initial, onSubmit, onCancel, submitLabel = 'Save job' }) {
  const [job, setJob] = useState({ ...EMPTY_JOB, ...initial })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (field) => (e) => setJob((j) => ({ ...j, [field]: e.target.value }))
  const setVal = (field) => (value) => setJob((j) => ({ ...j, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSubmit(job)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid cols-2">
      <GlassInput label="Title" required maxLength={160} value={job.title} onChange={set('title')} placeholder="e.g. Backend Engineer Intern" />
      <GlassInput label="Location" value={job.location} onChange={set('location')} placeholder="e.g. Colombo, Sri Lanka or Remote" />
      <GlassSelect
        label="Employment type" value={job.employment_type} onChange={setVal('employment_type')}
        options={EMPLOYMENT_TYPES.map((t) => ({ value: t, label: t }))}
      />
      <GlassSelect
        label="Status" value={job.status} onChange={setVal('status')}
        options={STATUSES.map((s) => ({ value: s, label: s }))}
      />
      <GlassInput label="Experience" value={job.experience} onChange={set('experience')} placeholder="e.g. 0-1 years" />
      <GlassInput label="Education" value={job.education} onChange={set('education')} placeholder="e.g. Pursuing BSc in CS or related" />

      <GlassInput
        as="textarea" label="Description" className="span-all" value={job.description} onChange={set('description')}
        hint="Applicants are scored against this text, so include responsibilities and requirements."
      />

      <SkillChipInput
        label="Required skills" hint="Required skills count as high importance when scoring."
        skills={job.required_skills} onChange={(v) => setJob((j) => ({ ...j, required_skills: v }))}
      />
      <SkillChipInput
        label="Preferred skills" hint="Nice to have. Shown to candidates as gaps if missing."
        skills={job.preferred_skills} onChange={(v) => setJob((j) => ({ ...j, preferred_skills: v }))}
      />

      <div className="form-actions span-all">
        {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
        {onCancel && <GlassButton type="button" variant="ghost" onClick={onCancel}>Cancel</GlassButton>}
        <GlassButton type="submit" variant="primary" loading={saving} loadingText="Saving…">{submitLabel}</GlassButton>
      </div>
    </form>
  )
}
