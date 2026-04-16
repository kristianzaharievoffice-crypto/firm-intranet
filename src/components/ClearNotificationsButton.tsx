'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ClearNotificationsButton() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleClear = async () => {
    setLoading(true)

    const { error } = await supabase.rpc('clear_all_my_notifications')

    if (error) {
      console.error(error.message)
    }

    setLoading(false)
  }

  return (
    <button
      onClick={handleClear}
      disabled={loading}
      className="rounded-[20px] border border-[#e5d6ae] bg-white px-5 py-3 font-semibold text-[#1f1a14] hover:bg-[#fbf6e8]"
    >
      {loading ? 'Clearing...' : 'Clear all'}
    </button>
  )
}