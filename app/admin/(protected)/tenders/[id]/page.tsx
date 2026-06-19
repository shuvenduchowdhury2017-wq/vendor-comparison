import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import TenderStatusToggle from '@/components/TenderStatusToggle'
import AddVendorForm from '@/components/AddVendorForm'
import VendorInviteList from '@/components/VendorInviteList'
import TenderAttachments from '@/components/TenderAttachments'

export default async function TenderDetailPage(props: PageProps<'/admin/tenders/[id]'>) {
  const { id } = await props.params

  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      project: true,
      workType: true,
      items: { orderBy: { slNo: 'asc' } },
      attachments: { orderBy: { createdAt: 'asc' } },
      invites: {
        include: {
          vendor: true,
          quotation: { include: { items: true, attachments: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!tender) notFound()

  const submittedCount = tender.invites.filter((i) => i.quotation).length

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Back + Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={tender.project ? `/admin/projects/${tender.project.id}` : '/admin'}
            className="text-sm hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            ← {tender.project ? tender.project.name : 'Tenders'}
          </Link>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {tender.project && (
              <span
                className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: 'var(--ink)', color: '#fff' }}
              >
                {tender.project.name}
                {tender.project.location ? ` · ${tender.project.location}` : ''}
              </span>
            )}
            {tender.workType && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'var(--line-soft)', color: 'var(--muted)' }}
              >
                {tender.workType.name}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--ink)' }}>{tender.workName}</h1>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {submittedCount > 0 && (
            <Link
              href={`/admin/tenders/${id}/cs`}
              className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              style={{ background: '#dcf0e4', color: '#2a5c3b', textDecoration: 'none' }}
            >
              View CS ({submittedCount})
            </Link>
          )}
          <TenderStatusToggle tenderId={id} currentStatus={tender.status} />
        </div>
      </div>

      {/* Documents */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <TenderAttachments
          tenderId={id}
          initialAttachments={tender.attachments.map((a) => ({
            id: a.id,
            fileName: a.fileName,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
            filePath: a.filePath,
          }))}
        />
      </div>

      {/* Commercial Terms */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>Commercial Terms &amp; Criteria</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>Retention</div>
            <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{tender.retentionPercent > 0 ? `${tender.retentionPercent}%` : 'Nil'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>TDS Deduction</div>
            <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{tender.tdsApplicable ? 'Applicable' : 'Not Applicable'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>Labour Cess Deduction</div>
            <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{tender.labourCessApplicable ? 'Applicable' : 'Not Applicable'}</div>
          </div>
        </div>
        {tender.otherTerms && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--line-soft)' }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>Other Terms / Criteria</div>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ink)' }}>{tender.otherTerms}</p>
          </div>
        )}
      </div>

      {/* BOQ */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>
          BOQ Items ({tender.items.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
                <th className="pb-2 pr-3">Sl.No</th>
                <th className="pb-2 pr-3">Item Name</th>
                <th className="pb-2 pr-3">Description</th>
                <th className="pb-2 pr-3">UOM</th>
                <th className="pb-2 pr-3 text-right">Quantity</th>
                <th className="pb-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {tender.items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                  <td className="py-2 pr-3" style={{ color: 'var(--muted)' }}>{item.slNo}</td>
                  <td className="py-2 pr-3 font-medium" style={{ color: 'var(--ink)' }}>{item.itemName}</td>
                  <td className="py-2 pr-3 max-w-xs truncate" style={{ color: 'var(--muted)' }}>{item.description}</td>
                  <td className="py-2 pr-3" style={{ color: 'var(--muted)' }}>{item.uom}</td>
                  <td className="py-2 pr-3 text-right font-medium" style={{ color: 'var(--ink)' }}>
                    {item.quantity.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 text-xs" style={{ color: 'var(--muted)' }}>{item.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Invites */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>Vendor Invites</h2>
        <AddVendorForm tenderId={id} />
        <VendorInviteList invites={tender.invites} tenderId={id} />
      </div>
    </div>
  )
}
