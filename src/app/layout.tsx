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
      <div
  className="min-h-screen bg-cover bg-center bg-no-repeat"
  style={{
    backgroundImage:
      'linear-gradient(rgba(255, 248, 226, 0.55), rgba(255, 248, 226, 0.55)), url("/images/chat-background.png")',
  }}
>
  {children}
</div>
    </html>
  )
}