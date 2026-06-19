'use client'

import { useState, useEffect, useCallback } from 'react'

type Project = { id: string; name: string; location: string; createdAt: string }
type WorkType = { id: string; name: string; createdAt: string }
type Vendor = { id: string; name: string; email: string; category: string; createdAt: string; _count: { invites: number } }

type Tab = 'projects' | 'worktypes' | 'vendors'

export default function MastersPage() {
  const [tab, setTab] = useState<Tab>('projects')

  const [projects, setProjects] = useState<Project[]>([])
  const [workTypes, setWorkTypes] = useState<WorkType[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])

  const [newProject, setNewProject] = useState({ name: '', location: '' })
  const [newWorkType, setNewWorkType] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const fetchProjects = useCallback(() => {
    fetch('/api/projects').then((r) => r.json()).then(setProjects).catch(() => {})
  }, [])
  const fetchWorkTypes = useCallback(() => {
    fetch('/api/work-types').then((r) => r.json()).then(setWorkTypes).catch(() => {})
  }, [])
  const fetchVendors = useCallback(() => {
    fetch('/api/vendors').then((r) => r.json()).then(setVendors).catch(() => {})
  }, [])

  useEffect(() => { fetchProjects(); fetchWorkTypes(); fetchVendors() }, [fetchProjects, fetchWorkTypes, fetchVendors])

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 2500)
  }

  async function addProject(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject),
    })
    if (res.ok) { setNewProject({ name: '', location: '' }); fetchProjects(); flash('Project added') }
    setSaving(false)
  }

  async function deleteProject(id: string, name: string) {
    if (!confirm(`Remove project "${name}"? Existing tenders will not be deleted.`)) return
    await fetch('/api/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchProjects()
  }

  async function addWorkType(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/work-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newWorkType }),
    })
    if (res.ok) { setNewWorkType(''); fetchWorkTypes(); flash('Work type added') }
    setSaving(false)
  }

  async function deleteWorkType(id: string, name: string) {
    if (!confirm(`Remove work type "${name}"?`)) return
    await fetch('/api/work-types', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    fetchWorkTypes()
  }

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'projects', label: 'Projects', count: projects.length },
    { id: 'worktypes', label: 'Work Types', count: workTypes.length },
    { id: 'vendors', label: 'Vendors', count: vendors.length },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>Masters</h1>
        {msg && (
          <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: '#dcf0e4', color: '#2a5c3b' }}>
            {msg}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl p-1" style={{ background: 'var(--line-soft)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={
              tab === t.id
                ? { background: 'var(--card)', color: 'var(--ink)', boxShadow: '0 1px 4px rgba(0,0,0,.1)' }
                : { background: 'transparent', color: 'var(--muted)' }
            }
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Projects ── */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <div className="rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            {projects.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>No projects yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)' }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Project</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Location</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td className="px-5 py-3 font-semibold" style={{ color: 'var(--ink)' }}>{p.name}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{p.location || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteProject(p.id, p.name)}
                          className="text-xs hover:text-red-600 transition-colors"
                          style={{ color: 'var(--muted)' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Add Project</h3>
            <form onSubmit={addProject} className="flex gap-3 flex-wrap">
              <input
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                required
                placeholder="Project name (e.g. AADVIKA)"
                className="pma-input flex-1 min-w-40"
              />
              <input
                value={newProject.location}
                onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                placeholder="Location (e.g. Howrah)"
                className="pma-input flex-1 min-w-32"
              />
              <button type="submit" disabled={saving} className="pma-btn">
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Work Types ── */}
      {tab === 'worktypes' && (
        <div className="space-y-4">
          <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            {workTypes.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No work types yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {workTypes.map((wt) => (
                  <div
                    key={wt.id}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
                    style={{ background: 'var(--line-soft)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                  >
                    {wt.name}
                    <button
                      onClick={() => deleteWorkType(wt.id, wt.name)}
                      className="ml-0.5 text-base leading-none hover:text-red-500 transition-colors"
                      style={{ color: 'var(--muted)' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>Add Work Type</h3>
            <form onSubmit={addWorkType} className="flex gap-3">
              <input
                value={newWorkType}
                onChange={(e) => setNewWorkType(e.target.value)}
                required
                placeholder="e.g. Civil Work, Electrical, Plumbing"
                className="pma-input flex-1"
              />
              <button type="submit" disabled={saving} className="pma-btn">
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Vendors ── */}
      {tab === 'vendors' && (
        <div className="rounded-xl border" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          {vendors.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No vendors yet.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Vendors are added when you invite them to a tender.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Vendor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Category</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Tenders</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                    <td className="px-5 py-3 font-medium" style={{ color: 'var(--ink)' }}>{v.name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{v.email}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{v.category || '—'}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: 'var(--accent)' }}>{v._count.invites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
