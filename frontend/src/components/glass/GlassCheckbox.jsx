import { CheckIcon } from '../icons.jsx'

// Wraps a real (visually-hidden) native checkbox for correct semantics,
// keyboard support, and form behavior — only its appearance is custom.
export default function GlassCheckbox({ checked, onChange, label, className = '', ...rest }) {
  return (
    <label className={`glass-checkbox ${className}`}>
      <input type="checkbox" checked={checked} onChange={onChange} {...rest} />
      <span className="glass-checkbox-box"><CheckIcon size={12} /></span>
      {label && <span className="glass-checkbox-label">{label}</span>}
    </label>
  )
}
