'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
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
      setMessage('Invalid email or password.')
      setIsLoading(false)
      return
    }

    window.location.href = '/feed'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee] p-6">
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black tracking-tight text-[#111111]">
            RCX NETWORK
          </h1>
          <p className="mt-4 text-lg text-[#6f6a62]">
            Internal communication and reporting system
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#202020]">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[20px] border border-[#d8d1c4] bg-white px-5 py-4 outline-none transition focus:border-[#c9a227]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#202020]">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[20px] border border-[#d8d1c4] bg-white px-5 py-4 outline-none transition focus:border-[#c9a227]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-[20px] bg-black px-5 py-4 text-lg font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>

          {message && (
            <p className="text-center text-sm text-[#7b746b]">{message}</p>
          )}
        </form>
      </div>
    </main>
  )
}