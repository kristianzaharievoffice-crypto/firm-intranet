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
    <form className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-[#1f1a14]">
          Нова задача
        </h1>
        <p className="mt-2 text-sm text-[#7b746b]">
          Създай задача и я възложи на служител
        </p>
      </div>

      <div className="grid gap-4">
        <input
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Заглавие"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="min-h-32 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder="Описание"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
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

        <div className="grid gap-4 md:grid-cols-2">
          <input
            type="date"
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <select
            className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Нисък приоритет</option>
            <option value="medium">Среден приоритет</option>
            <option value="high">Висок приоритет</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? 'Записване...' : 'Създай задача'}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}