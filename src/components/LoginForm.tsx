'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
const supabase = createClient()
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [message, setMessage] = useState('')

const handleLogin = async (e: React.FormEvent) => {
e.preventDefault()

const { error } = await supabase.auth.signInWithPassword({
email,
password,
})

if (error) {
setMessage(error.message)
return
}

window.location.href = '/wall'
}

return (
<form onSubmit={handleLogin} className="space-y-4 bg-white p-6 rounded-2xl shadow-md w-full max-w-md">
<h2 className="text-2xl font-bold">Вход</h2>

<input
type="email"
placeholder="Email"
value={email}
onChange={(e) => setEmail(e.target.value)}
className="w-full border rounded-xl px-4 py-2"
/>

<input
type="password"
placeholder="Парола"
value={password}
onChange={(e) => setPassword(e.target.value)}
className="w-full border rounded-xl px-4 py-2"
/>

<button type="submit" className="w-full bg-black text-white py-2 rounded-xl">
Влез
</button>

{message && <p className="text-sm text-red-600">{message}</p>}
</form>
)
}