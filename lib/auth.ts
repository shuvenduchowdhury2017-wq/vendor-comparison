'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE = 'admin_session'
const ADMIN_TOKEN = 'authenticated'

export async function adminLogin(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD ?? 'admin123'
  if (password === expected) {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, ADMIN_TOKEN, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return true
  }
  return false
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/admin/login')
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE)
  return cookie?.value === ADMIN_TOKEN
}

export async function requireAdmin() {
  const ok = await getAdminSession()
  if (!ok) redirect('/admin/login')
}
