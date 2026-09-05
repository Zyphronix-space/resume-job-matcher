export default function GlassCard({
  as: Component = 'div', title, subtitle, actions, interactive = false, flush = false,
  className = '', children, ...rest
}) {
  const classes = ['glass-card', interactive && 'is-interactive', flush && 'is-flush', className].filter(Boolean).join(' ')

  return (
    <Component className={classes} {...rest}>
      {(title || actions) && (
        <div className="glass-card-header">
          <div>
            {title && <h2 className="glass-card-title">{title}</h2>}
            {subtitle && <p className="glass-card-subtitle">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {!title && subtitle && <p className="glass-card-subtitle" style={{ marginBottom: '1rem' }}>{subtitle}</p>}
      {children}
    </Component>
  )
}
