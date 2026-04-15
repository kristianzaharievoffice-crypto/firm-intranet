'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NewPammForm from '@/components/NewPammForm'
import StatCard from '@/components/StatCard'

interface PammLiveProps {
  currentUserId: string
  currentUserRole: string
}

interface PammRow {
  id: string
  title: string
  description: string | null
  amount: number
  currency: 'USD' | 'EUR'
  status: string
  created_at: string
  created_by: string
}

interface ProfileRow {
  id: string
  full_name: string | null
}

interface PammVm {
  id: string
  title: string
  description: string | null
  amount: number
  currency: 'USD' | 'EUR'
  status: string
  created_at: string
  created_by: string
  creator_name: string
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-700'
    case 'in_progress':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'done':
      return 'Done'
    case 'in_progress':
      return 'In progress'
    default:
      return 'New'
  }
}

export default function PammLive({
  currentUserId,
  currentUserRole,
}: PammLiveProps) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<PammVm[]>([])
  const [loading, setLoading] = useState(true)

  const loadItems = useCallback(async () => {
    const { data: itemsData } = await supabase
      .from('pamm_items')
      .select('id, title, description, amount, currency, status, created_at, created_by')
      .order('created_at', { ascending: false })

    const rows = (itemsData ?? []) as PammRow[]
    const creatorIds = [...new Set(rows.map((item) => item.created_by))]
    const safeIds = creatorIds.length
      ? creatorIds
      : ['00000000-0000-0000-0000-000000000000']

    const { data: creators } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', safeIds)

    const creatorMap = new Map(
      ((creators ?? []) as ProfileRow[]).map((creator) => [
        creator.id,
        creator.full_name ?? 'User',
      ])
    )

    const mapped: PammVm[] = rows.map((item) => ({
      ...item,
      creator_name: creatorMap.get(item.created_by) ?? 'User',
    }))

    setItems(mapped)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadItems()

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadItems()
      }
    }, 2000)

    const channel = supabase
      .channel('pamm-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pamm_items' },
        () => {
          void loadItems()
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [loadItems, supabase])

  const updateStatus = async (itemId: string, status: string) => {
    await supabase.from('pamm_items').update({ status }).eq('id', itemId)
    await loadItems()
  }

  const deleteItem = async (itemId: string) => {
    await supabase.from('pamm_items').delete().eq('id', itemId)
    await loadItems()
  }

  const total = items.length
  const totalNew = items.filter((i) => i.status === 'new').length
  const totalInProgress = items.filter((i) => i.status === 'in_progress').length
  const totalDone = items.filter((i) => i.status === 'done').length

  return (
    <div className="space-y-8">
      <NewPammForm />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total items" value={total} />
        <StatCard label="New" value={totalNew} />
        <StatCard label="In progress" value={totalInProgress} tone="soft" />
        <StatCard label="Done" value={totalDone} tone="gold" />
      </div>

      {loading ? (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">Loading...</p>
        </div>
      ) : items.length ? (
        <div className="space-y-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusClasses(
                    item.status
                  )}`}
                >
                  {getStatusLabel(item.status)}
                </span>

                <span className="rounded-full bg-[#fbf3dc] px-3 py-1 text-sm font-semibold text-[#a88414]">
                  {item.amount.toFixed(2)} {item.currency}
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
                {item.title}
              </h2>

              <p className="mt-2 text-sm text-[#7b746b]">
                Created by: {item.creator_name}
              </p>

              <p className="mt-1 text-sm text-[#7b746b]">
                Date: {new Date(item.created_at).toLocaleDateString('bg-BG')}
              </p>

              {item.description && (
                <p className="mt-4 whitespace-pre-wrap leading-7 text-[#443d35]">
                  {item.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <select
                  value={item.status}
                  onChange={(e) => void updateStatus(item.id, e.target.value)}
                  className="rounded-[16px] border border-[#ece5d8] bg-[#fcfbf8] px-3 py-2 text-sm outline-none"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>

                {currentUserRole === 'admin' && (
                  <button
                    type="button"
                    onClick={() => void deleteItem(item.id)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">No PAMM items yet.</p>
        </div>
      )}
    </div>
  )
}