import { prisma } from '@/lib/db'

export default async function SummaryPage() {
  const [projects, workTypes, allTenders] = await Promise.all([
    prisma.project.findMany({
      orderBy: { name: 'asc' },
      include: {
        tenders: {
          include: { invites: { include: { quotation: true } } },
        },
      },
    }),
    prisma.workType.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { tenders: true } } },
    }),
    prisma.tender.findMany({
      include: { invites: { include: { quotation: true } }, project: true, workType: true },
    }),
  ])

  const total = allTenders.length
  const active = allTenders.filter((t) => t.status === 'ACTIVE').length
  const draft = allTenders.filter((t) => t.status === 'DRAFT').length
  const closed = allTenders.filter((t) => t.status === 'CLOSED').length
  const totalQuotes = allTenders.reduce(
    (sum, t) => sum + t.invites.filter((i) => i.quotation).length,
    0
  )

  const STATS = [
    { label: 'Total Tenders', value: total, bg: '#fff', text: 'var(--ink)' },
    { label: 'Active', value: active, bg: '#dcf0e4', text: '#2a5c3b' },
    { label: 'Draft', value: draft, bg: '#fef3c7', text: '#92400e' },
    { label: 'Closed', value: closed, bg: 'var(--line-soft)', text: 'var(--muted)' },
    { label: 'Quotes Received', value: totalQuotes, bg: 'rgba(192,83,39,.08)', text: 'var(--accent)' },
  ]

  function statusBadge(status: string) {
    if (status === 'ACTIVE') return { bg: '#dcf0e4', color: '#2a5c3b' }
    if (status === 'CLOSED') return { bg: 'var(--line-soft)', color: 'var(--muted)' }
    return { bg: '#fef3c7', color: '#92400e' }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Summary</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border px-4 py-4" style={{ background: s.bg, borderColor: 'var(--line)' }}>
            <div className="text-3xl font-bold leading-none" style={{ color: s.text }}>{s.value}</div>
            <div className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Project-wise breakdown */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
          Project-wise
        </h2>
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--line-soft)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Location</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Active</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Draft</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Closed</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Quotes</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const pts = p.tenders
                const quotes = pts.reduce((s, t) => s + t.invites.filter((i) => i.quotation).length, 0)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td className="px-5 py-3 font-semibold" style={{ color: 'var(--ink)' }}>{p.name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{p.location || '—'}</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--ink)' }}>{pts.length}</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: '#2a5c3b' }}>
                      {pts.filter((t) => t.status === 'ACTIVE').length}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: '#92400e' }}>
                      {pts.filter((t) => t.status === 'DRAFT').length}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--muted)' }}>
                      {pts.filter((t) => t.status === 'CLOSED').length}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--accent)' }}>{quotes}</td>
                  </tr>
                )
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
                    No projects. Add them in Masters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Work-category breakdown */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
          Work Category-wise
        </h2>
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--line-soft)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Work Type</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Tenders</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Active</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Closed</th>
              </tr>
            </thead>
            <tbody>
              {workTypes.map((wt) => {
                const tts = allTenders.filter((t) => t.workTypeId === wt.id)
                return (
                  <tr key={wt.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--ink)' }}>{wt.name}</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--ink)' }}>{tts.length}</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: '#2a5c3b' }}>
                      {tts.filter((t) => t.status === 'ACTIVE').length}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: 'var(--muted)' }}>
                      {tts.filter((t) => t.status === 'CLOSED').length}
                    </td>
                  </tr>
                )
              })}
              {workTypes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
                    No work types. Add them in Masters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent tenders across all projects */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
          All Tenders
        </h2>
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          {allTenders.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No tenders yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--line-soft)' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Work</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Category</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Quotes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {allTenders
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((t) => {
                    const quotes = t.invites.filter((i) => i.quotation).length
                    const badge = statusBadge(t.status)
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                        <td className="px-5 py-3 font-medium" style={{ color: 'var(--ink)' }}>
                          {t.project ? (
                            <span>
                              {t.project.name}
                              {t.project.location && (
                                <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
                                  {t.project.location}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>{t.projectName}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink)' }}>{t.workName}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
                          {t.workType?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-sm" style={{ color: quotes > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                          {quotes}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
                          {new Date(t.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
