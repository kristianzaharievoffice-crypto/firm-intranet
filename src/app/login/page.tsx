'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

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
      setMessage(uiText.login.invalidCredentials)
      setIsLoading(false)
      return
    }

    window.location.href = '/feed'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fcfbf8] p-6">
      <div className="w-full max-w-md rounded-[32px] border border-[#ece5d8] bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-[#1f1a14]">
            {uiText.login.title}
          </h1>
          <p className="mt-3 text-sm text-[#7b746b]">
            {uiText.login.subtitle}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder={uiText.login.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          />

          <input
            type="password"
            placeholder={uiText.login.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
          >
            {isLoading ? uiText.login.signingIn : uiText.login.signIn}
          </button>

          {message && <p className="text-sm text-[#7b746b]">{message}</p>}
        </form>
      </div>
    </main>
  )
}