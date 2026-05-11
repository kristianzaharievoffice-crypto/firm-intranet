'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ClearNotificationsButton() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClear = async () => {
    setLoading(true)

    const { error } = await supabase.rpc('clear_all_my_notifications')

    if (error) {
      console.error(error.message)
    }

    setLoading(false)
    router.refresh()
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


