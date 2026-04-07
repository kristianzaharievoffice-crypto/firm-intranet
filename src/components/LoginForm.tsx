'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setIsLoading(false)
      return
    }

    window.location.href = '/wall'
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <input
          type="email"
          placeholder="Въведи email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Парола</label>
        <input
          type="password"
          placeholder="Въведи парола"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-black text-white py-3 rounded-2xl disabled:opacity-60 font-medium"
      >
        {isLoading ? 'Влизане...' : 'Вход'}
      </button>

      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  )
}