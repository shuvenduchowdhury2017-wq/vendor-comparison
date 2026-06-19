import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import QuotationForm from '@/components/QuotationForm'
import QuotePrintButton from '@/components/QuotePrintButton'
import QuotationUploader from '@/components/QuotationUploader'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function fileIcon(mimeType: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (mimeType.includes('pdf') || ext === 'pdf') return '📄'
  if (mimeType.includes('sheet') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') return '📊'
  if (mimeType.includes('image') || ['jpg','jpeg','png','gif','webp'].includes(ext ?? '')) return '🖼️'
  if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') return '📝'
  return '📎'
}

export default async function VendorQuotePage(props: PageProps<'/quote/[token]'>) {
  const { token } = await props.params
  const sp = await props.searchParams
  const reviseRequested = sp?.revise === '1'

  const invite = await prisma.vendorInvite.findUnique({
    where: { token },
    include: {
      vendor: true,
      tender: {
        include: {
          items: { orderBy: { slNo: 'asc' } },
          attachments: { orderBy: { createdAt: 'asc' } },
        },
      },
      quotation: { include: { items: true, attachments: true } },
      draft: true,
    },
  })

  if (!invite) notFound()

  const LOCKED_MSG = invite.tender.status === 'DRAFT'
    ? { icon: '🔒', title: 'Not Yet Open', body: 'This tender has not been activated yet. Please check back later.' }
    : invite.tender.status === 'CLOSED'
    ? { icon: '🔒', title: 'Tender Closed', body: 'The submission period for this tender has ended.' }
    : null

  if (LOCKED_MSG) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl border p-8 max-w-sm w-full text-center shadow-sm">
          <div className="text-4xl mb-3">{LOCKED_MSG.icon}</div>
          <h2 className="text-lg font-semibold text-gray-800">{LOCKED_MSG.title}</h2>
          <p className="text-gray-500 text-sm mt-2">{LOCKED_MSG.body}</p>
        </div>
      </div>
    )
  }

  const tenderDocs = invite.tender.attachments

  const canRevise = invite.tender.status === 'ACTIVE'
  const reviseMode = reviseRequested && invite.quotation !== null && canRevise

  if (invite.quotation && !reviseMode) {
    const quotation = invite.quotation
    const total = quotation.items.reduce((s, i) => s + i.amount, 0)
    const printedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    const submittedOn = new Date(quotation.submittedAt).toLocaleString('en-IN')
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="quote-print max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-bold text-gray-900 text-base leading-tight">{invite.tender.projectName}</h1>
                <p className="text-gray-500 text-sm">{invite.tender.workName}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">✓ Submitted</span>
                <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-full">Revision - {quotation.revision}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Dear <strong>{invite.vendor.name}</strong>, your quotation (Revision - {quotation.revision}) was submitted on {submittedOn}.
            </p>
            <p className="print-only text-xs text-gray-500 mt-1">Printed on {printedOn}</p>
            <div className="mt-4 bg-orange-50 rounded-xl px-4 py-3 text-center">
              <div className="text-xs text-orange-600 font-medium">Total Quoted Amount</div>
              <div className="text-2xl font-bold text-orange-900 mt-0.5">
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Print / Revise actions */}
          <div className="flex items-center justify-end gap-2 no-print">
            <QuotePrintButton />
            {canRevise && (
              <a
                href={`/quote/${token}?revise=1`}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium"
              >
                Submit a Revision
              </a>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-4 text-sm">Quoted Rates</h2>
            <div className="space-y-3">
              {invite.tender.items.map((item) => {
                const qi = quotation.items.find((q) => q.tenderItemId === item.id)
                return (
                  <div key={item.id} className="rate-card border border-gray-100 rounded-xl p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 font-bold">#{item.slNo}</span>
                      <span className="font-medium text-gray-900 text-sm">{item.itemName}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.uom} · Qty: {item.quantity.toLocaleString('en-IN')}</div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <div className="text-xs text-gray-500">Rate: <span className="font-semibold text-gray-800">{qi ? `₹${qi.unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</span></div>
                      <div className="font-bold text-orange-700 text-sm">{qi ? `₹${qi.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</div>
                    </div>
                    {qi?.remarks && <div className="text-xs text-gray-400 mt-1 italic">Remarks: {qi.remarks}</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Signature block — appears on the printout only */}
          <div className="print-only signature-block">
            <div className="sig-line">
              <div className="sig-name">For {invite.vendor.name}</div>
              <div className="sig-rule">Authorised Signatory (Signature)</div>
              <div className="sig-meta">Name: ____________________</div>
              <div className="sig-meta">Date: ____________________</div>
            </div>
          </div>

          {/* Add attachment (upload signed printout) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm no-print">
            <QuotationUploader token={token} />
          </div>

          {invite.quotation.attachments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm no-print">
              <h2 className="font-semibold text-gray-700 mb-3 text-sm">Your Uploaded Documents</h2>
              <div className="space-y-2">
                {invite.quotation.attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span>{fileIcon(a.mimeType, a.fileName)}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{a.fileName}</span>
                    <span className="text-xs text-gray-400">{formatSize(a.fileSize)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!invite.quotation) {
    await prisma.vendorInvite.update({ where: { token }, data: { status: 'VIEWED' } })
  }

  const initialRates = reviseMode && invite.quotation
    ? Object.fromEntries(invite.quotation.items.map((qi) => [qi.tenderItemId, { unitRate: String(qi.unitRate), remarks: qi.remarks }]))
    : invite.draft && !reviseMode
    ? Object.fromEntries(
        (JSON.parse(invite.draft.ratesJson) as Array<{ tenderItemId: string; unitRate: number; remarks: string }>)
          .map((r) => [r.tenderItemId, { unitRate: r.unitRate > 0 ? String(r.unitRate) : '', remarks: r.remarks }])
      )
    : undefined
  const nextRevision = reviseMode && invite.quotation ? invite.quotation.revision + 1 : undefined
  const draftSavedAt = invite.draft && !reviseMode
    ? new Date(invite.draft.savedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : undefined

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Tender info header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Quotation Request</div>
          <h1 className="font-bold text-gray-900 text-lg leading-tight">{invite.tender.projectName}</h1>
          <p className="text-gray-500 text-sm">{invite.tender.workName}</p>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
            Dear <strong>{invite.vendor.name}</strong> — please enter your unit rate for each item and submit.
          </div>
        </div>

        {/* Commercial terms & criteria */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-1 text-sm">Terms &amp; Criteria</h2>
          <p className="text-xs text-gray-400 mb-3">Please factor these into your rates before submitting.</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="text-xs text-gray-400">Retention</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">{invite.tender.retentionPercent > 0 ? `${invite.tender.retentionPercent}%` : 'Nil'}</div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="text-xs text-gray-400">TDS</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">{invite.tender.tdsApplicable ? 'Applicable' : 'Not Applicable'}</div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="text-xs text-gray-400">Labour Cess</div>
              <div className="text-sm font-semibold text-gray-800 mt-0.5">{invite.tender.labourCessApplicable ? 'Applicable' : 'Not Applicable'}</div>
            </div>
          </div>
          {invite.tender.otherTerms && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-1">Other Terms / Criteria</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{invite.tender.otherTerms}</p>
            </div>
          )}
        </div>

        {/* Tender reference documents */}
        {tenderDocs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-700 mb-1 text-sm">Tender Documents</h2>
            <p className="text-xs text-gray-400 mb-3">Reference drawings and files for this tender.</p>
            <div className="space-y-2">
              {tenderDocs.map((a) => (
                <a
                  key={a.id}
                  href={a.filePath}
                  download={a.fileName}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition-colors"
                >
                  <span className="text-lg">{fileIcon(a.mimeType, a.fileName)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{a.fileName}</div>
                    <div className="text-xs text-gray-400">{formatSize(a.fileSize)}</div>
                  </div>
                  <span className="text-xs font-semibold text-orange-600 flex-shrink-0">↓ Download</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <QuotationForm token={token} items={invite.tender.items} initialRates={initialRates} nextRevision={nextRevision} draftSavedAt={draftSavedAt} />
      </div>
    </div>
  )
}
