import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

async function isAdmin() {
  const store = await cookies()
  return store.get('admin_session')?.value === 'authenticated'
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/tenders/[id]/invites/[inviteId]'>) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { inviteId } = await ctx.params
  await prisma.vendorInvite.delete({ where: { id: inviteId } })
  return NextResponse.json({ ok: true })
}
