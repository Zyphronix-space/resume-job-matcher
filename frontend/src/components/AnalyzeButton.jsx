import { MatchIcon } from './icons.jsx'

export default function AnalyzeButton({ disabled, onClick }) {
  return (
    <button type="button" className="analyze-btn" disabled={disabled} onClick={onClick}>
      <MatchIcon size={19} className="analyze-btn-icon" />
      Analyze match
    </button>
  )
}
