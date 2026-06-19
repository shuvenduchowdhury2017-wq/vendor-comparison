import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { unlink } from 'fs/promises'
import path from 'path'

async function isAdmin() {
  const store = await cookies()
  return store.get('admin_session')?.value === 'authenticated'
}

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/tenders/[id]/attachments'>) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const attachments = await prisma.tenderAttachment.findMany({
    where: { tenderId: id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(attachments)
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/tenders/[id]/attachments'>) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params

  const tender = await prisma.tender.findUnique({ where: { id } })
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 })

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]
  if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tenders', id)
  await mkdir(uploadDir, { recursive: true })

  const created = []
  for (const file of files) {
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._\- ]/g, '_')}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, safeName), buffer)
    const attachment = await prisma.tenderAttachment.create({
      data: {
        tenderId: id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        filePath: `/uploads/tenders/${id}/${safeName}`,
      },
    })
    created.push(attachment)
  }

  return NextResponse.json(created)
}

export async function DELETE(req: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { attachmentId } = await req.json()
  const att = await prisma.tenderAttachment.findUnique({ where: { id: attachmentId } })
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const absPath = path.join(process.cwd(), 'public', att.filePath)
  await unlink(absPath).catch(() => {})
  await prisma.tenderAttachment.delete({ where: { id: attachmentId } })
  return NextResponse.json({ ok: true })
}
