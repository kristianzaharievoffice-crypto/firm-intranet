'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function EventResponseForm({
  eventId,
  initialResponse,
  userId,
}: {
  eventId: string
  initialResponse: 'yes' | 'no' | null
  userId: string
}) {
  const supabase = createClient()
  const [response, setResponse] = useState<'yes' | 'no' | ''>(initialResponse ?? '')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setMessage('')

    if (!response) {
      setMessage('Избери отговор.')
      return
    }

    setIsSaving(true)

    const { error } = await supabase
      .from('event_responses')
      .upsert(
        {
          event_id: eventId,
          user_id: userId,
          response,
        },
        { onConflict: 'event_id,user_id' }
      )

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    setMessage('Отговорът е записан.')
    setIsSaving(false)
    window.location.reload()
  }

  return (
    <div className="mt-5 border-t pt-4">
      <p className="font-medium mb-3">Моят отговор</p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setResponse('yes')}
          className={`px-4 py-2 rounded-2xl border ${
            response === 'yes' ? 'bg-green-600 text-white border-green-600' : 'bg-white'
          }`}
        >
          Ще присъствам
        </button>

        <button
          type="button"
          onClick={() => setResponse('no')}
          className={`px-4 py-2 rounded-2xl border ${
            response === 'no' ? 'bg-red-600 text-white border-red-600' : 'bg-white'
          }`}
        >
          Няма да присъствам
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-2xl bg-black text-white disabled:opacity-60"
        >
          {isSaving ? 'Записване...' : 'Запази'}
        </button>
      </div>

      {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
    </div>
  )
}
