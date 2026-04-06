'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewPostForm() {
const supabase = createClient()
const [content, setContent] = useState('')
const [message, setMessage] = useState('')

const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault()
setMessage('')

const {
data: { user },
error: userError,
} = await supabase.auth.getUser()

if (userError || !user) {
setMessage('Няма активен потребител.')
return
}

const { error } = await supabase.from('wall_posts').insert({
employee_id: user.id,
content,
})

if (error) {
setMessage(error.message)
return
}

setContent('')
setMessage('Публикацията е качена успешно.')
window.location.reload()
}

return (
<form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
<h2 className="text-xl font-bold">Добави отчет</h2>
<textarea
value={content}
onChange={(e) => setContent(e.target.value)}
placeholder="Опиши какво свърши днес..."
className="w-full min-h-32 border rounded-xl px-4 py-3"
/>
<button className="bg-black text-white px-4 py-2 rounded-xl" type="submit">
Публикувай
</button>
{message && <p className="text-sm text-gray-600">{message}</p>}
</form>
)
}