import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const mockCookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
}

function makeCookiesMock() {
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as never)
}

function makeRequest(body: Record<string, unknown>, method = 'POST') {
  return new NextRequest('http://localhost/api/auth', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    makeCookiesMock()
    delete process.env.ADMIN_PASSWORD
  })

  it('returns 200 and sets cookie when password is correct (env default)', async () => {
    const { POST } = await import('@/app/api/auth/route')
    const res = await POST(makeRequest({ password: 'admin123' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'admin_session',
      'authenticated',
      expect.objectContaining({ httpOnly: true }),
    )
  })

  it('returns 200 when ADMIN_PASSWORD env var is set and matched', async () => {
    process.env.ADMIN_PASSWORD = 'secret99'
    vi.resetModules()
    const { POST } = await import('@/app/api/auth/route')
    const res = await POST(makeRequest({ password: 'secret99' }))
    expect(res.status).toBe(200)
  })

  it('returns 401 when password is wrong', async () => {
    const { POST } = await import('@/app/api/auth/route')
    const res = await POST(makeRequest({ password: 'wrong' }))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
    expect(mockCookieStore.set).not.toHaveBeenCalled()
  })

  it('returns 401 when password is empty string', async () => {
    const { POST } = await import('@/app/api/auth/route')
    const res = await POST(makeRequest({ password: '' }))
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    makeCookiesMock()
  })

  it('deletes session cookie and returns ok', async () => {
    const { DELETE } = await import('@/app/api/auth/route')
    const req = new NextRequest('http://localhost/api/auth', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(mockCookieStore.delete).toHaveBeenCalledWith('admin_session')
  })
})
