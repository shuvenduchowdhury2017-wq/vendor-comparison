import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const mockCookieStore = { get: vi.fn() }

function makeCtx(id: string): Ctx {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(method: string, body?: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tenders', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as never)
  mockCookieStore.get.mockReturnValue({ value: 'authenticated' })
})

// ── GET /api/tenders ─────────────────────────────────────────────────────────

describe('GET /api/tenders', () => {
  it('returns 401 when not authenticated', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { GET } = await import('@/app/api/tenders/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns list of tenders', async () => {
    const fakeTenders = [{ id: 't1', projectName: 'P1', workName: 'W1' }]
    vi.mocked(prisma.tender.findMany).mockResolvedValue(fakeTenders as never)
    const { GET } = await import('@/app/api/tenders/route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(fakeTenders)
  })
})

// ── POST /api/tenders ─────────────────────────────────────────────────────────

describe('POST /api/tenders', () => {
  it('returns 401 when not authenticated', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { POST } = await import('@/app/api/tenders/route')
    const res = await POST(makeRequest('POST', { projectName: 'P', workName: 'W', items: [] }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when projectName is missing', async () => {
    const { POST } = await import('@/app/api/tenders/route')
    const res = await POST(makeRequest('POST', { workName: 'W', items: [] }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing required fields' })
  })

  it('returns 400 when workName is missing', async () => {
    const { POST } = await import('@/app/api/tenders/route')
    const res = await POST(makeRequest('POST', { projectName: 'P', items: [] }))
    expect(res.status).toBe(400)
  })

  it('creates tender and returns id', async () => {
    vi.mocked(prisma.tender.create).mockResolvedValue({ id: 'new-t1' } as never)
    const { POST } = await import('@/app/api/tenders/route')
    const res = await POST(makeRequest('POST', {
      projectName: 'Project A',
      workName: 'Civil Works',
      items: [{ slNo: 1, itemName: 'Brick', description: '', uom: 'nos', quantity: 100, remarks: '' }],
    }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'new-t1' })
  })

  it('defaults numeric/boolean fields when omitted', async () => {
    vi.mocked(prisma.tender.create).mockResolvedValue({ id: 't1' } as never)
    const { POST } = await import('@/app/api/tenders/route')
    await POST(makeRequest('POST', { projectName: 'P', workName: 'W', items: [] }))
    expect(prisma.tender.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          retentionPercent: 0,
          tdsApplicable: false,
          labourCessApplicable: false,
          otherTerms: '',
        }),
      }),
    )
  })
})

// ── GET /api/tenders/[id] ────────────────────────────────────────────────────

describe('GET /api/tenders/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { GET } = await import('@/app/api/tenders/[id]/route')
    const res = await GET(makeRequest('GET'), makeCtx('t1'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when tender not found', async () => {
    vi.mocked(prisma.tender.findUnique).mockResolvedValue(null)
    const { GET } = await import('@/app/api/tenders/[id]/route')
    const res = await GET(makeRequest('GET'), makeCtx('missing'))
    expect(res.status).toBe(404)
  })

  it('returns tender data', async () => {
    const fakeTender = { id: 't1', projectName: 'P', items: [], invites: [] }
    vi.mocked(prisma.tender.findUnique).mockResolvedValue(fakeTender as never)
    const { GET } = await import('@/app/api/tenders/[id]/route')
    const res = await GET(makeRequest('GET'), makeCtx('t1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(fakeTender)
  })
})

// ── PATCH /api/tenders/[id] ───────────────────────────────────────────────────

describe('PATCH /api/tenders/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { PATCH } = await import('@/app/api/tenders/[id]/route')
    const res = await PATCH(makeRequest('PATCH', { status: 'ACTIVE' }), makeCtx('t1'))
    expect(res.status).toBe(401)
  })

  it('updates tender and returns updated record', async () => {
    const updated = { id: 't1', status: 'ACTIVE' }
    vi.mocked(prisma.tender.update).mockResolvedValue(updated as never)
    const { PATCH } = await import('@/app/api/tenders/[id]/route')
    const res = await PATCH(makeRequest('PATCH', { status: 'ACTIVE' }), makeCtx('t1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(updated)
  })
})

// ── DELETE /api/tenders/[id] ──────────────────────────────────────────────────

describe('DELETE /api/tenders/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { DELETE } = await import('@/app/api/tenders/[id]/route')
    const res = await DELETE(makeRequest('DELETE'), makeCtx('t1'))
    expect(res.status).toBe(401)
  })

  it('deletes tender and returns ok', async () => {
    vi.mocked(prisma.tender.delete).mockResolvedValue({} as never)
    const { DELETE } = await import('@/app/api/tenders/[id]/route')
    const res = await DELETE(makeRequest('DELETE'), makeCtx('t1'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(prisma.tender.delete).toHaveBeenCalledWith({ where: { id: 't1' } })
  })
})
