import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GlassBadge from './GlassBadge.jsx'

describe('GlassBadge', () => {
  it('maps known application statuses to a semantic variant', () => {
    render(<GlassBadge status="Shortlisted" />)
    expect(screen.getByText('Shortlisted')).toHaveClass('glass-badge-success')
  })

  it('maps Rejected to the danger variant', () => {
    render(<GlassBadge status="Rejected" />)
    expect(screen.getByText('Rejected')).toHaveClass('glass-badge-danger')
  })

  it('lets an explicit variant override the status mapping', () => {
    render(<GlassBadge status="Applied" variant="warning">Applied</GlassBadge>)
    expect(screen.getByText('Applied')).toHaveClass('glass-badge-warning')
  })

  it('falls back to the default look for an unmapped status', () => {
    render(<GlassBadge status="SomeNewStatus" />)
    const badge = screen.getByText('SomeNewStatus')
    expect(badge).toHaveClass('glass-badge')
    expect(badge.className).not.toMatch(/glass-badge-(success|warning|danger|neutral)/)
  })
})
