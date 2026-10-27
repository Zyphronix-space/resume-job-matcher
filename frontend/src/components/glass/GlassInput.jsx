import { useId } from 'react'
import { WarningIcon } from '../icons.jsx'

// A labeled field. `as` picks the control: 'input' (default) or 'textarea'.
// The label, hint, and error are tied to the control with for/id and
// aria-describedby, and an error sets aria-invalid, so screen readers
// announce what's wrong with the field they're on. `labelAside` renders
// next to the label but outside it (e.g. a "Forgot password?" link), so it
// doesn't become part of the field's accessible name.
export default function GlassInput({
  as = 'input', label, hint, error, labelAside, className = '', style, id, children, control, ...rest
}) {
  const autoId = useId()
  const fieldId = id || autoId
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`
  const describedBy = [hint && !error && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  const Control = as

  const controlProps = {
    id: fieldId,
    className: 'glass-field-control',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    ...rest,
  }

  return (
    <div className={`glass-field ${className}`} style={style}>
      {label && (
        <div className="glass-field-label-row">
          <label className="glass-field-label" htmlFor={fieldId}>{label}</label>
          {labelAside}
        </div>
      )}
      {control ? control(controlProps) : <Control {...controlProps}>{children}</Control>}
      {hint && !error && <span className="glass-field-hint" id={hintId}>{hint}</span>}
      {error && (
        <span className="glass-field-error" id={errorId}>
          <WarningIcon size={14} />
          {error}
        </span>
      )}
    </div>
  )
}
