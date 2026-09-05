export default function GlassEmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="glass-empty-state">
      {icon && <span className="glass-empty-state-icon">{icon}</span>}
      <p className="glass-empty-state-title">{title}</p>
      {subtitle && <p className="glass-empty-state-subtitle">{subtitle}</p>}
      {action}
    </div>
  )
}
