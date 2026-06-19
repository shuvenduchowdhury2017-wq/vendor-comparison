import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cookies } from 'next/headers'

const mockCookieStore = {
  set: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as never)
  delete process.env.ADMIN_PASSWORD
})

describe('adminLogin', () => {
  it('returns true and sets cookie for correct password', async () => {
    vi.resetModules()
    const { adminLogin } = await import('@/lib/auth')
    const result = await adminLogin('admin123')
    expect(result).toBe(true)
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'admin_session',
      'authenticated',
      expect.objectContaining({ httpOnly: true, maxAge: 604800 }),
    )
  })

  it('returns false and does not set cookie for wrong password', async () => {
    const { adminLogin } = await import('@/lib/auth')
    const result = await adminLogin('badpass')
    expect(result).toBe(false)
    expect(mockCookieStore.set).not.toHaveBeenCalled()
  })

  it('uses ADMIN_PASSWORD env var when set', async () => {
    process.env.ADMIN_PASSWORD = 'mypass'
    vi.resetModules()
    const { adminLogin } = await import('@/lib/auth')
    expect(await adminLogin('mypass')).toBe(true)
    expect(await adminLogin('admin123')).toBe(false)
  })
})

describe('getAdminSession', () => {
  it('returns true when session cookie is "authenticated"', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'authenticated' })
    const { getAdminSession } = await import('@/lib/auth')
    expect(await getAdminSession()).toBe(true)
  })

  it('returns false when session cookie is absent', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { getAdminSession } = await import('@/lib/auth')
    expect(await getAdminSession()).toBe(false)
  })

  it('returns false when session cookie has wrong value', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'garbage' })
    const { getAdminSession } = await import('@/lib/auth')
    expect(await getAdminSession()).toBe(false)
  })
})

describe('adminLogout', () => {
  it('deletes session cookie and redirects to /admin/login', async () => {
    const { adminLogout } = await import('@/lib/auth')
    await expect(adminLogout()).rejects.toThrow('REDIRECT:/admin/login')
    expect(mockCookieStore.delete).toHaveBeenCalledWith('admin_session')
  })
})

describe('requireAdmin', () => {
  it('does not throw when session is valid', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'authenticated' })
    const { requireAdmin } = await import('@/lib/auth')
    await expect(requireAdmin()).resolves.toBeUndefined()
  })

  it('redirects to /admin/login when not authenticated', async () => {
    mockCookieStore.get.mockReturnValue(undefined)
    const { requireAdmin } = await import('@/lib/auth')
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/admin/login')
  })
})
