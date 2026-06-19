import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ token: string }> }

function makeCtx(token: string): Ctx {
  return { params: Promise.resolve({ token }) }
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/quote/tok', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const sampleItems = [
  { tenderItemId: 'item1', unitRate: 100, amount: 1000, remarks: '' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/quote/[token]', () => {
  it('returns 404 for unknown token', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue(null)
    const { POST } = await import('@/app/api/quote/[token]/route')
    const res = await POST(makeRequest({ items: sampleItems }), makeCtx('bad-token'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Invalid link' })
  })

  it('returns 400 when tender is not ACTIVE', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'DRAFT' },
      quotation: null,
    } as never)
    const { POST } = await import('@/app/api/quote/[token]/route')
    const res = await POST(makeRequest({ items: sampleItems }), makeCtx('tok'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Tender is not active' })
  })

  it('returns 400 when items array is empty', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'ACTIVE' },
      quotation: null,
    } as never)
    const { POST } = await import('@/app/api/quote/[token]/route')
    const res = await POST(makeRequest({ items: [] }), makeCtx('tok'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'No items provided' })
  })

  it('returns 400 when items is not an array', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'ACTIVE' },
      quotation: null,
    } as never)
    const { POST } = await import('@/app/api/quote/[token]/route')
    const res = await POST(makeRequest({ items: 'not-an-array' }), makeCtx('tok'))
    expect(res.status).toBe(400)
  })

  it('creates a new quotation (revision 0) on first submission', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'ACTIVE' },
      quotation: null,
    } as never)
    vi.mocked(prisma.quotation.create).mockResolvedValue({ id: 'q1', revision: 0 } as never)
    vi.mocked(prisma.vendorInvite.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/quote/[token]/route')
    const res = await POST(makeRequest({ items: sampleItems }), makeCtx('tok'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.revision).toBe(0)
    expect(prisma.quotation.create).toHaveBeenCalledTimes(1)
    expect(prisma.quotationItem.deleteMany).not.toHaveBeenCalled()
  })

  it('replaces items and increments revision on re-submission', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'ACTIVE' },
      quotation: { id: 'q1', revision: 0 },
    } as never)
    vi.mocked(prisma.quotationItem.deleteMany).mockResolvedValue({} as never)
    vi.mocked(prisma.quotation.update).mockResolvedValue({ id: 'q1', revision: 1 } as never)
    vi.mocked(prisma.vendorInvite.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/quote/[token]/route')
    const res = await POST(makeRequest({ items: sampleItems }), makeCtx('tok'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.revision).toBe(1)
    expect(prisma.quotationItem.deleteMany).toHaveBeenCalledWith({ where: { quotationId: 'q1' } })
    expect(prisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'q1' }, data: expect.objectContaining({ revision: { increment: 1 } }) }),
    )
  })

  it('marks the invite as SUBMITTED after successful submission', async () => {
    vi.mocked(prisma.vendorInvite.findUnique).mockResolvedValue({
      id: 'inv1',
      tender: { status: 'ACTIVE' },
      quotation: null,
    } as never)
    vi.mocked(prisma.quotation.create).mockResolvedValue({ id: 'q1', revision: 0 } as never)
    vi.mocked(prisma.vendorInvite.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/quote/[token]/route')
    await POST(makeRequest({ items: sampleItems }), makeCtx('tok'))
    expect(prisma.vendorInvite.update).toHaveBeenCalledWith({
      where: { token: 'tok' },
      data: { status: 'SUBMITTED' },
    })
  })
})
