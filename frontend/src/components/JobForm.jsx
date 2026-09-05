import { useState } from 'react'
import { PlusIcon } from './icons.jsx'
import GlassInput from './glass/GlassInput.jsx'
import GlassSelect from './glass/GlassSelect.jsx'
import GlassButton from './glass/GlassButton.jsx'
import { skillLabel } from '../utils/skillLabel.js'

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Temporary']
const STATUSES = ['Draft', 'Open', 'Closed']

function SkillChipInput({ label, skills, onChange }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim().toLowerCase()
    if (value && !skills.includes(value)) onChange([...skills, value])
    setDraft('')
  }

  return (
    <div className="glass-field">
      <span className="glass-field-label">{label}</span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          className="glass-field-control"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="e.g. python — press Enter to add"
        />
        <GlassButton variant="secondary" onClick={add} aria-label={`Add ${label}`}><PlusIcon size={16} /></GlassButton>
      </div>
      <div className="chip-input-row">
        {skills.map((s) => (
          <span key={s} className="skill-pill skill-pill-matched">
            {skillLabel(s)}
            <button type="button" onClick={() => onChange(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>×</button>
          </span>
        ))}
      </div>
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
      <GlassInput label="Title" required value={job.title} onChange={set('title')} placeholder="e.g. Backend Engineer Intern" />
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

      <div style={{ gridColumn: '1 / -1' }}>
        <GlassInput
          as="textarea" label="Description" value={job.description} onChange={set('description')}
          placeholder="Describe the role, responsibilities, and what you're looking for."
        />
      </div>

      <div style={{ gridColumn: '1 / -1' }}>
        <SkillChipInput label="Required skills" skills={job.required_skills} onChange={(v) => setJob((j) => ({ ...j, required_skills: v }))} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <SkillChipInput label="Preferred skills" skills={job.preferred_skills} onChange={(v) => setJob((j) => ({ ...j, preferred_skills: v }))} />
      </div>

      <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
        {error && <p className="glass-field-error">{error}</p>}
        <GlassButton type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</GlassButton>
        {onCancel && <GlassButton type="button" variant="secondary" onClick={onCancel}>Cancel</GlassButton>}
      </div>
    </form>
  )
}
