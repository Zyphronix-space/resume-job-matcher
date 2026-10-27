// The one page-title pattern for every signed-in screen: a left-aligned
// title, an optional sentence of context, and the page's own actions on
// the right. `meta` is for small facts that sit under the title (location,
// status badge) on detail pages.
export default function PageHeader({ title, description, meta, actions }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1 className="page-title">{title}</h1>
        {meta && <div className="page-meta">{meta}</div>}
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}
