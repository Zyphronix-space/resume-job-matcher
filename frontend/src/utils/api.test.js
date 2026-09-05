import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFileUrl, apiJson, apiUpload } from './api.js'

function mockResponse({ ok = true, status = 200, json = async () => ({}), headers = new Map() } = {}) {
  return { ok, status, json, headers: { get: (k) => headers.get(k) ?? null } }
}

describe('apiJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ json: async () => ({ hello: 'world' }) })))
    const data = await apiJson('/jobs')
    expect(data).toEqual({ hello: 'world' })
  })

  it('throws the backend detail message on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      mockResponse({ ok: false, status: 400, json: async () => ({ detail: 'Job not found' }) }),
    ))
    await expect(apiJson('/jobs/missing')).rejects.toThrow('Job not found')
  })

  it('joins FastAPI validation-error arrays into one message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({
      ok: false, status: 422,
      json: async () => ({ detail: [{ msg: 'field required' }, { msg: 'too short' }] }),
    })))
    await expect(apiJson('/jobs')).rejects.toThrow('field required; too short')
  })

  it('falls back to the provided message when no detail is present', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ ok: false, status: 500, json: async () => ({}) })))
    await expect(apiJson('/jobs', { fallback: 'Could not load jobs' })).rejects.toThrow('Could not load jobs')
  })

  it('returns null for a 204 response without parsing a body', async () => {
    const json = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse({ status: 204, json })))
    const data = await apiJson('/resumes/1')
    expect(data).toBeNull()
    expect(json).not.toHaveBeenCalled()
  })

  it('sends the JSON body and method for a POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse())
    vi.stubGlobal('fetch', fetchMock)
    await apiJson('/jobs', { method: 'POST', body: { title: 'Intern' } })
    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.body).toBe(JSON.stringify({ title: 'Intern' }))
  })
})

describe('apiUpload', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the file as multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ json: async () => ({ id: 'r1' }) }))
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })

    const result = await apiUpload('/resumes', file, 'Could not upload')
    expect(result).toEqual({ id: 'r1' })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('file')).toBe(file)
  })
})

describe('apiFileUrl', () => {
  it('prefixes the path with the configured API base URL', () => {
    expect(apiFileUrl('/resumes/1/file')).toContain('/resumes/1/file')
  })
})
