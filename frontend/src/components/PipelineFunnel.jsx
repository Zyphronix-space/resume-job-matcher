const COLORS = ['var(--accent-violet)', 'var(--accent)', 'var(--accent-blue)', 'var(--success)']

// A stacked-segment bar showing relative share of each pipeline stage —
// purely a presentation of the real counts passed in, no separate
// computation.
export default function PipelineFunnel({ pipeline }) {
  const entries = Object.entries(pipeline)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  return (
    <div>
      <div className="pipeline-funnel-bar">
        {total > 0 ? (
          entries.map(([stage, count]) => (
            <div
              key={stage}
              className="pipeline-funnel-segment"
              style={{ flexBasis: `${(count / total) * 100}%` }}
              title={`${stage}: ${count}`}
            />
          ))
        ) : (
          <div className="pipeline-funnel-segment is-empty" style={{ flexBasis: '100%' }} />
        )}
      </div>
      <div className="pipeline-funnel-legend">
        {entries.map(([stage, count], i) => (
          <span className="pipeline-funnel-legend-item" key={stage}>
            <span className="pipeline-funnel-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
            {stage} ({count})
          </span>
        ))}
      </div>
    </div>
  )
}
