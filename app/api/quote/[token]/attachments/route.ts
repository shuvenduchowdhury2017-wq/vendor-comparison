import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest, ctx: RouteContext<'/api/quote/[token]/attachments'>) {
  const { token } = await ctx.params

  const invite = await prisma.vendorInvite.findUnique({
    where: { token },
    include: { quotation: true },
  })

  if (!invite?.quotation) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]
  if (!files.length) return NextResponse.json({ ok: true })

  const quotationId = invite.quotation.id
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'quotations', quotationId)
  await mkdir(uploadDir, { recursive: true })

  for (const file of files) {
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._\- ]/g, '_')}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, safeName), buffer)
    await prisma.quotationAttachment.create({
      data: {
        quotationId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        filePath: `/uploads/quotations/${quotationId}/${safeName}`,
      },
    })
  }

  return NextResponse.json({ ok: true })
}
