import { afterEach, describe, expect, it, vi } from 'vitest'
import { isOverdue, postingFacts, searchPostings } from './workspace.js'

afterEach(() => vi.restoreAllMocks())

describe('postingFacts', () => {
  it('leaves out anything the source did not state', () => {
    const facts = postingFacts({
      location: 'Colombo', country: 'Sri Lanka', work_mode: 'Unspecified',
      experience_level: 'Graduate', employment_type: 'Unspecified',
    })
    expect(facts).toEqual(['Colombo', 'Graduate'])
  })

  it('falls back to the country when there is no location', () => {
    expect(postingFacts({ location: '', country: 'India', work_mode: 'Remote', experience_level: 'Unspecified' }))
      .toEqual(['India', 'Remote'])
  })
})

describe('isOverdue', () => {
  it('is overdue only after the whole follow-up day has passed', () => {
    const today = new Date()
    const iso = (d) => d.toISOString().slice(0, 10)
    const yesterday = new Date(today.getTime() - 86_400_000)
    const tomorrow = new Date(today.getTime() + 86_400_000)
    expect(isOverdue(iso(yesterday))).toBe(true)
    expect(isOverdue(iso(tomorrow))).toBe(false)
    expect(isOverdue('')).toBe(false)
    expect(isOverdue(null)).toBe(false)
  })
})

describe('searchPostings', () => {
  it('sends only filters that are set', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ total: 0, results: [] }), { status: 200 }),
    )
    await searchPostings({ q: 'python', country: '', open_to_sri_lanka: 'true', sort: '', include_expired: false, limit: 20 })
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/postings')
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'python', open_to_sri_lanka: 'true', limit: '20' })
  })

  it('surfaces the API error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Board unavailable' }), { status: 503 }),
    )
    await expect(searchPostings({})).rejects.toThrow('Board unavailable')
  })
})
