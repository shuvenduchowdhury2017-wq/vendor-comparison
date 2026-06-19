import { requireAdmin } from '@/lib/auth'
import AdminNav from '@/components/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="min-h-screen" style={{ background: 'var(--paper)' }}>
      <AdminNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7">{children}</main>
    </div>
  )
}
