import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import GlassButton from './GlassButton.jsx'

describe('GlassButton', () => {
  it('renders a native button by default and fires onClick', async () => {
    const onClick = vi.fn()
    render(<GlassButton onClick={onClick}>Save</GlassButton>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('applies the variant class', () => {
    render(<GlassButton variant="danger">Delete</GlassButton>)
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('glass-btn-danger')
  })

  it('is disabled and inert when disabled is set', async () => {
    const onClick = vi.fn()
    render(<GlassButton disabled onClick={onClick}>Save</GlassButton>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders as a router Link when given `as`, without a button type attribute', () => {
    render(
      <MemoryRouter>
        <GlassButton as={Link} to="/jobs">Go to jobs</GlassButton>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Go to jobs' })
    expect(link).toHaveAttribute('href', '/jobs')
    expect(link).not.toHaveAttribute('type')
  })
})
