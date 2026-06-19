import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

async function isAdmin() {
  const store = await cookies()
  return store.get('admin_session')?.value === 'authenticated'
}

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenders = await prisma.tender.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { items: true, invites: true } } },
  })
  return NextResponse.json(tenders)
}

export async function POST(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    projectName, workName, items, projectId, workTypeId,
    retentionPercent, tdsApplicable, labourCessApplicable, otherTerms,
  } = await req.json()
  if (!projectName || !workName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const tender = await prisma.tender.create({
    data: {
      projectName,
      workName,
      status: 'DRAFT',
      projectId: projectId ?? undefined,
      workTypeId: workTypeId ?? undefined,
      retentionPercent: Number(retentionPercent) || 0,
      tdsApplicable: Boolean(tdsApplicable),
      labourCessApplicable: Boolean(labourCessApplicable),
      otherTerms: otherTerms ?? '',
      items: {
        create: items.map((item: {
          slNo: number; itemName: string; description: string
          uom: string; quantity: number; remarks: string
        }) => ({
          slNo: item.slNo,
          itemName: item.itemName,
          description: item.description ?? '',
          uom: item.uom,
          quantity: item.quantity,
          remarks: item.remarks ?? '',
        })),
      },
    },
  })
  return NextResponse.json({ id: tender.id })
}
