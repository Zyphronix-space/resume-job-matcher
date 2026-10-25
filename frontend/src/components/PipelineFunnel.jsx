// Stages are ordered, so they get one hue that deepens as candidates move
// forward rather than unrelated colors.
const COLORS = [
  'color-mix(in srgb, var(--accent) 28%, var(--surface))',
  'color-mix(in srgb, var(--accent) 52%, var(--surface))',
  'color-mix(in srgb, var(--accent) 76%, var(--surface))',
  'var(--accent)',
]

// A stacked-segment bar showing relative share of each pipeline stage,
// purely a presentation of the real counts passed in.
export default function PipelineFunnel({ pipeline }) {
  const entries = Object.entries(pipeline)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)

  return (
    <div>
      <div
        className="pipeline-funnel-bar"
        role="img"
        aria-label={total > 0 ? entries.map(([stage, count]) => `${stage}: ${count}`).join(', ') : 'No applications in the pipeline yet'}
      >
        {total > 0 ? (
          entries.filter(([, count]) => count > 0).map(([stage, count]) => (
            <div
              key={stage}
              className="pipeline-funnel-segment"
              style={{ flexBasis: `${(count / total) * 100}%`, background: COLORS[entries.findIndex(([s]) => s === stage) % COLORS.length] }}
            />
          ))
        ) : (
          <div className="pipeline-funnel-segment is-empty" style={{ flexBasis: '100%' }} />
        )}
      </div>
      <div className="pipeline-funnel-legend" aria-hidden="true">
        {entries.map(([stage, count], i) => (
          <span className="pipeline-funnel-legend-item" key={stage}>
            <span className="pipeline-funnel-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
            {stage} <strong>{count}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
