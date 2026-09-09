import { ArrowDownIcon } from './icons.jsx'

const SCORE_FLOW = ['Resume PDF', 'Text extraction', 'Sentence embedding', 'Semantic similarity', 'Match score']
const SKILL_FLOW = ['Skill taxonomy', 'Word-boundary matching', 'Matched / missing skills']

function FlowColumn({ title, steps }) {
  return (
    <div className="flow-column">
      <span className="flow-column-title">{title}</span>
      {steps.map((step, i) => (
        <div key={step} className="flow-step-wrap">
          <div className="flow-step">{step}</div>
          {i < steps.length - 1 && <ArrowDownIcon size={14} className="flow-arrow" />}
        </div>
      ))}
    </div>
  )
}

export default function ExplainabilityCard() {
  return (
    <div className="panel explain-card">
      <h2 className="panel-title">How your score works</h2>
      <p className="panel-subtitle">
        This isn't a black box. Here's exactly what happens to your resume and the job description.
      </p>

      <div className="flow-columns">
        <FlowColumn title="Match score" steps={SCORE_FLOW} />
        <FlowColumn title="Skill detection" steps={SKILL_FLOW} />
      </div>
    </div>
  )
}
