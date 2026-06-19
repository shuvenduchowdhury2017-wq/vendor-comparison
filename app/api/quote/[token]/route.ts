import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, ctx: RouteContext<'/api/quote/[token]'>) {
  const { token } = await ctx.params

  const invite = await prisma.vendorInvite.findUnique({
    where: { token },
    include: { tender: true, quotation: true },
  })

  if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (invite.tender.status !== 'ACTIVE') return NextResponse.json({ error: 'Tender is not active' }, { status: 400 })

  const { items } = await req.json()
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 })
  }

  const itemData = items.map((item: { tenderItemId: string; unitRate: number; amount: number; remarks: string }) => ({
    tenderItemId: item.tenderItemId,
    unitRate: item.unitRate,
    amount: item.amount,
    remarks: item.remarks ?? '',
  }))

  let quotation
  if (invite.quotation) {
    // Re-submission: replace items and bump the revision number (Revision - 0, 1, 2, …)
    await prisma.quotationItem.deleteMany({ where: { quotationId: invite.quotation.id } })
    quotation = await prisma.quotation.update({
      where: { id: invite.quotation.id },
      data: {
        revision: { increment: 1 },
        submittedAt: new Date(),
        items: { create: itemData },
      },
    })
  } else {
    quotation = await prisma.quotation.create({
      data: { inviteId: invite.id, revision: 0, items: { create: itemData } },
    })
  }

  await prisma.vendorInvite.update({ where: { token }, data: { status: 'SUBMITTED' } })

  return NextResponse.json({ quotationId: quotation.id, revision: quotation.revision })
}
