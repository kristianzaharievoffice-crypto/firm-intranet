import './globals.css'
import type { Metadata } from 'next'
import Sidebar from '@/components/Sidebar'

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
      <body className="bg-[#fbf3dc] text-[#1f1a14]">
        <div className="min-h-screen xl:flex">
          <Sidebar />

          <main className="min-w-0 flex-1">
            <div className="px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 xl:px-8 xl:py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}