import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlassButton from './glass/GlassButton.jsx'
import GlassCheckbox from './glass/GlassCheckbox.jsx'
import GlassInput from './glass/GlassInput.jsx'
import { useToast } from './glass/GlassToast.jsx'
import LoadingBlock from './LoadingBlock.jsx'
import { WarningIcon } from './icons.jsx'
import { formatDate, getCandidateProfile, getProfileSuggestions, saveCandidateProfile } from '../utils/workspace.js'

const LIST_FIELDS = [
  { key: 'experience', label: 'Experience', hint: 'One role or responsibility per line.' },
  { key: 'projects', label: 'Projects', hint: 'One project per line.' },
  { key: 'education', label: 'Education', hint: 'One qualification per line.' },
  { key: 'certifications', label: 'Certifications', hint: 'Only ones you hold.' },
]
const WORK_MODES = ['Remote', 'Hybrid', 'On-site']

const toLines = (list) => (list || []).join('\n')
const fromLines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean)
const fromCommas = (text) => text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)

function toForm(p) {
  return {
    summary: p.summary || '',
    skills: (p.skills || []).join(', '),
    target_roles: (p.target_roles || []).join(', '),
    preferred_locations: (p.preferred_locations || []).join(', '),
    work_modes: p.work_modes || [],
    ...Object.fromEntries(LIST_FIELDS.map(({ key }) => [key, toLines(p[key])])),
  }
}

// The candidate's reviewed profile. Details are proposed from the active
// resume (GET /profile/suggestions never writes); only what the candidate
// saves here is stored, and it's what the fit checks and drafts draw on.
export default function CandidateProfileEditor() {
  const showToast = useToast()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [sectionsFound, setSectionsFound] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCandidateProfile()
      .then((p) => { setProfile(p); setForm(toForm(p)) })
      .catch((err) => setError(err.message))
  }, [])

  const importFromResume = async () => {
    setImporting(true)
    setError(null)
    try {
      const s = await getProfileSuggestions()
      // Fill only what's empty, so nothing the candidate already corrected is overwritten.
      setForm((f) => {
        const next = { ...f }
        const filled = toForm(s)
        Object.keys(filled).forEach((key) => {
          const empty = Array.isArray(next[key]) ? next[key].length === 0 : !next[key].trim()
          if (empty) next[key] = filled[key]
        })
        return next
      })
      setSectionsFound(s.sections_found)
      showToast(`Filled empty fields from ${s.resume.filename}. Review them before saving.`, 'info')
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const saved = await saveCandidateProfile({
        summary: form.summary,
        skills: fromCommas(form.skills),
        target_roles: fromCommas(form.target_roles),
        preferred_locations: fromCommas(form.preferred_locations),
        work_modes: form.work_modes,
        discoverable: false,
        ...Object.fromEntries(LIST_FIELDS.map(({ key }) => [key, fromLines(form[key])])),
      })
      setProfile(saved)
      setForm(toForm(saved))
      showToast('Profile saved', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error && !form) return <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>
  if (!form) return <LoadingBlock rows={2} label="Loading your profile" />

  const bind = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) })
  const toggleMode = (mode) => setForm((f) => ({
    ...f, work_modes: f.work_modes.includes(mode) ? f.work_modes.filter((m) => m !== mode) : [...f.work_modes, mode],
  }))

  return (
    <form onSubmit={save} className="form-grid cols-2">
      <div className="span-all profile-review-bar">
        <p className="form-hint">
          {profile.confirmed
            ? `Last reviewed ${formatDate(profile.confirmed_at)}.`
            : 'Not reviewed yet. Pull in what your resume contains, correct it, then save.'}
          {' '}Private to you: it’s used for your fit checks and drafts, and isn’t shown to recruiters.
        </p>
        <GlassButton variant="secondary" size="sm" loading={importing} loadingText="Reading your resume…" onClick={importFromResume}>
          Fill from my resume
        </GlassButton>
      </div>
      {sectionsFound && (
        <p className="form-hint span-all" role="status">
          {sectionsFound.length > 0
            ? `Sections found in your resume: ${sectionsFound.join(', ')}. Anything under other headings wasn’t picked up; add it by hand.`
            : 'No standard section headings were found in your resume, so only skills could be read. Add the rest by hand.'}
        </p>
      )}

      <GlassInput as="textarea" rows={3} label="Summary" className="span-all" maxLength={2000} {...bind('summary')}
        hint="A few sentences in your own words. Drafts use it as written." />
      <GlassInput label="Skills" className="span-all" {...bind('skills')}
        hint="Comma-separated. Only skills you can talk about in an interview." />
      {LIST_FIELDS.map(({ key, label, hint }) => (
        <GlassInput key={key} as="textarea" rows={4} label={label} hint={hint} {...bind(key)} />
      ))}
      <GlassInput label="Roles you’re looking for" placeholder="e.g. Software engineer intern, QA intern" {...bind('target_roles')} />
      <GlassInput label="Preferred locations" placeholder="e.g. Colombo, Remote" {...bind('preferred_locations')} />
      <fieldset className="span-all profile-modes">
        <legend className="glass-field-label">Work modes you’d accept</legend>
        {WORK_MODES.map((m) => <GlassCheckbox key={m} label={m} checked={form.work_modes.includes(m)} onChange={() => toggleMode(m)} />)}
      </fieldset>

      <div className="form-actions span-all">
        {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
        {/resume/i.test(error || '') && <Link to="/resumes" className="text-link">Upload a resume</Link>}
        <GlassButton type="submit" variant="primary" loading={saving} loadingText="Saving…">Save profile</GlassButton>
      </div>
    </form>
  )
}
