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
      <body className="bg-gradient-to-br from-[#fffaf0] via-[#fbf3dc] to-[#f4e7c1] text-[#1f1a14]">
</body>
    </html>
  )
}