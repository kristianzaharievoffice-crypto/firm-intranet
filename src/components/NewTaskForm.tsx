'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uiText } from '@/lib/ui-text'

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
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!title.trim() || !assignedTo) {
      setMessage(uiText.tasks.fillRequired)
      return
    }

    setIsSaving(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage(uiText.common.noActiveUser)
      setIsSaving(false)
      return
    }

    const { data: createdTask, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        due_date: dueDate || null,
        priority,
        status: 'new',
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    if (files.length) {
      const attachmentRows = []

      for (const selectedFile of files) {
        const originalName = selectedFile.name || 'file'
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `${createdTask.id}/${Date.now()}_${safeName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('task-files')
          .upload(filePath, selectedFile, {
            upsert: false,
            contentType: selectedFile.type || undefined,
          })

        if (uploadError) {
          setMessage(`Upload error: ${uploadError.message}`)
          setIsSaving(false)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from('task-files')
          .getPublicUrl(uploadData.path)

        attachmentRows.push({
          task_id: createdTask.id,
          file_name: originalName,
          file_url: publicUrlData.publicUrl,
          file_path: uploadData.path,
          uploaded_by: user.id,
        })
      }

      const { error: attachmentError } = await supabase
        .from('task_attachments')
        .insert(attachmentRows)

      if (attachmentError) {
        setMessage(attachmentError.message)
        setIsSaving(false)
        return
      }
    }

    if (assignedTo !== user.id) {
      await supabase.from('notifications').insert({
        user_id: assignedTo,
        type: 'task',
        title: 'New task',
        body: title.trim(),
        link: '/tasks',
        is_read: false,
      })
    }

    window.location.href = '/tasks'
  }

  return (
    <form className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-[#1f1a14]">
          {uiText.tasks.newTaskTitle}
        </h1>
        <p className="mt-2 text-sm text-[#7b746b]">
          {uiText.tasks.newTaskSubtitle}
        </p>
      </div>

      <div className="grid gap-4">
        <input
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder={uiText.tasks.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="min-h-32 w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          placeholder={uiText.tasks.descriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        >
          <option value="">{uiText.tasks.selectEmployee}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name ?? uiText.common.user}
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
            <option value="low">{uiText.tasks.low}</option>
            <option value="medium">{uiText.tasks.medium}</option>
            <option value="high">{uiText.tasks.high}</option>
          </select>
        </div>

        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="w-full rounded-[20px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3"
        />

        {files.length ? (
          <p className="text-sm text-[#7b746b]">
            Selected files: {files.map((selectedFile) => selectedFile.name).join(', ')}
          </p>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-[20px] bg-[#c9a227] px-5 py-3 font-semibold text-white hover:bg-[#a88414] disabled:opacity-60"
        >
          {isSaving ? uiText.tasks.saving : uiText.tasks.createTask}
        </button>

        {message && <p className="text-sm text-[#7b746b]">{message}</p>}
      </div>
    </form>
  )
}


