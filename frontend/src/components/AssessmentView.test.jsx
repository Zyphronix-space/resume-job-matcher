import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AssessmentView from './AssessmentView.jsx'

const ASSESSMENT = {
  resume: { id: 'r1', filename: 'my-cv.pdf', version: 2 },
  summary: '1 of the 2 skills this posting names appear in your resume.',
  match_score: 48,
  matched_skills: ['python'],
  missing_skills: ['kubernetes'],
  skill_importance: {},
  skill_evidence: {},
  skill_categories: {},
  skill_gap_roadmap: [],
  requirements: [
    { text: 'Experience with Python', status: 'met', skills_found: ['python'], skills_missing: [], evidence: [{ skill: 'python', snippet: 'Built a Python service' }], note: '' },
    { text: 'Kubernetes in production', status: 'not_found', skills_found: [], skills_missing: ['kubernetes'], evidence: [], note: '' },
    { text: '3+ years of experience', status: 'check', skills_found: [], skills_missing: [], evidence: [], note: 'Only you can confirm this.' },
  ],
  requirement_counts: { met: 1, partial: 0, not_found: 1, check: 1 },
  suggestions: [{ section: 'Work Experience or Projects', priority: 'High', text: 'If you have used Kubernetes, add a specific example.' }],
  method: ['No hiring outcome is predicted, and no score is adjusted to look better.'],
}

describe('AssessmentView', () => {
  it('names the resume it compared and shows every requirement with its status', () => {
    render(<AssessmentView assessment={ASSESSMENT} />)
    expect(screen.getByText('my-cv.pdf')).toBeInTheDocument()
    expect(screen.getByText('Experience with Python')).toBeInTheDocument()
    expect(screen.getByText('Shown in resume')).toBeInTheDocument()
    expect(screen.getByText('Not found')).toBeInTheDocument()
    expect(screen.getByText('“Built a Python service”')).toBeInTheDocument()
  })

  it('leaves unverifiable requirements for the candidate to judge instead of scoring them', () => {
    render(<AssessmentView assessment={ASSESSMENT} />)
    expect(screen.getByText('For you to check')).toBeInTheDocument()
    expect(screen.getByText('Only you can confirm this.')).toBeInTheDocument()
    expect(screen.getByText(/1 shown, 0 partly shown, 1 not found, and 1 for you to check yourself/)).toBeInTheDocument()
  })

  it('explains how the assessment is produced', () => {
    render(<AssessmentView assessment={ASSESSMENT} />)
    expect(screen.getByText('How this assessment is produced')).toBeInTheDocument()
    expect(screen.getByText(/No hiring outcome is predicted/)).toBeInTheDocument()
  })
})
