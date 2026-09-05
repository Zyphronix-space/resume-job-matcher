// Wraps a plain <table> (columns/rows stay as normal JSX children) with the
// glass surface + the table->card responsive behavior. Cells that should
// collapse to "label: value" rows on mobile need a data-label attribute —
// same convention the rest of the app already uses.
export default function GlassTable({ responsive = true, className = '', children }) {
  const classes = ['glass-table-wrap', responsive && 'is-responsive', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      <table className="glass-table">{children}</table>
    </div>
  )
}
