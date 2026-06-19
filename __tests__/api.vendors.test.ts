import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const mockCookieStore = { get: vi.fn() }

function makeCtx(id: string): Ctx {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/tenders/t1/vendors', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as never)
  mockCookieStore.get.mockReturnValue({ value: 'authenticated' })
})

describe('POST /api/tenders/[id]/vendors', () => {
  it('returns 401 when not authenticated', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { POST } = await import('@/app/api/tenders/[id]/vendors/route')
    const res = await POST(makeRequest({ name: 'Acme', email: 'a@b.com' }), makeCtx('t1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const { POST } = await import('@/app/api/tenders/[id]/vendors/route')
    const res = await POST(makeRequest({ email: 'a@b.com' }), makeCtx('t1'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Name and email are required' })
  })

  it('returns 400 when email is missing', async () => {
    const { POST } = await import('@/app/api/tenders/[id]/vendors/route')
    const res = await POST(makeRequest({ name: 'Acme' }), makeCtx('t1'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when tender does not exist', async () => {
    vi.mocked(prisma.tender.findUnique).mockResolvedValue(null)
    const { POST } = await import('@/app/api/tenders/[id]/vendors/route')
    const res = await POST(makeRequest({ name: 'Acme', email: 'a@b.com' }), makeCtx('t1'))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Tender not found' })
  })

  it('returns 400 when vendor is already invited to this tender', async () => {
    vi.mocked(prisma.tender.findUnique).mockResolvedValue({ id: 't1' } as never)
    vi.mocked(prisma.vendorInvite.findFirst).mockResolvedValue({ id: 'inv1' } as never)
    const { POST } = await import('@/app/api/tenders/[id]/vendors/route')
    const res = await POST(makeRequest({ name: 'Acme', email: 'a@b.com' }), makeCtx('t1'))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'This vendor is already invited to this tender' })
  })

  it('creates vendor via upsert and returns invite token on success', async () => {
    vi.mocked(prisma.tender.findUnique).mockResolvedValue({ id: 't1' } as never)
    vi.mocked(prisma.vendorInvite.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.vendor.upsert).mockResolvedValue({ id: 'v1' } as never)
    vi.mocked(prisma.vendorInvite.create).mockResolvedValue({ id: 'inv1', token: 'abc-token' } as never)

    const { POST } = await import('@/app/api/tenders/[id]/vendors/route')
    const res = await POST(makeRequest({ name: 'Acme', email: 'a@b.com', category: 'Civil' }), makeCtx('t1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ inviteId: 'inv1', token: 'abc-token' })
    expect(prisma.vendor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'a@b.com' },
        update: { name: 'Acme', category: 'Civil' },
        create: { name: 'Acme', email: 'a@b.com', category: 'Civil' },
      }),
    )
  })

  it('defaults category to empty string when not provided', async () => {
    vi.mocked(prisma.tender.findUnique).mockResolvedValue({ id: 't1' } as never)
    vi.mocked(prisma.vendorInvite.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.vendor.upsert).mockResolvedValue({ id: 'v1' } as never)
    vi.mocked(prisma.vendorInvite.create).mockResolvedValue({ id: 'inv1', token: 'tok' } as never)

    const { POST } = await import('@/app/api/tenders/[id]/vendors/route')
    await POST(makeRequest({ name: 'Acme', email: 'a@b.com' }), makeCtx('t1'))
    expect(prisma.vendor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ category: '' }) }),
    )
  })
})
