'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PrimarcLogo from '@/components/PrimarcLogo'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Incorrect password')
      setLoading(false)
    }
  }

  return (
    <div className="pma-shell">
      <div className="pma-card">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <PrimarcLogo height={28} style={{ color: 'var(--accent)' }} />
          <div style={{ height: '1px', width: '100%', background: 'var(--line)', margin: '4px 0' }} />
          <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--ink-soft)', letterSpacing: '.18em' }}>
            TenderDesk &nbsp;·&nbsp; Procurement Platform
          </p>
        </div>

        <div style={{ height: '1px', background: 'var(--line)', marginBottom: '1.75rem' }} />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'var(--ink-soft)' }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pma-input"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm font-medium" style={{ color: '#e05555' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} className="pma-btn pma-btn-full mt-1">
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}
