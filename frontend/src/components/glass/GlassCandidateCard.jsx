import GlassBadge from './GlassBadge.jsx'

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
}

export default function GlassCandidateCard({ name, meta, score, status, actions, onClick }) {
  return (
    <div className="glass-candidate-card" onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="glass-candidate-card-identity">
        <span className="glass-candidate-avatar">{initials(name)}</span>
        <div style={{ minWidth: 0 }}>
          <div className="glass-candidate-name">{name}</div>
          {meta && <div className="glass-candidate-meta">{meta}</div>}
        </div>
      </div>

      {score !== undefined && (
        <div className="glass-candidate-score">
          <span className="glass-candidate-score-value">{Math.round(score)}%</span>
          <span className="glass-candidate-score-label">match</span>
        </div>
      )}

      {status && <GlassBadge status={status} />}

      {actions && <div className="glass-candidate-actions">{actions}</div>}
    </div>
  )
}
