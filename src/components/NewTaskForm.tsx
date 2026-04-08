'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Employee {
  id: string
  full_name: string | null
}

export default function NewTaskForm({
  employees,
}: {
  employees: Employee[]
}) {
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!title.trim() || !assignedTo) {
      setMessage('Попълни заглавие и избери служител.')
      return
    }

    setIsSaving(true)

    const { error } = await supabase.rpc('create_task_with_notification', {
      task_title: title.trim(),
      task_description: description.trim(),
      task_assigned_to: assignedTo,
      task_due_date: dueDate || null,
      task_priority: priority,
    })

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    window.location.href = '/tasks'
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4"
    >
      <div>
        <h1 className="text-2xl font-bold">Нова задача</h1>
        <p className="text-sm text-gray-500 mt-1">
          Създай задача и я възложи на служител
        </p>
      </div>

      <input
        className="w-full border rounded-2xl px-4 py-3"
        placeholder="Заглавие"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full min-h-32 border rounded-2xl px-4 py-3"
        placeholder="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <select
        className="w-full border rounded-2xl px-4 py-3 bg-white"
        value={assignedTo}
        onChange={(e) => setAssignedTo(e.target.value)}
      >
        <option value="">Избери служител</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name ?? 'Без име'}
          </option>
        ))}
      </select>

      <input
        type="date"
        className="w-full border rounded-2xl px-4 py-3"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />

      <select
        className="w-full border rounded-2xl px-4 py-3 bg-white"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
      >
        <option value="low">Нисък приоритет</option>
        <option value="medium">Среден приоритет</option>
        <option value="high">Висок приоритет</option>
      </select>

      <button
        type="submit"
        disabled={isSaving}
        className="bg-[#d4af37] hover:bg-[#b8962e] text-white px-5 py-3 rounded-2xl disabled:opacity-60"
      >
        {isSaving ? 'Записване...' : 'Създай задача'}
      </button>

      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  )
}