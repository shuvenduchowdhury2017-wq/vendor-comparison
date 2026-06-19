import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

async function isAdmin() {
  const store = await cookies()
  return store.get('admin_session')?.value === 'authenticated'
}

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/tenders/[id]'>) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const tender = await prisma.tender.findUnique({
    where: { id },
    include: { items: { orderBy: { slNo: 'asc' } }, invites: { include: { vendor: true, quotation: { include: { items: true } } } } },
  })
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(tender)
}

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/tenders/[id]'>) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json()
  const tender = await prisma.tender.update({ where: { id }, data: body })
  return NextResponse.json(tender)
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/tenders/[id]'>) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  await prisma.tender.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
