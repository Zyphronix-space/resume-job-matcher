import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import GlassCheckbox from './GlassCheckbox.jsx'

describe('GlassCheckbox', () => {
  it('renders a real, accessible checkbox reflecting the checked prop', () => {
    render(<GlassCheckbox checked label="Remember me" onChange={() => {}} />)
    const checkbox = screen.getByRole('checkbox', { name: 'Remember me' })
    expect(checkbox).toBeChecked()
  })

  it('fires onChange when clicked, like a native checkbox', async () => {
    const onChange = vi.fn()
    render(<GlassCheckbox checked={false} label="Select" onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select' }))
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('works without a visible label via aria-label', () => {
    render(<GlassCheckbox checked={false} onChange={() => {}} aria-label="Select candidate" />)
    expect(screen.getByRole('checkbox', { name: 'Select candidate' })).toBeInTheDocument()
  })
})
