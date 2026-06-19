import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

const mockCookieStore = { get: vi.fn() }

function authedRequest(query: string) {
  return new NextRequest(`http://localhost/api/boq-reference/search?q=${encodeURIComponent(query)}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as never)
  mockCookieStore.get.mockReturnValue({ value: 'authenticated' })
})

describe('GET /api/boq-reference/search', () => {
  it('returns 401 when not authenticated', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { GET } = await import('@/app/api/boq-reference/search/route')
    const res = await GET(authedRequest('brick'))
    expect(res.status).toBe(401)
  })

  it('returns empty array when query is shorter than 2 chars', async () => {
    const { GET } = await import('@/app/api/boq-reference/search/route')
    const res = await GET(authedRequest('b'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    expect(prisma.boqReference.findMany).not.toHaveBeenCalled()
  })

  it('returns empty array for empty query', async () => {
    const { GET } = await import('@/app/api/boq-reference/search/route')
    const res = await GET(authedRequest(''))
    expect(await res.json()).toEqual([])
  })

  it('queries prisma with all search terms as AND conditions', async () => {
    vi.mocked(prisma.boqReference.findMany).mockResolvedValue([])
    const { GET } = await import('@/app/api/boq-reference/search/route')
    await GET(authedRequest('brick wall'))
    expect(prisma.boqReference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { searchText: { contains: 'brick' } },
            { searchText: { contains: 'wall' } },
          ],
        },
      }),
    )
  })

  it('ranks items that start with the first term highest', async () => {
    vi.mocked(prisma.boqReference.findMany).mockResolvedValue([
      { id: '1', itemName: 'Cement Plaster', description: '', uom: 'm2' },
      { id: '2', itemName: 'Cement', description: '', uom: 'bag' },
      { id: '3', itemName: 'White Cement Paint', description: '', uom: 'm2' },
    ])
    const { GET } = await import('@/app/api/boq-reference/search/route')
    const res = await GET(authedRequest('cement'))
    const results = await res.json()
    // "Cement" starts with "cement" and is shorter → should rank first
    expect(results[0].id).toBe('2')
  })

  it('returns at most 12 results', async () => {
    const manyItems = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      itemName: `Item ${i}`,
      description: '',
      uom: 'nos',
    }))
    vi.mocked(prisma.boqReference.findMany).mockResolvedValue(manyItems)
    const { GET } = await import('@/app/api/boq-reference/search/route')
    const res = await GET(authedRequest('item'))
    const results = await res.json()
    expect(results.length).toBeLessThanOrEqual(12)
  })

  it('limits search terms to 6 even if more are provided', async () => {
    vi.mocked(prisma.boqReference.findMany).mockResolvedValue([])
    const { GET } = await import('@/app/api/boq-reference/search/route')
    await GET(authedRequest('a b c d e f g h'))
    const call = vi.mocked(prisma.boqReference.findMany).mock.calls[0][0] as { where: { AND: unknown[] } }
    expect(call.where.AND.length).toBeLessThanOrEqual(6)
  })
})
