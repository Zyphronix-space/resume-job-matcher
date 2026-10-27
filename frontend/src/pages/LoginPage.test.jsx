import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage.jsx'

const mockLogin = vi.fn()
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({ login: mockLogin }),
}))

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Recruiter dashboard</div>} />
        <Route path="/candidate/dashboard" element={<div>Candidate dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('submits credentials and navigates to the recruiter dashboard on success', async () => {
    mockLogin.mockResolvedValue({ role: 'recruiter' })
    renderLoginPage()

    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'rachel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(mockLogin).toHaveBeenCalledWith('rachel@example.com', 'Password123', true)
    await waitFor(() => expect(screen.getByText('Recruiter dashboard')).toBeInTheDocument())
  })

  it('navigates to the candidate dashboard for a candidate account', async () => {
    mockLogin.mockResolvedValue({ role: 'candidate' })
    renderLoginPage()

    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'cara@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(screen.getByText('Candidate dashboard')).toBeInTheDocument())
  })

  it('shows the backend error message and stays on the page when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Incorrect email or password'))
    renderLoginPage()

    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'rachel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'WrongPassword')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows field errors instead of submitting when the form is incomplete', async () => {
    mockLogin.mockClear()
    renderLoginPage()

    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    const email = screen.getByRole('textbox', { name: 'Email' })
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription(/valid email address/i)
    expect(email).toHaveFocus()
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password.')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('toggles password visibility without submitting the form', async () => {
    mockLogin.mockClear()
    renderLoginPage()

    const password = screen.getByLabelText('Password')
    await userEvent.type(password, 'Secret123')
    expect(password).toHaveAttribute('type', 'password')

    const toggle = screen.getByRole('button', { name: 'Show password' })
    await userEvent.click(toggle)
    expect(password).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(toggle)
    expect(password).toHaveAttribute('type', 'password')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('unchecks remember me and passes that through to login', async () => {
    mockLogin.mockResolvedValue({ role: 'recruiter' })
    renderLoginPage()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Remember me' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Email' }), 'rachel@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Password123')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(mockLogin).toHaveBeenCalledWith('rachel@example.com', 'Password123', false)
  })
})
