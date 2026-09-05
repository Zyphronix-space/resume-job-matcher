import { describe, expect, it } from 'vitest'
import { interpretScore, SCORE_STATE_CLASS } from './score.js'

describe('interpretScore', () => {
  it('bands scores into the documented ranges', () => {
    expect(interpretScore(95)).toBe('Excellent match')
    expect(interpretScore(90)).toBe('Excellent match')
    expect(interpretScore(89.9)).toBe('Strong match')
    expect(interpretScore(75)).toBe('Strong match')
    expect(interpretScore(60)).toBe('Good potential')
    expect(interpretScore(40)).toBe('Needs improvement')
    expect(interpretScore(39.9)).toBe('Low match')
    expect(interpretScore(0)).toBe('Low match')
  })

  it('every band has a matching CSS class', () => {
    for (const band of ['Excellent match', 'Strong match', 'Good potential', 'Needs improvement', 'Low match']) {
      expect(SCORE_STATE_CLASS[band]).toBeTruthy()
    }
  })
})
