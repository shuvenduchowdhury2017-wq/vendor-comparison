import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import DraftPrintButton from '@/components/DraftPrintButton'

type RateEntry = { tenderItemId: string; unitRate: number; remarks: string }

export default async function DraftPrintPage(props: PageProps<'/quote/[token]/draft'>) {
  const { token } = await props.params

  const invite = await prisma.vendorInvite.findUnique({
    where: { token },
    include: {
      vendor: true,
      tender: { include: { items: { orderBy: { slNo: 'asc' } } } },
      draft: true,
    },
  })

  if (!invite || !invite.draft) notFound()

  const rates: RateEntry[] = JSON.parse(invite.draft.ratesJson)
  const rateMap = Object.fromEntries(rates.map((r) => [r.tenderItemId, r]))

  const rows = invite.tender.items.map((item) => {
    const r = rateMap[item.id]
    const unitRate = r && r.unitRate > 0 ? r.unitRate : null
    const amount = unitRate ? unitRate * item.quantity : null
    return { ...item, unitRate, amount, vendorRemarks: r?.remarks ?? '' }
  })

  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0)
  const filledCount = rows.filter((r) => r.unitRate !== null).length

  const savedAt = new Date(invite.draft.savedAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const t = invite.tender

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#f5f0e8', minHeight: '100vh' }}>

      {/* Screen-only toolbar */}
      <div className="no-print" style={{
        background: '#1d1a17', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <a href={`/quote/${token}`} style={{ color: '#f0e6d6', textDecoration: 'none', fontSize: '13px', opacity: 0.8 }}>
          ← Back to Form
        </a>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#f0e6d6', fontSize: '12px', opacity: 0.55 }}>
          {filledCount}/{rows.length} items filled
        </span>
        <DraftPrintButton />
      </div>

      {/* A4 printable area */}
      <div className="quote-print draft-print-area" style={{
        maxWidth: '794px', margin: '24px auto 40px',
        boxShadow: '0 4px 32px rgba(0,0,0,.5)', padding: '32px 36px', position: 'relative',
        background: 'var(--card)',
      }}>

        {/* DRAFT diagonal watermark (print only) */}
        <div className="draft-watermark print-only" style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%) rotate(-42deg)',
          fontSize: '110px', fontWeight: 900, color: 'rgba(190,88,40,.06)',
          letterSpacing: '0.05em', pointerEvents: 'none', userSelect: 'none', zIndex: 0,
          whiteSpace: 'nowrap',
        }}>
          DRAFT
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #211a15', paddingBottom: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#be5828', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Draft Quotation
              </div>
              <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#211a15', margin: 0, lineHeight: 1.3 }}>{t.projectName}</h1>
              <div style={{ fontSize: '12px', color: '#5e554c', marginTop: '3px' }}>{t.workName}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#5e554c', lineHeight: 1.6 }}>
              <div><span style={{ opacity: 0.65 }}>Vendor: </span><strong style={{ color: '#211a15' }}>{invite.vendor.name}</strong></div>
              <div><span style={{ opacity: 0.65 }}>Draft saved: </span>{savedAt}</div>
              <div style={{ marginTop: '4px', padding: '3px 8px', background: 'rgba(204,96,48,.18)', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: 'var(--accent-2)', letterSpacing: '0.05em' }}>
                NOT FOR SUBMISSION
              </div>
            </div>
          </div>

          {/* Commercial terms bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            {[
              ['Retention', t.retentionPercent > 0 ? `${t.retentionPercent}%` : 'Nil'],
              ['TDS', t.tdsApplicable ? 'Applicable' : 'Not Applicable'],
              ['Labour Cess', t.labourCessApplicable ? 'Applicable' : 'Not Applicable'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: '#f5f0e8', borderRadius: '6px', padding: '5px 10px', fontSize: '11px' }}>
                <span style={{ color: '#5e554c' }}>{label}: </span>
                <strong style={{ color: '#211a15' }}>{value}</strong>
              </div>
            ))}
          </div>

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '38%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '21%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#211a15', color: '#fff' }}>
                <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 600 }}>#</th>
                <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 600 }}>Item / Description</th>
                <th style={{ padding: '7px 6px', textAlign: 'center', fontWeight: 600 }}>UOM</th>
                <th style={{ padding: '7px 6px', textAlign: 'right', fontWeight: 600 }}>Qty</th>
                <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>Unit Rate (₹)</th>
                <th style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} style={{
                  background: idx % 2 === 0 ? 'var(--card)' : 'var(--paper-2)',
                  borderBottom: '1px solid var(--line)',
                }}>
                  <td style={{ padding: '7px 6px', textAlign: 'center', color: '#8a7e74', verticalAlign: 'top', fontSize: '10px' }}>
                    {row.slNo}
                  </td>
                  <td style={{ padding: '7px 8px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: '#211a15', lineHeight: 1.35 }}>{row.itemName}</div>
                    {row.description && (
                      <div style={{ color: '#5e554c', fontSize: '10px', marginTop: '3px', lineHeight: 1.4 }}>{row.description}</div>
                    )}
                    {row.vendorRemarks && (
                      <div style={{ color: '#be5828', fontSize: '10px', marginTop: '3px', fontStyle: 'italic' }}>
                        Remarks: {row.vendorRemarks}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '7px 6px', textAlign: 'center', color: '#5e554c', verticalAlign: 'top' }}>{row.uom}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'right', verticalAlign: 'top' }}>
                    {row.quantity.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', verticalAlign: 'top', fontWeight: row.unitRate ? 600 : 400, color: row.unitRate ? '#211a15' : '#bbb' }}>
                    {row.unitRate
                      ? row.unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', verticalAlign: 'top', fontWeight: row.amount ? 600 : 400, color: row.amount ? '#211a15' : '#bbb' }}>
                    {row.amount
                      ? row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#211a15', color: '#fff' }}>
                <td colSpan={5} style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em' }}>
                  TOTAL QUOTED AMOUNT
                </td>
                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontSize: '13px' }}>
                  {total > 0
                    ? `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '—'}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Draft notice */}
          <div style={{ marginTop: '14px', padding: '8px 12px', background: 'rgba(204,96,48,.12)', border: '1px solid rgba(204,96,48,.30)', borderRadius: '6px', fontSize: '11px', color: 'var(--accent-2)' }}>
            This is a <strong>draft quotation</strong>. Print, sign and upload as attachment, then submit your final quotation from the form.
          </div>

          {/* Signature block */}
          <div style={{ marginTop: '40px', textAlign: 'right' }}>
            <div style={{ display: 'inline-block', width: '270px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#211a15', marginBottom: '52px' }}>
                For {invite.vendor.name}
              </div>
              <div style={{ borderTop: '1.5px solid #444', paddingTop: '6px', fontSize: '11px', color: '#211a15' }}>
                Authorised Signatory (Signature)
              </div>
              <div style={{ fontSize: '11px', color: '#5e554c', marginTop: '8px', textAlign: 'left' }}>
                Name: ____________________________
              </div>
              <div style={{ fontSize: '11px', color: '#5e554c', marginTop: '6px', textAlign: 'left' }}>
                Date: ____________________________
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
