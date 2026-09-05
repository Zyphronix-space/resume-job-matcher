import { describe, expect, it } from 'vitest'
import { skillLabel } from './skillLabel.js'

describe('skillLabel', () => {
  it('uses curated overrides for known acronyms/brand names', () => {
    expect(skillLabel('javascript')).toBe('JavaScript')
    expect(skillLabel('aws')).toBe('AWS')
    expect(skillLabel('node.js')).toBe('Node.js')
    expect(skillLabel('ci/cd')).toBe('CI/CD')
  })

  it('falls back to capitalizing the first letter for unknown skills', () => {
    expect(skillLabel('python')).toBe('Python')
    expect(skillLabel('docker')).toBe('Docker')
  })

  it('never mutates the underlying taxonomy key used for matching', () => {
    const key = 'python'
    skillLabel(key)
    expect(key).toBe('python')
  })
})
