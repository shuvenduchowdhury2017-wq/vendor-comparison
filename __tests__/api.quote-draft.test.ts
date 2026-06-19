import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ token: string }> }

function makeCtx(token: string): Ctx {
  return { params: Promise.resolve({ token }) }
}

function makeGetRequest() {
  return new NextRequest('http://localhost/api/quote/tok/draft')
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/quote/tok/draft', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/quote/[token]/draft', () => {
  it('returns 404 for unknown token', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue(null)
    const { GET } = await import('@/app/api/quote/[token]/draft/route')
    const res = await GET(makeGetRequest(), makeCtx('bad'))
    expect(res.status).toBe(404)
  })

  it('returns { draft: null } when no draft exists yet', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      draft: null,
      tender: { status: 'ACTIVE' },
    } as never)
    const { GET } = await import('@/app/api/quote/[token]/draft/route')
    const res = await GET(makeGetRequest(), makeCtx('tok'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ draft: null })
  })

  it('returns saved draft when one exists', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      draft: { ratesJson: '[{"id":"item1","rate":500}]', savedAt: '2024-01-01T00:00:00.000Z' },
      tender: { status: 'ACTIVE' },
    } as never)
    const { GET } = await import('@/app/api/quote/[token]/draft/route')
    const res = await GET(makeGetRequest(), makeCtx('tok'))
    const body = await res.json()
    expect(body.draft.ratesJson).toBe('[{"id":"item1","rate":500}]')
  })
})

describe('POST /api/quote/[token]/draft', () => {
  it('returns 404 for unknown token', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue(null)
    const { POST } = await import('@/app/api/quote/[token]/draft/route')
    const res = await POST(makePostRequest({ rates: [] }), makeCtx('bad'))
    expect(res.status).toBe(404)
  })

  it('returns 400 when tender is not ACTIVE', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'CLOSED' },
    } as never)
    const { POST } = await import('@/app/api/quote/[token]/draft/route')
    const res = await POST(makePostRequest({ rates: [{ id: 'i1', rate: 100 }] }), makeCtx('tok'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Tender is not active' })
  })

  it('returns 400 when rates is not an array', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'ACTIVE' },
    } as never)
    const { POST } = await import('@/app/api/quote/[token]/draft/route')
    const res = await POST(makePostRequest({ rates: 'bad' }), makeCtx('tok'))
    expect(res.status).toBe(400)
  })

  it('upserts draft and returns ok on success', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'ACTIVE' },
    } as never)
    vi.mocked(prisma.quotationDraft.upsert).mockResolvedValue({} as never)
    const rates = [{ id: 'item1', rate: 500 }]

    const { POST } = await import('@/app/api/quote/[token]/draft/route')
    const res = await POST(makePostRequest({ rates }), makeCtx('tok'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(prisma.quotationDraft.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { inviteId: 'inv1' },
        create: expect.objectContaining({ ratesJson: JSON.stringify(rates) }),
        update: expect.objectContaining({ ratesJson: JSON.stringify(rates) }),
      }),
    )
  })
})
