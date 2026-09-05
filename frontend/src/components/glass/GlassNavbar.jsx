export default function GlassNavbar({ title, actions }) {
  return (
    <div className="glass-navbar-wrap">
      <header className="glass-navbar">
        {title && <span className="glass-navbar-title">{title}</span>}
        {actions && <div className="glass-navbar-actions">{actions}</div>}
      </header>
    </div>
  )
}
