import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

async function isAdmin() {
  const store = await cookies()
  return store.get('admin_session')?.value === 'authenticated'
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/tenders/[id]/vendors'>) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: tenderId } = await ctx.params
  const { name, email, category } = await req.json()

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const tender = await prisma.tender.findUnique({ where: { id: tenderId } })
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 })

  const existing = await prisma.vendorInvite.findFirst({
    where: { tenderId, vendor: { email } },
  })
  if (existing) {
    return NextResponse.json({ error: 'This vendor is already invited to this tender' }, { status: 400 })
  }

  const vendor = await prisma.vendor.upsert({
    where: { email },
    update: { name, category: category ?? '' },
    create: { name, email, category: category ?? '' },
  })

  const invite = await prisma.vendorInvite.create({
    data: { tenderId, vendorId: vendor.id },
  })

  return NextResponse.json({ inviteId: invite.id, token: invite.token })
}
