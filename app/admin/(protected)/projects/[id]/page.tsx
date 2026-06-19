import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import ProjectTenderList from '@/components/ProjectTenderList'

export default async function ProjectDetailPage(props: PageProps<'/admin/projects/[id]'>) {
  const { id } = await props.params

  const [project, tenders] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.tender.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true, invites: true } },
        invites: { include: { quotation: true } },
        workType: true,
        attachments: true,
      },
    }),
  ])

  if (!project) notFound()

  const serialized = tenders.map((t) => ({
    id: t.id,
    workName: t.workName,
    projectName: t.projectName,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    workTypeName: t.workType?.name ?? null,
    itemCount: t._count.items,
    inviteCount: t._count.invites,
    quotedCount: t.invites.filter((i) => i.quotation).length,
    attachmentCount: t.attachments.length,
  }))

  return (
    <ProjectTenderList
      projectId={project.id}
      projectName={project.name}
      projectLocation={project.location}
      tenders={serialized}
    />
  )
}
