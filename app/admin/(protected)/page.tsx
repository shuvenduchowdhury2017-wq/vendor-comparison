import Link from 'next/link'
import { prisma } from '@/lib/db'

export default async function AdminDashboard() {
  const [projects, allTenders] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: 'asc' } }),
    prisma.tender.findMany({
      include: { _count: { select: { invites: true } }, invites: { include: { quotation: true } } },
    }),
  ])

  function tenderStats(tenders: typeof allTenders) {
    return {
      total: tenders.length,
      active: tenders.filter((t) => t.status === 'ACTIVE').length,
      draft: tenders.filter((t) => t.status === 'DRAFT').length,
      closed: tenders.filter((t) => t.status === 'CLOSED').length,
      quotes: tenders.reduce((s, t) => s + t.invites.filter((i) => i.quotation).length, 0),
    }
  }

  const grouped = projects.map((p) => ({
    project: p,
    tenders: allTenders.filter((t) => t.projectId === p.id),
  }))

  const ungrouped = allTenders.filter((t) => !t.projectId)
  const overall = tenderStats(allTenders)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {overall.total} tenders · {overall.active} active · {overall.quotes} quotes received
          </p>
        </div>
        <Link href="/admin/tenders/new" className="pma-btn" style={{ textDecoration: 'none' }}>
          + New Tender
        </Link>
      </div>

      {/* Project cards */}
      <div className="space-y-3">
        {grouped.map(({ project, tenders }) => {
          const s = tenderStats(tenders)
          return (
            <Link
              key={project.id}
              href={`/admin/projects/${project.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border px-6 py-5 transition-all hover:shadow-md group"
              style={{ background: 'var(--card)', borderColor: 'var(--line)', textDecoration: 'none' }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-base font-bold" style={{ color: 'var(--ink)' }}>{project.name}</span>
                  {project.location && (
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>{project.location}</span>
                  )}
                </div>
                <div className="flex gap-5 mt-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {s.total} tender{s.total !== 1 ? 's' : ''}
                  </span>
                  {s.active > 0 && (
                    <span className="text-sm font-medium" style={{ color: '#2a5c3b' }}>
                      {s.active} active
                    </span>
                  )}
                  {s.draft > 0 && (
                    <span className="text-sm font-medium" style={{ color: '#92400e' }}>
                      {s.draft} draft
                    </span>
                  )}
                  {s.closed > 0 && (
                    <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                      {s.closed} closed
                    </span>
                  )}
                  {s.total === 0 && (
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>No tenders yet</span>
                  )}
                </div>
              </div>
              <div
                className="text-lg flex-shrink-0 transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--accent)' }}
              >
                →
              </div>
            </Link>
          )
        })}

        {/* Ungrouped */}
        {ungrouped.length > 0 && (
          <Link
            href="/admin/tenders"
            className="flex items-center justify-between gap-4 rounded-xl border px-6 py-5 transition-all hover:shadow-md group"
            style={{ background: 'var(--card)', borderColor: 'var(--line)', borderStyle: 'dashed', textDecoration: 'none' }}
          >
            <div>
              <span className="text-base font-semibold" style={{ color: 'var(--muted)' }}>Other Tenders</span>
              <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {ungrouped.length} tender{ungrouped.length !== 1 ? 's' : ''} not linked to a project
              </div>
            </div>
            <span style={{ color: 'var(--muted)' }}>→</span>
          </Link>
        )}

        {projects.length === 0 && allTenders.length === 0 && (
          <div
            className="text-center py-20 rounded-xl border-2 border-dashed"
            style={{ borderColor: 'var(--line)' }}
          >
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No projects yet. Add them in{' '}
              <Link href="/admin/masters" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
                Masters
              </Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
