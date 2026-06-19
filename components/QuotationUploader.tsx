'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function QuotationUploader({ token }: { token: string }) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function upload() {
    if (!files.length) return
    setUploading(true)
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    await fetch(`/api/quote/${token}/attachments`, { method: 'POST', body: fd })
    setFiles([])
    setUploading(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-700 text-sm">Add Attachment</h2>
          <p className="text-xs text-gray-400 mt-0.5">Print your quotation, sign it, then upload the signed copy (or any supporting file) here.</p>
        </div>
        <label className="cursor-pointer flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors text-gray-600">
          + Choose files
          <input ref={inputRef} type="file" multiple onChange={pick} className="hidden" />
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{f.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(f.size)}</span>
              <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0 text-base leading-none">×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={upload}
            disabled={uploading}
            className="mt-2 px-5 py-2 rounded-lg font-semibold text-sm text-white disabled:opacity-60 transition-colors"
            style={{ background: 'var(--accent, #c05327)' }}
          >
            {uploading ? 'Uploading…' : `Upload ${files.length} file${files.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}
    </div>
  )
}
