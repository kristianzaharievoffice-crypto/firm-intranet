'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteNotificationButton({
  notificationId,
}: {
  notificationId: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const deleteNotification = async () => {
    setLoading(true)

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('delete notification error:', error.message)
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={() => void deleteNotification()}
      disabled={loading}
      className="rounded-[16px] border border-red-100 bg-red-50 px-4 py-2 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}

