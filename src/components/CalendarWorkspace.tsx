'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import EconomicCalendarWidget from '@/components/EconomicCalendarWidget'

type TabKey = 'internal' | 'planner' | 'team' | 'economic'

type ProfileRow = {
  id: string
  full_name: string | null
}

type InternalTask = {
  id: string
  title: string
  due_date: string | null
  assigned_to: string | null
}

type InternalEvent = {
  id: string
  title: string
  date: string | null
  time: string | null
}

type PlannerItem = {
  id: string
  user_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  is_done: boolean
  created_at?: string | null
  updated_at?: string | null
}

type FormState = {
  title: string
  description: string
  startAt: string
  endAt: string
  isDone: boolean
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDateTimeLocal(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function toDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dateOnlyLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB')
}

function makeDefaultForm(selectedDate: string): FormState {
  return {
    title: '',
    description: '',
    startAt: `${selectedDate}T09:00`,
    endAt: `${selectedDate}T10:00`,
    isDone: false,
  }
}

function itemDateKey(item: PlannerItem) {
  const d = new Date(item.start_at)
  return formatDateKey(d)
}

function getMonthGrid(monthDate: Date) {
  const firstDay = startOfMonth(monthDate)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - startWeekday)

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + index)
    return day
  })
}

function sortPlannerItems(items: PlannerItem[]) {
  return [...items].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )
}

