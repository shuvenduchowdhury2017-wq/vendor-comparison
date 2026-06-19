'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Invite = {
  id: string
  token: string
  status: string
  vendor: { name: string; email: string; category: string }
  quotation: { id: string } | null
}

export default function VendorInviteList({ invites, tenderId }: { invites: Invite[]; tenderId: string }) {
  const router = useRouter()
  const [copied, setCopied] = useState<string | null>(null)

  function copyLink(token: string) {
    const url = `${window.location.origin}/quote/${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  async function deleteInvite(id: string) {
    if (!confirm('Remove this vendor invite?')) return
    await fetch(`/api/tenders/${tenderId}/invites/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  if (invites.length === 0) {
    return <p className="text-sm text-gray-400 mt-2">No vendors invited yet.</p>
  }

  return (
    <div className="space-y-2 mt-2">
      {invites.map((invite) => (
        <div key={invite.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 bg-white hover:bg-gray-50">
          <div className="min-w-0">
            <div className="font-medium text-sm text-gray-900 truncate">{invite.vendor.name}</div>
            <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
              <span>{invite.vendor.email}</span>
              {invite.vendor.category && <span>• {invite.vendor.category}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              invite.quotation ? 'bg-green-100 text-green-700' :
              invite.status === 'VIEWED' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {invite.quotation ? 'Submitted' : invite.status === 'VIEWED' ? 'Viewed' : 'Pending'}
            </span>
            <button
              onClick={() => copyLink(invite.token)}
              className="text-xs text-blue-600 hover:underline"
            >
              {copied === invite.token ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={() => deleteInvite(invite.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
