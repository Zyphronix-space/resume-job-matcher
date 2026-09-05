export function GlassMetricGrid({ children }) {
  return <div className="glass-metric-grid">{children}</div>
}

export default function GlassMetric({ label, value, trend }) {
  return (
    <div className="glass-metric">
      <span className="glass-metric-label">{label}</span>
      <span className="glass-metric-value">{value}</span>
      {trend && <span className="glass-metric-trend">{trend}</span>}
    </div>
  )
}
