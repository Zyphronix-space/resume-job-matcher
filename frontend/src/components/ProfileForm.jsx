import { useState } from 'react'
import GlassButton from './glass/GlassButton.jsx'
import GlassInput from './glass/GlassInput.jsx'
import { WarningIcon } from './icons.jsx'
import { useToast } from './glass/GlassToast.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { updateProfile } from '../utils/auth.js'

// Shared by the candidate Profile page and the recruiter section of
// Settings, which previously each kept their own copy of this form.
export default function ProfileForm({ headlinePlaceholder }) {
  const { user, updateUser } = useAuth()
  const showToast = useToast()
  const [fields, setFields] = useState({
    fullName: user.full_name || '',
    phone: user.phone || '',
    location: user.location || '',
    headline: user.headline || '',
    linkedin: user.links?.linkedin || '',
    github: user.links?.github || '',
    portfolio: user.links?.portfolio || '',
  })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const bind = (key) => ({ value: fields[key], onChange: (e) => setFields((f) => ({ ...f, [key]: e.target.value })) })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const updated = await updateProfile({
        full_name: fields.fullName,
        phone: fields.phone,
        location: fields.location,
        headline: fields.headline,
        links: { linkedin: fields.linkedin, github: fields.github, portfolio: fields.portfolio },
      })
      updateUser(updated)
      showToast('Profile saved', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid cols-2">
      <GlassInput label="Full name" autoComplete="name" {...bind('fullName')} />
      <GlassInput label="Headline" placeholder={headlinePlaceholder} {...bind('headline')} />
      <GlassInput label="Phone" type="tel" autoComplete="tel" {...bind('phone')} />
      <GlassInput label="Location" autoComplete="address-level2" {...bind('location')} />
      <GlassInput label="LinkedIn" inputMode="url" placeholder="https://linkedin.com/in/…" {...bind('linkedin')} />
      <GlassInput label="GitHub" inputMode="url" placeholder="https://github.com/…" {...bind('github')} />
      <GlassInput label="Portfolio" inputMode="url" placeholder="https://…" {...bind('portfolio')} />

      <div className="form-actions span-all">
        {error && <p className="field-error" role="alert"><WarningIcon size={15} />{error}</p>}
        <GlassButton type="submit" variant="primary" loading={saving} loadingText="Saving…">Save profile</GlassButton>
      </div>
    </form>
  )
}
