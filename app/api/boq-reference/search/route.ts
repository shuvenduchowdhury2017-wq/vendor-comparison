import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

async function isAdmin() {
  const store = await cookies()
  return store.get('admin_session')?.value === 'authenticated'
}

const RESULT_LIMIT = 12
const FETCH_LIMIT = 60

export async function GET(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()
  if (q.length < 2) return NextResponse.json([])

  // Match rows where every search term appears in the combined name+description text.
  const terms = q.split(/\s+/).filter(Boolean).slice(0, 6)
  const matches = await prisma.boqReference.findMany({
    where: { AND: terms.map((t) => ({ searchText: { contains: t } })) },
    select: { id: true, itemName: true, description: true, uom: true },
    take: FETCH_LIMIT,
    orderBy: { itemName: 'asc' },
  })

  // Rank: item-name matches first, then shorter names (more generic), then alpha.
  const firstTerm = terms[0] ?? ''
  const scored = matches
    .map((m) => {
      const name = m.itemName.toLowerCase()
      let score = 0
      if (name.startsWith(firstTerm)) score += 4
      if (name.includes(q)) score += 3
      if (terms.every((t) => name.includes(t))) score += 2
      return { m, score }
    })
    .sort((a, b) => b.score - a.score || a.m.itemName.length - b.m.itemName.length)
    .slice(0, RESULT_LIMIT)
    .map(({ m }) => m)

  return NextResponse.json(scored)
}
