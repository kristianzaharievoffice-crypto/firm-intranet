import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RCX Network',
  description: 'RCX Network',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="bg">
      <body>{children}</body>
    </html>
  )
}