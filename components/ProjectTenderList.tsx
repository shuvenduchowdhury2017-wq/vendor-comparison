'use client'

import Link from 'next/link'
import { useState } from 'react'

type TenderRow = {
  id: string
  workName: string
  projectName: string
  status: string
  createdAt: string
  workTypeName: string | null
  itemCount: number
  inviteCount: number
  quotedCount: number
  attachmentCount: number
}

type Props = {
  projectId: string
  projectName: string
  projectLocation: string
  tenders: TenderRow[]
}

type Filter = 'ALL' | 'ACTIVE' | 'DRAFT' | 'CLOSED'

function statusStyle(status: string) {
  if (status === 'ACTIVE') return { bg: '#dcf0e4', color: '#2a5c3b' }
  if (status === 'CLOSED') return { bg: 'var(--line-soft)', color: 'var(--muted)' }
  return { bg: '#fef3c7', color: '#92400e' }
}

export default function ProjectTenderList({ projectId, projectName, projectLocation, tenders }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL')

  const counts = {
    ALL: tenders.length,
    ACTIVE: tenders.filter((t) => t.status === 'ACTIVE').length,
    DRAFT: tenders.filter((t) => t.status === 'DRAFT').length,
    CLOSED: tenders.filter((t) => t.status === 'CLOSED').length,
  }

  const visible = filter === 'ALL' ? tenders : tenders.filter((t) => t.status === filter)

  const TABS: { id: Filter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'CLOSED', label: 'Closed' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Link href="/admin" className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
            ← Projects
          </Link>
          <div className="flex items-baseline gap-3 mt-1">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{projectName}</h1>
            {projectLocation && (
              <span className="text-base" style={{ color: 'var(--muted)' }}>{projectLocation}</span>
            )}
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {counts.ALL} tender{counts.ALL !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href={`/admin/tenders/new?projectId=${projectId}`}
          className="pma-btn flex-shrink-0"
          style={{ textDecoration: 'none' }}
        >
          + New Tender
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '0' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={
              filter === tab.id
                ? { borderBottom: '2px solid var(--accent)', color: 'var(--accent)', marginBottom: '-1px' }
                : { borderBottom: '2px solid transparent', color: 'var(--muted)', marginBottom: '-1px' }
            }
          >
            {tab.label}
            <span
              className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
              style={{
                background: filter === tab.id ? 'rgba(192,83,39,.12)' : 'var(--line-soft)',
                color: filter === tab.id ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {counts[tab.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Tender list */}
      {visible.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl border-2 border-dashed"
          style={{ borderColor: 'var(--line)' }}
        >
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {filter === 'ALL' ? 'No tenders yet for this project.' : `No ${filter.toLowerCase()} tenders.`}
          </p>
          {filter === 'ALL' && (
            <Link
              href={`/admin/tenders/new?projectId=${projectId}`}
              className="text-sm mt-2 inline-block hover:underline"
              style={{ color: 'var(--accent)' }}
            >
              Create the first tender →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((tender) => {
            const badge = statusStyle(tender.status)
            return (
              <Link
                key={tender.id}
                href={`/admin/tenders/${tender.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-all hover:shadow-sm group"
                style={{ background: 'var(--card)', borderColor: 'var(--line)', textDecoration: 'none' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                    {tender.workName}
                    {tender.workTypeName && (
                      <span className="ml-2 font-normal text-xs" style={{ color: 'var(--muted)' }}>
                        · {tender.workTypeName}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                    <span>{tender.itemCount} items</span>
                    <span>{tender.inviteCount} vendors</span>
                    <span>{tender.quotedCount} quote{tender.quotedCount !== 1 ? 's' : ''}</span>
                    {tender.attachmentCount > 0 && (
                      <span>📎 {tender.attachmentCount} doc{tender.attachmentCount !== 1 ? 's' : ''}</span>
                    )}
                    <span>{new Date(tender.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {tender.status}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
