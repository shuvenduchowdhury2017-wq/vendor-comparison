'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import PrimarcLogo from './PrimarcLogo'

const TABS = [
  { label: 'Tenders', href: '/admin' },
  { label: 'Masters', href: '/admin/masters' },
  { label: 'Summary', href: '/admin/summary' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin' || pathname.startsWith('/admin/tenders') || pathname.startsWith('/admin/projects')
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="sticky top-0 z-50"
      style={{ background: 'var(--nav-bg)', borderBottom: '1px solid rgba(255,255,255,.08)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4" style={{ height: '60px' }}>

        {/* Brand — logo larger and accent-colored */}
        <Link href="/admin" className="flex items-center gap-3 flex-shrink-0" style={{ textDecoration: 'none' }}>
          <PrimarcLogo height={20} style={{ color: 'var(--accent)' }} />
          <span
            className="text-xs font-semibold tracking-widest uppercase hidden sm:block"
            style={{
              color: 'rgba(233,228,219,.35)',
              borderLeft: '1px solid rgba(233,228,219,.14)',
              paddingLeft: '12px',
              letterSpacing: '.20em',
            }}
          >
            TenderDesk
          </span>
        </Link>

        {/* Tabs */}
        <div className="flex items-center gap-0.5">
          {TABS.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={
                  active
                    ? { background: 'var(--accent)', color: '#fff' }
                    : { color: 'rgba(233,228,219,.50)' }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(233,228,219,.07)'
                    e.currentTarget.style.color = 'rgba(233,228,219,.88)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = ''
                    e.currentTarget.style.color = 'rgba(233,228,219,.50)'
                  }
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="text-xs font-semibold tracking-wide uppercase transition-colors flex-shrink-0"
          style={{ color: 'rgba(233,228,219,.30)', letterSpacing: '.08em' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(233,228,219,.70)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(233,228,219,.30)' }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
