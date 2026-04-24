import './globals.css'
import type { Metadata } from 'next'

export const metadata = {
  title: 'RCX Network',
  description: 'Internal company platform',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
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