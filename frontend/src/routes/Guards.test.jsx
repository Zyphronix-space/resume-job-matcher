import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAdmin, RequireAuth, RequireRole } from './Guards.jsx'

const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderWithGuard(Guard, guardProps, { startAt = '/protected' } = {}) {
  return render(
    <MemoryRouter initialEntries={[startAt]}>
      <Routes>
        <Route element={<Guard {...guardProps} />}>
          <Route path="/protected" element={<div>Secret content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/dashboard" element={<div>Recruiter home</div>} />
        <Route path="/candidate/dashboard" element={<div>Candidate home</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('renders nothing while the session is still loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })
    const { container } = renderWithGuard(RequireAuth)
    expect(container).toBeEmptyDOMElement()
  })

  it('redirects to /login when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    renderWithGuard(RequireAuth)
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders the protected route when signed in', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'recruiter' }, loading: false })
    renderWithGuard(RequireAuth)
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })
})

describe('RequireRole', () => {
  it('lets a matching role through', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'recruiter' }, loading: false })
    renderWithGuard(RequireRole, { role: 'recruiter' })
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })

  it('bounces a candidate away from a recruiter-only route to their own home', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'candidate' }, loading: false })
    renderWithGuard(RequireRole, { role: 'recruiter' })
    expect(screen.getByText('Candidate home')).toBeInTheDocument()
  })
})

describe('RequireAdmin', () => {
  it('lets an admin through', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'recruiter', is_admin: true }, loading: false })
    renderWithGuard(RequireAdmin)
    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })

  it('bounces a non-admin to their role home', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'candidate', is_admin: false }, loading: false })
    renderWithGuard(RequireAdmin)
    expect(screen.getByText('Candidate home')).toBeInTheDocument()
  })
})
