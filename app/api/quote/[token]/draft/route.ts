import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/quote/[token]/draft'>) {
  const { token } = await ctx.params
  const invite = await prisma.vendorInvite.findUnique({
    where: { token },
    include: { draft: true, tender: { select: { status: true } } },
  })
  if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (!invite.draft) return NextResponse.json({ draft: null })
  return NextResponse.json({ draft: { ratesJson: invite.draft.ratesJson, savedAt: invite.draft.savedAt } })
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/quote/[token]/draft'>) {
  const { token } = await ctx.params
  const invite = await prisma.vendorInvite.findUnique({
    where: { token },
    include: { tender: { select: { status: true } } },
  })
  if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (invite.tender.status !== 'ACTIVE') return NextResponse.json({ error: 'Tender is not active' }, { status: 400 })

  const { rates } = await req.json()
  if (!Array.isArray(rates)) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  await prisma.quotationDraft.upsert({
    where: { inviteId: invite.id },
    create: { inviteId: invite.id, ratesJson: JSON.stringify(rates) },
    update: { ratesJson: JSON.stringify(rates) },
  })

  return NextResponse.json({ ok: true })
}
