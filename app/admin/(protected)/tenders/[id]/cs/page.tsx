import Link from 'next/link'
import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import CSExportButton from '@/components/CSExportButton'
import CSPrintButton from '@/components/CSPrintButton'

export default async function ComparativeStatementPage(props: PageProps<'/admin/tenders/[id]/cs'>) {
  const { id } = await props.params

  const tender = await prisma.tender.findUnique({
    where: { id },
    include: {
      items: { orderBy: { slNo: 'asc' } },
      invites: {
        include: {
          vendor: true,
          quotation: { include: { items: true } },
        },
        where: { quotation: { isNot: null } },
      },
    },
  })

  if (!tender) notFound()

  const vendors = tender.invites.filter((i) => i.quotation)

  if (vendors.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-400">No quotations submitted yet.</p>
        <Link href={`/admin/tenders/${id}`} className="text-blue-600 text-sm hover:underline mt-2 inline-block">
          Back to tender
        </Link>
      </div>
    )
  }

  const vendorTotals = vendors.map((invite) => ({
    invite,
    total: invite.quotation!.items.reduce((s, i) => s + i.amount, 0),
  }))
  vendorTotals.sort((a, b) => a.total - b.total)

  const ranks = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8']
  const getRank = (i: number) => ranks[i] ?? `L${i + 1}`

  function getItemRate(inviteId: string, tenderItemId: string) {
    const invite = vendors.find((v) => v.id === inviteId)
    if (!invite?.quotation) return null
    return invite.quotation.items.find((qi) => qi.tenderItemId === tenderItemId) ?? null
  }

  function getLowestRate(tenderItemId: string) {
    let lowest: number | null = null
    for (const invite of vendors) {
      const qi = invite.quotation?.items.find((i) => i.tenderItemId === tenderItemId)
      if (qi && (lowest === null || qi.unitRate < lowest)) lowest = qi.unitRate
    }
    return lowest
  }

  const l1Total = vendorTotals[0]?.total ?? 0
  const l2Total = vendorTotals[1]?.total ?? 0
  const savings = l2Total > 0 ? l2Total - l1Total : 0

  const exportVendors = vendorTotals.map((v, i) => ({
    rank: getRank(i),
    vendorName: v.invite.vendor.name,
    vendorEmail: v.invite.vendor.email,
    category: v.invite.vendor.category,
    total: v.total,
    inviteId: v.invite.id,
  }))

  const exportItems = tender.items.map((item) => ({
    id: item.id,
    slNo: item.slNo,
    itemName: item.itemName,
    description: item.description,
    uom: item.uom,
    quantity: item.quantity,
    rates: vendorTotals.map((v) => {
      const qi = getItemRate(v.invite.id, item.id)
      return { inviteId: v.invite.id, unitRate: qi?.unitRate ?? null, amount: qi?.amount ?? null, remarks: qi?.remarks ?? '' }
    }),
  }))

  const printedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  // Column widths: fixed first 4 columns, remaining width split across each vendor's Rate/Amount pair.
  const vendorColW = (61 / vendorTotals.length / 2).toFixed(2)

  return (
    <div className="cs-print max-w-full mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/admin/tenders/${id}`} className="text-sm text-blue-600 hover:underline no-print">
            ← Back to Tender
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Comparative Statement</h1>
          <p className="text-gray-500 text-sm">{tender.projectName} — {tender.workName}</p>
          <p className="print-only text-xs text-gray-500 mt-1">
            {vendors.length} contractor{vendors.length === 1 ? '' : 's'} compared · Printed on {printedOn}
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <CSPrintButton />
          <CSExportButton
            projectName={tender.projectName}
            workName={tender.workName}
            vendors={exportVendors}
            items={exportItems}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {vendorTotals.map((v, i) => (
          <div key={v.invite.id} className={`bg-white rounded-xl border p-4 ${i === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
            <div className={`text-xs font-bold uppercase mb-1 ${i === 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {getRank(i)} {i === 0 ? '(Lowest)' : ''}
            </div>
            <div className="font-semibold text-gray-900 truncate text-sm">{v.invite.vendor.name}</div>
            <div className="text-lg font-bold text-blue-800 mt-1">
              ₹{v.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            {i > 0 && (
              <div className="text-xs text-red-500 mt-0.5">
                +₹{(v.total - l1Total).toLocaleString('en-IN', { minimumFractionDigits: 2 })} vs L1
              </div>
            )}
          </div>
        ))}
      </div>

      {savings > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="text-green-600 font-bold text-sm">Potential Savings (L2 vs L1):</div>
          <div className="text-green-800 font-bold text-lg">
            ₹{savings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="cs-table w-full text-sm min-w-max">
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            {vendorTotals.map((v) => (
              <Fragment key={v.invite.id}>
                <col style={{ width: `${vendorColW}%` }} />
                <col style={{ width: `${vendorColW}%` }} />
              </Fragment>
            ))}
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs text-gray-500 uppercase py-3 px-4">Sl.No</th>
              <th className="text-left text-xs text-gray-500 uppercase py-3 px-4">Item Name</th>
              <th className="text-left text-xs text-gray-500 uppercase py-3 px-2">UOM</th>
              <th className="text-right text-xs text-gray-500 uppercase py-3 px-3">Qty</th>
              {vendorTotals.map((v, i) => (
                <th key={v.invite.id} colSpan={2} className={`text-center py-3 px-2 align-bottom ${i === 0 ? 'text-green-700' : 'text-gray-500'}`}>
                  <div className="text-xs font-bold uppercase">{getRank(i)}</div>
                  <div className="text-[11px] font-medium leading-tight break-words" style={{ overflowWrap: 'anywhere' }}>{v.invite.vendor.name}</div>
                </th>
              ))}
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th colSpan={4}></th>
              {vendorTotals.map((v) => (
                <Fragment key={v.invite.id}>
                  <th className="text-right text-xs text-gray-400 uppercase py-1.5 px-2">Rate</th>
                  <th className="text-right text-xs text-gray-400 uppercase py-1.5 px-3">Amount</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {tender.items.map((item) => {
              const lowestRate = getLowestRate(item.id)
              return (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-4 text-gray-400">{item.slNo}</td>
                  <td className="py-2 px-4 font-medium">
                    <div>{item.itemName}</div>
                    {item.description && <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>}
                  </td>
                  <td className="py-2 px-2 text-gray-500">{item.uom}</td>
                  <td className="py-2 px-3 text-right">{item.quantity.toLocaleString('en-IN')}</td>
                  {vendorTotals.map((v) => {
                    const qi = getItemRate(v.invite.id, item.id)
                    const isLowest = qi && lowestRate !== null && qi.unitRate === lowestRate
                    return (
                      <Fragment key={v.invite.id}>
                        <td className={`py-2 px-2 text-right font-medium ${isLowest ? 'text-green-700 font-bold' : 'text-gray-700'}`}>
                          {qi ? `₹${qi.unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          {isLowest && <span className="ml-1 text-xs">★</span>}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600 align-top">
                          {qi ? `₹${qi.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                          {qi?.remarks && (
                            <div className="cs-remark text-[10px] text-gray-400 italic font-normal leading-snug mt-0.5 text-left" style={{ overflowWrap: 'anywhere' }}>
                              {qi.remarks}
                            </div>
                          )}
                        </td>
                      </Fragment>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-300 bg-gray-50">
            <tr>
              <td colSpan={4} className="py-3 px-4 font-bold text-right text-gray-700 uppercase text-xs">Grand Total</td>
              {vendorTotals.map((v, i) => (
                <Fragment key={v.invite.id}>
                  <td></td>
                  <td className={`py-3 px-3 text-right font-bold ${i === 0 ? 'text-green-700 text-base' : 'text-gray-700'}`}>
                    ₹{v.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </Fragment>
              ))}
            </tr>
            <tr>
              <td colSpan={4} className="pb-2 px-4 text-right text-xs text-gray-400 uppercase">Rank</td>
              {vendorTotals.map((v, i) => (
                <Fragment key={v.invite.id}>
                  <td></td>
                  <td className={`pb-2 px-3 text-right font-bold text-sm ${i === 0 ? 'text-green-700' : 'text-gray-500'}`}>
                    {getRank(i)}
                  </td>
                </Fragment>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