function PlannerMonthGrid({
  monthDate,
  selectedDate,
  countsByDate,
  onSelectDate,
}: {
  monthDate: Date
  selectedDate: string
  countsByDate: Record<string, number>
  onSelectDate: (dateKey: string) => void
}) {
  const days = getMonthGrid(monthDate)
  const monthIndex = monthDate.getMonth()

  return (
    <div className="overflow-hidden rounded-2xl border border-yellow-200/60 bg-white/95 shadow-sm">
      <div className="grid grid-cols-7 border-b border-yellow-100 bg-yellow-50/50 text-xs font-semibold uppercase tracking-wide text-neutral-600">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
          <div key={label} className="px-3 py-3 text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dateKey = formatDateKey(day)
          const isCurrentMonth = day.getMonth() === monthIndex
          const isSelected = selectedDate === dateKey
          const count = countsByDate[dateKey] ?? 0

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className={`min-h-[112px] border-b border-r border-yellow-100 p-3 text-left transition ${
                isSelected
                  ? 'bg-yellow-50 ring-2 ring-inset ring-yellow-300'
                  : 'bg-white hover:bg-yellow-50/40'
              } ${!isCurrentMonth ? 'text-neutral-400' : 'text-neutral-900'}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold">{day.getDate()}</span>

                {count > 0 ? (
                  <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-2 py-0.5 text-[11px] font-semibold text-neutral-900">
                    {count}
                  </span>
                ) : null}
              </div>

              {count > 0 ? (
                <div className="mt-3 space-y-1">
                  {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
                    <div
                      key={`${dateKey}-${index}`}
                      className="h-1.5 rounded-full bg-yellow-300/80"
                    />
                  ))}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarWorkspace({
  currentUserId,
  currentUserRole,
  profiles,
  internalTasks,
  internalEvents,
  initialPlannerItems,
}: {
  currentUserId: string
  currentUserRole: string
  profiles: ProfileRow[]
  internalTasks: InternalTask[]
  internalEvents: InternalEvent[]
  initialPlannerItems: PlannerItem[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [activeTab, setActiveTab] = useState<TabKey>('internal')
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()))
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>(
    sortPlannerItems(initialPlannerItems)
  )
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()))
  const [selectedUserId, setSelectedUserId] = useState(currentUserId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [form, setForm] = useState<FormState>(() =>
    makeDefaultForm(formatDateKey(new Date()))
  )

  useEffect(() => {
    if (!saving && !editingId) {
      setPlannerItems(sortPlannerItems(initialPlannerItems))
    }
  }, [editingId, initialPlannerItems, saving])

  const profileMap = useMemo(
    () =>
      new Map(profiles.map((profile) => [profile.id, profile.full_name ?? 'User'])),
    [profiles]
  )

  const myItems = useMemo(
    () => plannerItems.filter((item) => item.user_id === currentUserId),
    [plannerItems, currentUserId]
  )

  const viewedUserItems = useMemo(
    () => plannerItems.filter((item) => item.user_id === selectedUserId),
    [plannerItems, selectedUserId]
  )

  const myCountsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of myItems) {
      const key = itemDateKey(item)
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [myItems])

  const viewedCountsByDate = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of viewedUserItems) {
      const key = itemDateKey(item)
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [viewedUserItems])

  const mySelectedDateItems = useMemo(
    () => sortPlannerItems(myItems.filter((item) => itemDateKey(item) === selectedDate)),
    [myItems, selectedDate]
  )

  const viewedSelectedDateItems = useMemo(
    () =>
      sortPlannerItems(
        viewedUserItems.filter((item) => itemDateKey(item) === selectedDate)
      ),
    [viewedUserItems, selectedDate]
  )

  const monthLabel = monthDate.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const resetForm = (dateKey = selectedDate) => {
    setEditingId(null)
    setParticipantIds([])
    setForm(makeDefaultForm(dateKey))
  }

  const onSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey)
    if (!editingId) {
      setForm(makeDefaultForm(dateKey))
    }
  }

  const savePlannerItem = async () => {
    if (!form.title.trim()) {
      setStatusText('Title is required')
      return
    }

    if (!form.startAt || !form.endAt) {
      setStatusText('Start and end time are required')
      return
    }

    const startIso = new Date(form.startAt).toISOString()
    const endIso = new Date(form.endAt).toISOString()

    if (new Date(endIso) <= new Date(startIso)) {
      setStatusText('End time must be after start time')
      return
    }

    setSaving(true)
    setStatusText(editingId ? 'Updating...' : 'Saving...')

    if (editingId) {
      const { data, error } = await supabase
        .from('personal_calendar_items')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_at: startIso,
          end_at: endIso,
          is_done: form.isDone,
        })
        .eq('id', editingId)
        .eq('user_id', currentUserId)
        .select(
          'id, user_id, title, description, start_at, end_at, is_done, created_at, updated_at'
        )
        .single()

      if (error || !data) {
        setSaving(false)
        setStatusText('Update failed')
        return
      }

      const next = plannerItems.map((item) =>
        item.id === editingId ? (data as PlannerItem) : item
      )
      setPlannerItems(sortPlannerItems(next))
      setStatusText('Updated')
    } else {
      const targetUserIds = Array.from(new Set([currentUserId, ...participantIds]))

      const { data, error } = await supabase.rpc(
        'create_planner_items_with_notifications',
        {
          item_title: form.title.trim(),
          item_description: form.description.trim() || null,
          item_start_at: startIso,
          item_end_at: endIso,
          item_is_done: form.isDone,
          target_user_ids: targetUserIds,
        }
      )

      if (error || !data) {
        setSaving(false)
        setStatusText('Create failed')
        return
      }

      setPlannerItems(sortPlannerItems([...plannerItems, ...(data as PlannerItem[])]))
      setStatusText('Saved')
    }

    setSaving(false)
    resetForm(formatDateKey(new Date(form.startAt)))
  }

  const startEditItem = (item: PlannerItem) => {
    setEditingId(item.id)
    setSelectedDate(itemDateKey(item))
    setForm({
      title: item.title,
      description: item.description ?? '',
      startAt: formatDateTimeLocal(new Date(item.start_at)),
      endAt: formatDateTimeLocal(new Date(item.end_at)),
      isDone: item.is_done,
    })
  }

  const deletePlannerItem = async (id: string) => {
    const ok = window.confirm('Delete this planner item?')
    if (!ok) return

    setSaving(true)
    setStatusText('Deleting...')

    const { error } = await supabase
      .from('personal_calendar_items')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUserId)

    if (error) {
      setSaving(false)
      setStatusText('Delete failed')
      return
    }

    setPlannerItems((prev) => prev.filter((item) => item.id !== id))
    if (editingId === id) {
      resetForm(selectedDate)
    }
    setSaving(false)
    setStatusText('Deleted')
  }

  const toggleDone = async (item: PlannerItem) => {
    const { data, error } = await supabase
      .from('personal_calendar_items')
      .update({
        is_done: !item.is_done,
      })
      .eq('id', item.id)
      .eq('user_id', currentUserId)
      .select(
        'id, user_id, title, description, start_at, end_at, is_done, created_at, updated_at'
      )
      .single()

    if (error || !data) {
      setStatusText('Could not update item')
      return
    }

    setPlannerItems((prev) =>
      sortPlannerItems(prev.map((row) => (row.id === item.id ? (data as PlannerItem) : row)))
    )
    setStatusText('Updated')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-yellow-200/60 bg-white/95 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Calendar</h1>
            <p className="text-sm text-neutral-500">
              Internal planning, personal scheduling, team availability and economic events
            </p>
          </div>

          <div className="text-sm text-neutral-500">
            Signed in as{' '}
            <span className="font-medium text-neutral-700">
              {profileMap.get(currentUserId) ?? 'User'}
            </span>{' '}
            · {currentUserRole}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ['internal', 'Internal'],
            ['planner', 'My Planner'],
            ['team', 'Team Availability'],
            ['economic', 'Economic'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as TabKey)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeTab === key
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-300 text-neutral-900'
                  : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'internal' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-yellow-200/60 bg-white/95 p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Tasks
            </h2>

            {internalTasks.length ? (
              <div className="space-y-3">
                {internalTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-yellow-100 bg-gradient-to-br from-white to-yellow-50/60 p-4"
                  >
                    <div className="text-base font-semibold text-neutral-900">
                      {task.title}
                    </div>
                    {currentUserRole === 'admin' ? (
                      <div className="mt-1 text-sm text-neutral-600">
                        Assigned to:{' '}
                        <span className="font-medium text-neutral-700">
                          {task.assigned_to
                            ? profileMap.get(task.assigned_to) ?? 'User'
                            : 'User'}
                        </span>
                      </div>
                    ) : null}
                    <div className="mt-2 text-sm text-neutral-500">
                      Due date:{' '}
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString('en-GB')
                        : '-'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">Nothing is scheduled yet.</div>
            )}
          </section>

          <section className="rounded-2xl border border-yellow-200/60 bg-white/95 p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Events
            </h2>

            {internalEvents.length ? (
              <div className="space-y-3">
                {internalEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-yellow-100 bg-gradient-to-br from-white to-yellow-50/60 p-4"
                  >
                    <div className="text-base font-semibold text-neutral-900">
                      {event.title}
                    </div>
                    <div className="mt-2 text-sm text-neutral-500">
                      Date:{' '}
                      {event.date
                        ? new Date(event.date).toLocaleDateString('en-GB')
                        : '-'}
                    </div>
                    <div className="mt-1 text-sm text-neutral-500">
                      Time: {event.time || '-'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">Nothing is scheduled yet.</div>
            )}
          </section>
        </div>
      ) : null}


      {activeTab === 'planner' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-200/60 bg-white/95 p-4 shadow-sm">
            <div className="text-lg font-semibold text-neutral-900">{monthLabel}</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthDate((prev) => addMonths(prev, -1))}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setMonthDate(startOfMonth(new Date()))}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMonthDate((prev) => addMonths(prev, 1))}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <PlannerMonthGrid
              monthDate={monthDate}
              selectedDate={selectedDate}
              countsByDate={myCountsByDate}
              onSelectDate={onSelectDate}
            />

            <div className="space-y-4">
              <section className="rounded-2xl border border-yellow-200/60 bg-white/95 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {editingId ? 'Edit planner item' : 'Add planner item'}
                  </h2>
                  <p className="text-sm text-neutral-500">{toDateLabel(selectedDate)}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Title
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none ring-0 focus:border-yellow-300"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={4}
                      className="w-full rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none ring-0 focus:border-yellow-300"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        Start
                      </label>
                      <input
                        type="datetime-local"
                        value={form.startAt}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, startAt: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none ring-0 focus:border-yellow-300"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        End
                      </label>
                      <input
                        type="datetime-local"
                        value={form.endAt}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, endAt: e.target.value }))
                        }
                        className="w-full rounded-2xl border border-neutral-200 px-3 py-2 text-sm outline-none ring-0 focus:border-yellow-300"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={form.isDone}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, isDone: e.target.checked }))
                      }
                    />
                    Mark as done
                  </label>

                  {!editingId ? (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700">
                        Add to other planners
                      </label>
                      <select
                        multiple
                        value={participantIds}
                        onChange={(e) =>
                          setParticipantIds(
                            Array.from(e.target.selectedOptions).map(
                              (option) => option.value
                            )
                          )
                        }
                        className="min-h-32 w-full rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-yellow-300"
                      >
                        {profiles
                          .filter((profile) => profile.id !== currentUserId)
                          .map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.full_name ?? 'User'}
                            </option>
                          ))}
                      </select>
                      <p className="mt-1 text-xs text-neutral-500">
                        Hold Ctrl or Cmd to select more than one person.
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={savePlannerItem}
                      className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-300 px-4 py-2 text-sm font-semibold text-neutral-900"
                    >
                      {saving ? 'Saving...' : editingId ? 'Update item' : 'Save item'}
                    </button>

                    <button
                      type="button"
                      onClick={() => resetForm(selectedDate)}
                      className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700"
                    >
                      Reset
                    </button>
                  </div>

                  {statusText ? (
                    <div className="pt-1 text-xs text-neutral-500">{statusText}</div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-yellow-200/60 bg-white/95 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Entries for {toDateLabel(selectedDate)}
                  </h2>
                </div>

                {mySelectedDateItems.length ? (
                  <div className="space-y-3">
                    {mySelectedDateItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-yellow-100 bg-gradient-to-br from-white to-yellow-50/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-neutral-900">
                              {item.title}
                            </div>
                            <div className="mt-1 text-sm text-neutral-500">
                              {timeLabel(item.start_at)} – {timeLabel(item.end_at)}
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              item.is_done
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {item.is_done ? 'Done' : 'Planned'}
                          </span>
                        </div>

                        {item.description ? (
                          <div className="mt-3 text-sm leading-6 text-neutral-700">
                            {item.description}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditItem(item)}
                            className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleDone(item)}
                            className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700"
                          >
                            {item.is_done ? 'Mark planned' : 'Mark done'}
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePlannerItem(item.id)}
                            className="rounded-full bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">
                    No personal tasks for this date yet.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'team' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-yellow-200/60 bg-white/95 p-4 shadow-sm">
            <div>
              <div className="text-lg font-semibold text-neutral-900">
                Team Availability
              </div>
              <div className="text-sm text-neutral-500">
                See when someone is busy during the month
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 outline-none focus:border-yellow-300"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name ?? 'User'}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setMonthDate((prev) => addMonths(prev, -1))}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setMonthDate(startOfMonth(new Date()))}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setMonthDate((prev) => addMonths(prev, 1))}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <PlannerMonthGrid
              monthDate={monthDate}
              selectedDate={selectedDate}
              countsByDate={viewedCountsByDate}
              onSelectDate={setSelectedDate}
            />

            <section className="rounded-2xl border border-yellow-200/60 bg-white/95 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-900">
                  {profileMap.get(selectedUserId) ?? 'User'}
                </h2>
                <p className="text-sm text-neutral-500">{toDateLabel(selectedDate)}</p>
              </div>

              {viewedSelectedDateItems.length ? (
                <div className="space-y-3">
                  {viewedSelectedDateItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-yellow-100 bg-gradient-to-br from-white to-yellow-50/60 p-4"
                    >
                      <div className="text-sm font-semibold text-neutral-900">
                        {selectedUserId === currentUserId ? item.title : 'Busy'}
                      </div>
                      <div className="mt-1 text-sm text-neutral-500">
                        {timeLabel(item.start_at)} – {timeLabel(item.end_at)}
                      </div>
                      {selectedUserId === currentUserId && item.description ? (
                        <div className="mt-3 text-sm text-neutral-700">
                          {item.description}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-neutral-500">
                  No entries for this date. Looks free.
                </div>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {activeTab === 'economic' ? <EconomicCalendarWidget /> : null}
    </div>
  )
}
