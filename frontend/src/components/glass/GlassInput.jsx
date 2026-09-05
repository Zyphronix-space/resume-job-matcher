// A labeled glass field. `as` picks the control: 'input' (default),
// 'textarea', or 'select' (pass <option>s as children).
export default function GlassInput({
  as = 'input', label, hint, error, className = '', children, ...rest
}) {
  const Control = as
  return (
    <label className={`glass-field ${className}`}>
      {label && <span className="glass-field-label">{label}</span>}
      <Control className="glass-field-control" {...rest}>{children}</Control>
      {hint && !error && <span className="glass-field-hint">{hint}</span>}
      {error && <span className="glass-field-error">{error}</span>}
    </label>
  )
}
