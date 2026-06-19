'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function TenderStatusToggle({ tenderId, currentStatus }: { tenderId: string; currentStatus: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const nextStatus = currentStatus === 'DRAFT' ? 'ACTIVE' : currentStatus === 'ACTIVE' ? 'CLOSED' : 'DRAFT'
  const label = currentStatus === 'DRAFT' ? 'Activate' : currentStatus === 'ACTIVE' ? 'Close' : 'Re-open'

  async function toggle() {
    setLoading(true)
    await fetch(`/api/tenders/${tenderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
        currentStatus === 'DRAFT' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
        currentStatus === 'ACTIVE' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
        'bg-blue-100 text-blue-700 hover:bg-blue-200'
      }`}
    >
      {loading ? '...' : label}
    </button>
  )
}
