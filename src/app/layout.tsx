import './globals.css'

export const metadata = {
  title: 'RCX Network',
  description: 'RCX Network',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bg">
      <body>{children}</body>
    </html>
  )
}