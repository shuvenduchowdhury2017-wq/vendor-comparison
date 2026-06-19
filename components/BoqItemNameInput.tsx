'use client'

import { useRef, useState, useEffect } from 'react'

export interface BoqRef {
  id: number
  itemName: string
  description: string
  uom: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (ref: BoqRef) => void
  inputStyle?: React.CSSProperties
}

export default function BoqItemNameInput({ value, onChange, onSelect, inputStyle }: Props) {
  const [results, setResults] = useState<BoqRef[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(-1)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQuery = useRef('')

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function runSearch(q: string) {
    const query = q.trim()
    if (query.length < 2) { setResults([]); setOpen(false); return }
    lastQuery.current = query
    setLoading(true)
    fetch(`/api/boq-reference/search?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: BoqRef[]) => {
        if (lastQuery.current !== query) return // a newer keystroke superseded this
        setResults(data)
        setOpen(true)
        setHighlight(-1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  function handleType(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    onChange(v)
    setOpen(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => runSearch(v), 200)
  }

  function choose(ref: BoqRef) {
    onSelect(ref)
    setOpen(false)
    setResults([])
    setHighlight(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault()
      choose(results[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={handleType}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        required
        placeholder="Type to search BOQ references…"
        autoComplete="off"
        style={{ ...inputStyle, padding: '0.375rem 0.5rem' }}
      />
      {open && (loading || results.length > 0) && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 2px)', left: 0, zIndex: 30,
            width: 'min(560px, 80vw)', maxHeight: '320px', overflowY: 'auto',
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px',
            boxShadow: '0 8px 28px rgba(0,0,0,.12)',
          }}
        >
          {loading && results.length === 0 ? (
            <div style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>Searching…</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                // onMouseDown fires before input blur, so the selection isn't lost
                onMouseDown={(e) => { e.preventDefault(); choose(r) }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                  padding: '0.5rem 0.75rem', border: 'none',
                  borderBottom: i < results.length - 1 ? '1px solid var(--line-soft)' : 'none',
                  background: i === highlight ? 'var(--line-soft)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)' }}>{r.itemName}</span>
                  {r.uom && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--muted)', flexShrink: 0 }}>· {r.uom}</span>
                  )}
                </div>
                {r.description && (
                  <div
                    style={{
                      fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.125rem',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}
                  >
                    {r.description}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
