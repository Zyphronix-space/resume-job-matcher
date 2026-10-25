import GlassBadge from './GlassBadge.jsx'
import ScoreMeter from '../ScoreMeter.jsx'

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?'
}

export default function GlassCandidateCard({ name, meta, score, status, actions }) {
  return (
    <div className="glass-candidate-card">
      <div className="glass-candidate-card-identity">
        <span className="glass-candidate-avatar" aria-hidden="true">{initials(name)}</span>
        <div style={{ minWidth: 0 }}>
          <div className="glass-candidate-name">{name}</div>
          {meta && <div className="glass-candidate-meta">{meta}</div>}
        </div>
      </div>

      {score !== undefined && <ScoreMeter score={score} />}

      {status && <GlassBadge status={status} />}

      {actions && <div className="glass-candidate-actions">{actions}</div>}
    </div>
  )
}
