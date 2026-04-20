import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RCX NETWORK',
  description: 'Inside information platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#fbf3dc] text-[#1f1a14]">{children}</body>
    </html>
  )
}