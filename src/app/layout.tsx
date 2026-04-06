import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
title: 'Firm Intranet',
description: 'Internal company network',
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
