'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import BoqItemNameInput, { type BoqRef } from '@/components/BoqItemNameInput'

type Project = { id: string; name: string; location: string }
type WorkType = { id: string; name: string }

interface BoqRow {
  slNo: number; itemName: string; description: string; uom: string; quantity: number; remarks: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function NewTenderClient({ initialProjectId }: { initialProjectId: string }) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [projectId, setProjectId] = useState(initialProjectId)
  const [workTypeId, setWorkTypeId] = useState('')
  const [workName, setWorkName] = useState('')
  const [retentionPercent, setRetentionPercent] = useState(0)
  const [tdsApplicable, setTdsApplicable] = useState(false)
  const [labourCessApplicable, setLabourCessApplicable] = useState(false)
  const [otherTerms, setOtherTerms] = useState('')
  const [items, setItems] = useState<BoqRow[]>([])
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const attachInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {})
    fetch('/api/work-types').then((r) => r.json()).then(setWorkTypes).catch(() => {})
  }, [])

  const selectedProject = projects.find((p) => p.id === projectId)

  function handleWorkTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    setWorkTypeId(id)
    if (id) {
      const wt = workTypes.find((w) => w.id === id)
      if (wt) setWorkName(wt.name)
    }
  }

  function addRow() {
    setItems([...items, { slNo: items.length + 1, itemName: '', description: '', uom: '', quantity: 0, remarks: '' }])
  }

  function removeRow(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: keyof BoqRow, value: string | number) {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: value }
    setItems(updated)
  }

  function applyReference(i: number, ref: BoqRef) {
    const updated = [...items]
    updated[i] = {
      ...updated[i],
      itemName: ref.itemName,
      description: ref.description,
      uom: ref.uom || updated[i].uom,
    }
    setItems(updated)
  }

  function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      setItems(rows.map((r, idx) => ({
        slNo: Number(r['Sl. No'] ?? r['SlNo'] ?? r['SL NO'] ?? r['sl no'] ?? idx + 1),
        itemName: String(r['Item Name'] ?? r['item_name'] ?? r['ItemName'] ?? ''),
        description: String(r['Item Description'] ?? r['Description'] ?? r['description'] ?? ''),
        uom: String(r['UOM'] ?? r['Unit'] ?? r['uom'] ?? ''),
        quantity: Number(r['Quantity'] ?? r['Qty'] ?? r['qty'] ?? 0),
        remarks: String(r['Remarks'] ?? r['remarks'] ?? ''),
      })))
    }
    reader.readAsArrayBuffer(file)
  }

  function handleAttachFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setAttachmentFiles((prev) => [...prev, ...files])
    if (attachInputRef.current) attachInputRef.current.value = ''
  }

  function removeAttachment(i: number) {
    setAttachmentFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projectId) { setError('Select a project'); return }
    if (!workName.trim()) { setError('Enter work name'); return }
    if (items.length === 0) { setError('Add at least one BOQ item'); return }

    setLoading(true)
    setError('')

    const projectName = selectedProject
      ? selectedProject.location
        ? `${selectedProject.name} — ${selectedProject.location}`
        : selectedProject.name
      : ''

    const res = await fetch('/api/tenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName, workName: workName.trim(), items, projectId,
        workTypeId: workTypeId || undefined,
        retentionPercent, tdsApplicable, labourCessApplicable, otherTerms: otherTerms.trim(),
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create tender')
      setLoading(false)
      return
    }

    const { id } = await res.json()

    if (attachmentFiles.length > 0) {
      const fd = new FormData()
      for (const f of attachmentFiles) fd.append('files', f)
      await fetch(`/api/tenders/${id}/attachments`, { method: 'POST', body: fd })
    }

    router.push(`/admin/tenders/${id}`)
  }

  const inputStyle = {
    width: '100%', border: '1px solid var(--line)', borderRadius: '10px',
    padding: '0.5rem 0.625rem', fontSize: '0.8125rem', background: 'var(--card)',
    color: 'var(--ink)', outline: 'none', fontFamily: 'inherit',
  } as React.CSSProperties

  return (
    <div style={{ width: 'min(1600px, 100vw - 2rem)', position: 'relative', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => router.back()} className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
          ← Back
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>New Tender</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Tender details */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Tender Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Project *</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required className="pma-select">
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.location ? ` — ${p.location}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Work Type</label>
              <select value={workTypeId} onChange={handleWorkTypeChange} className="pma-select">
                <option value="">Select work type…</option>
                {workTypes.map((wt) => (<option key={wt.id} value={wt.id}>{wt.name}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
              Work Name * <span className="normal-case font-normal text-xs" style={{ color: 'var(--muted)' }}>(auto-filled from Work Type, or type custom)</span>
            </label>
            <input value={workName} onChange={(e) => setWorkName(e.target.value)} required className="pma-input" placeholder="e.g. Civil Works — Block A" />
          </div>
        </div>

        {/* Commercial Terms */}
        <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Commercial Terms & Criteria</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Shared with contractors along with the BOQ when the tender is floated.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Retention %</label>
              <input
                type="number" min="0" max="100" step="any"
                value={retentionPercent}
                onChange={(e) => setRetentionPercent(Number(e.target.value))}
                className="pma-input" placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>TDS Deduction</label>
              <select value={tdsApplicable ? 'yes' : 'no'} onChange={(e) => setTdsApplicable(e.target.value === 'yes')} className="pma-select">
                <option value="no">Not Applicable</option>
                <option value="yes">Applicable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>Labour Cess Deduction</label>
              <select value={labourCessApplicable ? 'yes' : 'no'} onChange={(e) => setLabourCessApplicable(e.target.value === 'yes')} className="pma-select">
                <option value="no">Not Applicable</option>
                <option value="yes">Applicable</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
              Other Terms / Criteria <span className="normal-case font-normal" style={{ color: 'var(--muted)' }}>(optional)</span>
            </label>
            <textarea
              value={otherTerms}
              onChange={(e) => setOtherTerms(e.target.value)}
              rows={3}
              className="pma-input"
              placeholder="e.g. Defect liability period, payment terms, GST inclusive/exclusive, validity of quotation…"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* BOQ Items */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>BOQ Items</h2>
            <div className="flex gap-2">
              <label className="cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--line-soft)', color: 'var(--ink)' }}>
                Import Excel
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcel} className="hidden" />
              </label>
              <button type="button" onClick={addRow} className="text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: 'rgba(192,83,39,.1)', color: 'var(--accent)' }}>
                + Add Row
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 rounded-lg border-2 border-dashed" style={{ borderColor: 'var(--line)' }}>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Import Excel or add rows manually.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Columns: Sl. No · Item Name · Item Description · UOM · Quantity · Remarks</p>
            </div>
          ) : (
            <div>
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide" style={{ borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>
                    <th className="pb-2 pr-2" style={{ width: '5%' }}>Sl.No</th>
                    <th className="pb-2 pr-2" style={{ width: '22%' }}>Item Name *</th>
                    <th className="pb-2 pr-2" style={{ width: '41%' }}>Description</th>
                    <th className="pb-2 pr-2" style={{ width: '8%' }}>UOM *</th>
                    <th className="pb-2 pr-2" style={{ width: '9%' }}>Qty *</th>
                    <th className="pb-2 pr-2" style={{ width: '12%' }}>Remarks</th>
                    <th className="pb-2" style={{ width: '3%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line-soft)', verticalAlign: 'middle' }}>
                      <td className="py-1.5 pr-2"><input type="number" value={item.slNo} onChange={(e) => updateRow(i, 'slNo', Number(e.target.value))} style={{ ...inputStyle, padding: '0.375rem 0.5rem' }} /></td>
                      <td className="py-1.5 pr-2 align-middle">
                        <BoqItemNameInput
                          value={item.itemName}
                          onChange={(v) => updateRow(i, 'itemName', v)}
                          onSelect={(ref) => applyReference(i, ref)}
                          inputStyle={inputStyle}
                        />
                      </td>
                      <td className="py-1.5 pr-2 align-middle">
                        <textarea
                          value={item.description}
                          onChange={(e) => updateRow(i, 'description', e.target.value)}
                          placeholder="Auto-filled on select — click to edit"
                          rows={4}
                          style={{ ...inputStyle, padding: '0.5rem 0.625rem', minHeight: '5.5rem', resize: 'vertical', lineHeight: 1.45 }}
                        />
                      </td>
                      <td className="py-1.5 pr-2"><input value={item.uom} onChange={(e) => updateRow(i, 'uom', e.target.value)} required placeholder="Sqft" style={{ ...inputStyle, padding: '0.375rem 0.5rem' }} /></td>
                      <td className="py-1.5 pr-2"><input type="number" value={item.quantity} onChange={(e) => updateRow(i, 'quantity', Number(e.target.value))} required min="0" step="any" style={{ ...inputStyle, padding: '0.375rem 0.5rem' }} /></td>
                      <td className="py-1.5 pr-2"><input value={item.remarks} onChange={(e) => updateRow(i, 'remarks', e.target.value)} placeholder="Optional" style={{ ...inputStyle, padding: '0.375rem 0.5rem' }} /></td>
                      <td className="py-1.5"><button type="button" onClick={() => removeRow(i)} className="text-lg leading-none hover:text-red-500" style={{ color: 'var(--muted)' }}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Documents & Drawings</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Attach drawings, PDFs, Excel files — vendors will see these when filling their quotation</p>
            </div>
            <label className="cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg" style={{ background: 'rgba(192,83,39,.1)', color: 'var(--accent)' }}>
              + Attach
              <input ref={attachInputRef} type="file" multiple onChange={handleAttachFiles} className="hidden" />
            </label>
          </div>
          {attachmentFiles.length === 0 ? (
            <p className="text-xs py-2" style={{ color: 'var(--muted)' }}>No files selected (optional)</p>
          ) : (
            <div className="space-y-1.5 mt-2">
              {attachmentFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--line-soft)' }}>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{f.name}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatSize(f.size)}</span>
                    <button type="button" onClick={() => removeAttachment(i)} className="text-xs hover:text-red-500" style={{ color: 'var(--muted)' }}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: 'var(--line)', color: 'var(--ink)', background: 'var(--card)' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="pma-btn">
            {loading ? 'Creating…' : 'Create Tender'}
          </button>
        </div>
      </form>
    </div>
  )
}
