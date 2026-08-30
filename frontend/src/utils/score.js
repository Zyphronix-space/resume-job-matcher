// Shared score-band interpretation. These bands are UI language, not a
// scientifically derived scale — used to color and label both the semantic
// match score and skill coverage consistently across the app.

export function interpretScore(score) {
  if (score >= 90) return 'Excellent match'
  if (score >= 75) return 'Strong match'
  if (score >= 60) return 'Good potential'
  if (score >= 40) return 'Needs improvement'
  return 'Low match'
}

export const SCORE_STATE_CLASS = {
  'Excellent match': 'score-state-excellent',
  'Strong match': 'score-state-strong',
  'Good potential': 'score-state-good',
  'Needs improvement': 'score-state-needs-improvement',
  'Low match': 'score-state-low',
}
