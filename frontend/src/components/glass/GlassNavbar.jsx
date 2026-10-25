export default function GlassNavbar({ title, brand, actions }) {
  return (
    <div className="glass-navbar-wrap">
      <header className="glass-navbar">
        {brand && <div className="glass-navbar-mobile-brand">{brand}</div>}
        {title && <span className="glass-navbar-title">{title}</span>}
        {actions && <div className="glass-navbar-actions">{actions}</div>}
      </header>
    </div>
  )
}
