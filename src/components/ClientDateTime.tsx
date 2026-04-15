'use client'

import { useEffect, useState } from 'react'

export default function ClientDateTime({
  value,
  mode = 'datetime',
}: {
  value: string | null | undefined
  mode?: 'datetime' | 'date'
}) {
  const [formatted, setFormatted] = useState('')

  useEffect(() => {
    if (!value) {
      setFormatted('-')
      return
    }

    const date = new Date(value)

    const text =
      mode === 'date'
        ? date.toLocaleDateString('en-GB')
        : date.toLocaleString('en-GB')

    setFormatted(text)
  }, [value, mode])

  return <span suppressHydrationWarning>{formatted || '...'}</span>
}