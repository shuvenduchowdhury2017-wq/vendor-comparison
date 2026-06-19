'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type TenderItem = {
  id: string
  slNo: number
  itemName: string
  description: string
  uom: string
  quantity: number
  remarks: string
}

type RateEntry = { unitRate: string; remarks: string }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function QuotationForm({
  token,
  items,
  initialRates,
  nextRevision,
  draftSavedAt,
}: {
  token: string
  items: TenderItem[]
  initialRates?: Record<string, RateEntry>
  nextRevision?: number
  draftSavedAt?: string
}) {
  const router = useRouter()
  const [rates, setRates] = useState<Record<string, RateEntry>>(
    Object.fromEntries(items.map((i) => [i.id, initialRates?.[i.id] ?? { unitRate: '', remarks: '' }]))
  )
  const isRevision = typeof nextRevision === 'number'
  const [attachments, setAttachments] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftJustSaved, setDraftJustSaved] = useState(false)
  const [draftError, setDraftError] = useState('')

  function update(id: string, field: keyof RateEntry, value: string) {
    setRates((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  function getAmount(item: TenderItem) {
    const rate = parseFloat(rates[item.id]?.unitRate ?? '0')
    if (isNaN(rate) || rate <= 0) return null
    return item.quantity * rate
  }

  const totalAmount = items.reduce((sum, item) => sum + (getAmount(item) ?? 0), 0)
  const filledCount = items.filter((i) => {
    const r = parseFloat(rates[i.id]?.unitRate ?? '0')
    return r > 0
  }).length

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setAttachments((prev) => [...prev, ...Array.from(e.target.files ?? [])])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function saveDraft() {
    setDraftSaving(true)
    setDraftError('')
    const payload = items.map((item) => ({
      tenderItemId: item.id,
      unitRate: parseFloat(rates[item.id]?.unitRate ?? '0') || 0,
      remarks: rates[item.id]?.remarks ?? '',
    }))
    try {
      const res = await fetch(`/api/quote/${token}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: payload }),
      })
      if (res.ok) {
        setDraftJustSaved(true)
        setTimeout(() => setDraftJustSaved(false), 8000)
      } else {
        setDraftError('Could not save draft. Please try again.')
      }
    } catch {
      setDraftError('Could not save draft. Please try again.')
    } finally {
      setDraftSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    for (const item of items) {
      const rate = parseFloat(rates[item.id]?.unitRate ?? '0')
      if (!rate || rate <= 0) {
        setError(`Enter a valid rate for: "${item.itemName}"`)
        return
      }
    }
    setLoading(true)
    setError('')
    const payload = items.map((item) => ({
      tenderItemId: item.id,
      unitRate: parseFloat(rates[item.id].unitRate),
      amount: getAmount(item) ?? 0,
      remarks: rates[item.id].remarks,
    }))
    const res = await fetch(`/api/quote/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
    })
    if (res.ok) {
      if (attachments.length > 0) {
        const fd = new FormData()
        for (const f of attachments) fd.append('files', f)
        await fetch(`/api/quote/${token}/attachments`, { method: 'POST', body: fd })
      }
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to submit quotation')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {isRevision && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800">
          You are submitting <strong>Revision&nbsp;-&nbsp;{nextRevision}</strong>. Your previous rates are pre-filled below — update what you need and submit.
        </div>
      )}
      {!isRevision && draftSavedAt && !draftJustSaved && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-sm text-blue-800 flex items-start gap-2">
          <span className="text-base leading-tight flex-shrink-0">📋</span>
          <span>Draft loaded from <strong>{draftSavedAt}</strong>. Your saved rates are pre-filled. Continue editing and submit when ready.</span>
        </div>
      )}
      {draftJustSaved && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-800 flex items-center justify-between gap-3">
          <span>✓ Draft saved successfully!</span>
          <a
            href={`/quote/${token}/draft`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
          >
            Print Draft ↗
          </a>
        </div>
      )}
      {draftError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
          {draftError}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">{isRevision ? 'Revise Your Rates' : 'Enter Your Rates'}</h2>
          <span className="text-xs text-gray-400">{filledCount}/{items.length} filled</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Fill the unit rate for each item. Amount is calculated automatically.</p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const amount = getAmount(item)
          const rateVal = rates[item.id]?.unitRate ?? ''
          const filled = parseFloat(rateVal) > 0

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl border p-4 sm:p-5 transition-colors ${filled ? 'border-orange-200' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">
                      #{item.slNo}
                    </span>
                    <span className="font-semibold text-gray-900 text-sm leading-tight">{item.itemName}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-1 leading-snug">{item.description}</p>
                  )}
                </div>
                {filled && (
                  <span className="text-green-500 text-lg flex-shrink-0">✓</span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="bg-gray-50 rounded px-2 py-1">
                  <span className="text-gray-400">UOM:</span> <strong className="text-gray-700">{item.uom}</strong>
                </span>
                <span className="bg-gray-50 rounded px-2 py-1">
                  <span className="text-gray-400">Qty:</span> <strong className="text-gray-700">{item.quantity.toLocaleString('en-IN')}</strong>
                </span>
                {item.remarks && (
                  <span className="text-gray-400 italic truncate">{item.remarks}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Unit Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">₹</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={rateVal}
                      onChange={(e) => update(item.id, 'unitRate', e.target.value)}
                      required
                      min="0.01"
                      step="any"
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm text-right font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₹)</label>
                  <div className={`w-full rounded-lg px-3 py-2.5 text-sm font-bold text-right border ${
                    amount != null ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-gray-50 border-gray-100 text-gray-300'
                  }`}>
                    {amount != null
                      ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Remarks (optional)</label>
                <input
                  type="text"
                  value={rates[item.id]?.remarks ?? ''}
                  onChange={(e) => update(item.id, 'remarks', e.target.value)}
                  placeholder="Any conditions, notes…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Supporting documents upload */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-700 text-sm">Supporting Documents</h3>
            <p className="text-xs text-gray-400 mt-0.5">Attach your terms, rate breakdown, drawings, or any supporting files (optional)</p>
          </div>
          <label className="cursor-pointer flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors text-gray-600">
            + Attach
            <input ref={fileInputRef} type="file" multiple onChange={handleFiles} className="hidden" />
          </label>
        </div>
        {attachments.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{f.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(f.size)}</span>
                <button type="button" onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0 text-base leading-none">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-xl border border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs text-gray-500">Total Quoted Amount</div>
            <div className={`text-xl font-bold mt-0.5 ${totalAmount > 0 ? 'text-orange-900' : 'text-gray-300'}`}>
              {totalAmount > 0
                ? `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                : '—'}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={saveDraft}
              disabled={draftSaving || loading}
              className="px-5 py-3 rounded-xl font-semibold text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors"
            >
              {draftSaving ? 'Saving…' : '💾 Save Draft'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 sm:px-8 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60 transition-colors shadow-sm"
              style={{ background: 'var(--accent, #c05327)' }}
            >
              {loading ? 'Submitting…' : isRevision ? `Submit Revision - ${nextRevision}` : 'Submit Quotation'}
            </button>
          </div>
        </div>
        {!draftJustSaved && (
          <p className="text-xs text-gray-400 mt-2">
            Save a draft to review, print and sign before final submission.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
          {error}
        </div>
      )}
    </form>
  )
}
