'use client'

import { useState, useRef } from 'react'

type Attachment = {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  filePath: string
}

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
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '🗜️'
  return '📎'
}

export default function TenderAttachments({
  tenderId,
  initialAttachments,
}: {
  tenderId: string
  initialAttachments: Attachment[]
}) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    setError('')
    const fd = new FormData()
    for (const f of files) fd.append('files', f)

    const res = await fetch(`/api/tenders/${tenderId}/attachments`, { method: 'POST', body: fd })
    if (res.ok) {
      const created: Attachment[] = await res.json()
      setAttachments((prev) => [...prev, ...created])
    } else {
      setError('Upload failed')
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this attachment?')) return
    const res = await fetch(`/api/tenders/${tenderId}/attachments`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachmentId: id }),
    })
    if (res.ok) setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
          Documents & Drawings
          {attachments.length > 0 && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--muted)' }}>
              ({attachments.length})
            </span>
          )}
        </h2>
        <label
          className="cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: uploading ? 'var(--line-soft)' : 'rgba(192,83,39,.1)', color: 'var(--accent)' }}
        >
          {uploading ? 'Uploading…' : '+ Attach Files'}
          <input ref={inputRef} type="file" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {attachments.length === 0 ? (
        <div
          className="text-center py-6 rounded-lg border-2 border-dashed"
          style={{ borderColor: 'var(--line)' }}
        >
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            No documents attached. Attach drawings, PDFs, Excel files for vendor reference.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ background: 'var(--line-soft)', border: '1px solid var(--line)' }}
            >
              <span className="text-lg flex-shrink-0">{fileIcon(a.mimeType, a.fileName)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                  {a.fileName}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{formatSize(a.fileSize)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={a.filePath}
                  download={a.fileName}
                  className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
                  style={{ background: 'var(--card)', color: 'var(--accent)', border: '1px solid var(--line)' }}
                >
                  ↓ Download
                </a>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-xs hover:text-red-600 transition-colors"
                  style={{ color: 'var(--muted)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
