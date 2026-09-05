import { useState } from 'react'
import { PlusIcon } from './icons.jsx'
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
    <label className="find-field">
      <span>{label}</span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="e.g. python — press Enter to add"
        />
        <button type="button" className="icon-btn" onClick={add} aria-label={`Add ${label}`}><PlusIcon size={16} /></button>
      </div>
      <div className="chip-input-row">
        {skills.map((s) => (
          <span key={s} className="skill-pill skill-pill-matched">
            {skillLabel(s)}
            <button type="button" onClick={() => onChange(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>×</button>
          </span>
        ))}
      </div>
    </label>
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
      <label className="find-field">
        <span>Title</span>
        <input required value={job.title} onChange={set('title')} placeholder="e.g. Backend Engineer Intern" />
      </label>
      <label className="find-field">
        <span>Location</span>
        <input value={job.location} onChange={set('location')} placeholder="e.g. Colombo, Sri Lanka or Remote" />
      </label>
      <label className="find-field">
        <span>Employment type</span>
        <select value={job.employment_type} onChange={set('employment_type')}>
          {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="find-field">
        <span>Status</span>
        <select value={job.status} onChange={set('status')}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label className="find-field">
        <span>Experience</span>
        <input value={job.experience} onChange={set('experience')} placeholder="e.g. 0-1 years" />
      </label>
      <label className="find-field">
        <span>Education</span>
        <input value={job.education} onChange={set('education')} placeholder="e.g. Pursuing BSc in CS or related" />
      </label>

      <label className="find-field" style={{ gridColumn: '1 / -1' }}>
        <span>Description</span>
        <textarea value={job.description} onChange={set('description')} placeholder="Describe the role, responsibilities, and what you're looking for." />
      </label>

      <div style={{ gridColumn: '1 / -1' }}>
        <SkillChipInput label="Required skills" skills={job.required_skills} onChange={(v) => setJob((j) => ({ ...j, required_skills: v }))} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <SkillChipInput label="Preferred skills" skills={job.preferred_skills} onChange={(v) => setJob((j) => ({ ...j, preferred_skills: v }))} />
      </div>

      <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" className="analyze-btn" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="new-analysis-btn" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
