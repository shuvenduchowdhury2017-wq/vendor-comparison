import type { Metadata } from 'next'
import { Poppins, Fraunces } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
})

const fraunces = Fraunces({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
})

export const metadata: Metadata = {
  title: 'TenderDesk — Vendor Comparison System',
  description:
    'Upload a BOQ, invite vendors via secure links, collect rates on any device, and get an auto-ranked Comparative Statement.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${poppins.variable} ${fraunces.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
