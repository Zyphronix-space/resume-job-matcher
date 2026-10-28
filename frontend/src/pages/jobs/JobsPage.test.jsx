import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../components/glass/GlassToast.jsx'
import JobsPage from './JobsPage.jsx'

let mockUser = null
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: mockUser }) }))

const FACETS = { total: 2, open_to_sri_lanka: 1, companies: [{ value: 'Acme', count: 2 }], countries: [], levels: [], employment_types: [], work_modes: [], sources: 1, last_synced_at: null }

function posting(overrides = {}) {
  return {
    id: 'p1', title: 'Graduate Engineer', company: 'Acme', location: 'Colombo', country: 'Sri Lanka',
    work_mode: 'Hybrid', employment_type: 'Unspecified', experience_level: 'Graduate', open_to_sri_lanka: true,
    posted_at: null, last_verified_at: new Date().toISOString(), status: 'active', is_stale: false,
    skills: [], source: { kind: 'greenhouse', name: 'Acme' }, tracked_id: null, skill_overlap: null, ...overrides,
  }
}

function mockApi(results) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const body = String(url).includes('/postings/facets') ? FACETS : { total: results.length, has_resume: false, results }
    return new Response(JSON.stringify(body), { status: 200 })
  })
}

function renderPage(entry = '/openings') {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes><Route path="/openings" element={<JobsPage />} /></Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
}

afterEach(() => { vi.restoreAllMocks(); mockUser = null })

describe('JobsPage', () => {
  it('starts on early-career roles open to Sri Lanka, and says so', async () => {
    mockApi([posting()])
    renderPage()
    expect(await screen.findByText('Graduate Engineer')).toBeInTheDocument()
    expect(screen.getByText(/for early-career applicants in Sri Lanka/)).toBeInTheDocument()
    const call = globalThis.fetch.mock.calls.map(([u]) => String(u)).find((u) => u.includes('/postings?'))
    expect(call).toContain('open_to_sri_lanka=true')
  })

  it('shows an honest empty state instead of filler jobs', async () => {
    mockApi([])
    renderPage('/openings?q=haskell')
    expect(await screen.findByText('No roles match these filters')).toBeInTheDocument()
    expect(screen.getByText(/Only real, currently listed openings are shown/)).toBeInTheDocument()
  })

  it('marks older and no-longer-listed postings', async () => {
    mockApi([posting({ id: 'a', is_stale: true }), posting({ id: 'b', title: 'Closed role', status: 'expired' })])
    renderPage('/openings?all=1')
    expect(await screen.findByText('Posted over 60 days ago')).toBeInTheDocument()
    expect(screen.getByText('No longer listed')).toBeInTheDocument()
  })

  it('offers saving only to signed-in candidates', async () => {
    mockApi([posting()])
    renderPage('/openings?all=1')
    await screen.findByText('Graduate Engineer')
    expect(screen.queryByRole('button', { name: /Save Graduate Engineer/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Create a free account/)).toBeInTheDocument()
  })
})
