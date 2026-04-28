'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import NewSmaDealForm from '@/components/NewSmaDealForm'
import StatCard from '@/components/StatCard'

const CURRENCIES = ['GBP', 'USD', 'EUR'] as const
const STATUSES = ['active', 'passed', 'failed', 'paused', 'closed'] as const

type Currency = (typeof CURRENCIES)[number]
type DealStatus = (typeof STATUSES)[number]

interface SmaRow {
  id: string
  client: string
  stage_amount: number
  currency: Currency
  target_profit: string | null
  max_drawdown: string | null
  period: string | null
  start_date: string | null
  hard_stop_out: boolean
  comments: string | null
  status: DealStatus
  created_at: string
  updated_at: string
  created_by: string
  updated_by: string | null
}

interface ProfileRow {
  id: string
  full_name: string | null
}

interface SmaVm extends SmaRow {
  creator_name: string
}

type EditState = {
  client: string
  stageAmount: string
  currency: Currency
  targetProfit: string
  maxDrawdown: string
  period: string
  startDate: string
  hardStopOut: boolean
  comments: string
  status: DealStatus
}

function formatAmount(value: number, currency: Currency) {
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 2,
  }).format(value) + ` ${currency}`
}

function statusLabel(status: DealStatus) {
  switch (status) {
    case 'passed':
      return 'Passed'
    case 'failed':
      return 'Failed'
    case 'paused':
      return 'Paused'
    case 'closed':
      return 'Closed'
    default:
      return 'Active'
  }
}

function statusClasses(status: DealStatus) {
  switch (status) {
    case 'passed':
      return 'bg-green-100 text-green-700'
    case 'failed':
      return 'bg-red-100 text-red-700'
    case 'paused':
      return 'bg-blue-100 text-blue-700'
    case 'closed':
      return 'bg-neutral-200 text-neutral-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function editStateFromDeal(deal: SmaVm): EditState {
  return {
    client: deal.client,
    stageAmount: String(deal.stage_amount),
    currency: deal.currency,
    targetProfit: deal.target_profit ?? '',
    maxDrawdown: deal.max_drawdown ?? '',
    period: deal.period ?? '',
    startDate: deal.start_date ?? '',
    hardStopOut: deal.hard_stop_out,
    comments: deal.comments ?? '',
    status: deal.status,
  }
}

export default function SmaLive() {
  const supabase = useMemo(() => createClient(), [])

  const [deals, setDeals] = useState<SmaVm[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [message, setMessage] = useState('')

  const loadDeals = useCallback(async () => {
    const { data: dealsData } = await supabase
      .from('sma_deals')
      .select(
        'id, client, stage_amount, currency, target_profit, max_drawdown, period, start_date, hard_stop_out, comments, status, created_at, updated_at, created_by, updated_by'
      )
      .order('created_at', { ascending: false })

    const rows = (dealsData ?? []) as SmaRow[]
    const creatorIds = [...new Set(rows.map((deal) => deal.created_by))]
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

    setDeals(
      rows.map((deal) => ({
        ...deal,
        creator_name: creatorMap.get(deal.created_by) ?? 'User',
      }))
    )
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void loadDeals()

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadDeals()
      }
    }, 2500)

    const channel = supabase
      .channel('sma-deals-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sma_deals' },
        () => {
          void loadDeals()
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [loadDeals, supabase])

  const startEdit = (deal: SmaVm) => {
    setMessage('')
    setEditingId(deal.id)
    setEditState(editStateFromDeal(deal))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditState(null)
    setMessage('')
  }

  const saveEdit = async (dealId: string) => {
    if (!editState) return

    if (!editState.client.trim()) {
      setMessage('Client is required.')
      return
    }

    if (!editState.stageAmount || Number.isNaN(Number(editState.stageAmount))) {
      setMessage('Stage amount must be valid.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('sma_deals')
      .update({
        client: editState.client.trim(),
        stage_amount: Number(editState.stageAmount),
        currency: editState.currency,
        target_profit: editState.targetProfit.trim() || null,
        max_drawdown: editState.maxDrawdown.trim() || null,
        period: editState.period.trim() || null,
        start_date: editState.startDate || null,
        hard_stop_out: editState.hardStopOut,
        comments: editState.comments.trim() || null,
        status: editState.status,
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)

    if (error) {
      setMessage(error.message)
      return
    }

    cancelEdit()
    await loadDeals()
  }

  const total = deals.length
  const active = deals.filter((deal) => deal.status === 'active').length
  const passed = deals.filter((deal) => deal.status === 'passed').length
  const closed = deals.filter((deal) => deal.status === 'closed').length

  return (
    <div className="space-y-8">
      <NewSmaDealForm />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total SMA" value={total} />
        <StatCard label="Active" value={active} />
        <StatCard label="Passed" value={passed} tone="gold" />
        <StatCard label="Closed" value={closed} tone="soft" />
      </div>

      {loading ? (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">Loading...</p>
        </div>
      ) : deals.length ? (
        <div className="space-y-5">
          {deals.map((deal) => {
            const isEditing = editingId === deal.id && editState

            return (
              <div
                key={deal.id}
                className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${statusClasses(
                      deal.status
                    )}`}
                  >
                    {statusLabel(deal.status)}
                  </span>

                  <span className="rounded-full bg-[#fbf3dc] px-3 py-1 text-sm font-semibold text-[#a88414]">
                    {formatAmount(deal.stage_amount, deal.currency)}
                  </span>

                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-semibold text-neutral-600">
                    SMA
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                        value={editState.client}
                        onChange={(e) =>
                          setEditState({ ...editState, client: e.target.value })
                        }
                      />

                      <input
                        type="number"
                        step="0.01"
                        className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                        value={editState.stageAmount}
                        onChange={(e) =>
                          setEditState({ ...editState, stageAmount: e.target.value })
                        }
                      />

                      <select
                        className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                        value={editState.currency}
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            currency: e.target.value as Currency,
                          })
                        }
                      >
                        {CURRENCIES.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>

                      <select
                        className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                        value={editState.status}
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            status: e.target.value as DealStatus,
                          })
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>

                      <input
                        className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                        value={editState.targetProfit}
                        placeholder="Target profit"
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            targetProfit: e.target.value,
                          })
                        }
                      />

                      <input
                        className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                        value={editState.maxDrawdown}
                        placeholder="Max drawdown"
                        onChange={(e) =>
                          setEditState({
                            ...editState,
                            maxDrawdown: e.target.value,
                          })
                        }
                      />

                      <input
                        className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                        value={editState.period}
                        placeholder="Period"
                        onChange={(e) =>
                          setEditState({ ...editState, period: e.target.value })
                        }
                      />

                      <input
                        type="date"
                        className="rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                        value={editState.startDate}
                        onChange={(e) =>
                          setEditState({ ...editState, startDate: e.target.value })
                        }
                      />

                      <label className="flex items-center gap-3 rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-sm font-medium text-[#5d5346]">
                        <input
                          type="checkbox"
                          checked={editState.hardStopOut}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              hardStopOut: e.target.checked,
                            })
                          }
                        />
                        Hard stop out
                      </label>
                    </div>

                    <textarea
                      className="min-h-[100px] w-full rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 outline-none focus:border-[#c9a227]"
                      value={editState.comments}
                      placeholder="Comments"
                      onChange={(e) =>
                        setEditState({ ...editState, comments: e.target.value })
                      }
                    />

                    {message ? <p className="text-sm text-red-600">{message}</p> : null}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void saveEdit(deal.id)}
                        className="rounded-[18px] bg-[#c9a227] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a88414]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-[18px] bg-[#f3efe8] px-4 py-2 text-sm font-semibold text-[#5d5346]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
                          {deal.client}
                        </h2>
                        <p className="mt-2 text-sm text-[#7b746b]">
                          Created by: {deal.creator_name}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => startEdit(deal)}
                        className="rounded-[18px] bg-[#f3efe8] px-4 py-2 text-sm font-semibold text-[#5d5346] hover:bg-[#eadfbe]"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <Detail label="Target Profit" value={deal.target_profit} />
                      <Detail label="Max Drawdown" value={deal.max_drawdown} />
                      <Detail label="Period" value={deal.period} />
                      <Detail
                        label="Start Date"
                        value={
                          deal.start_date
                            ? new Date(deal.start_date).toLocaleDateString('en-GB')
                            : null
                        }
                      />
                      <Detail
                        label="Hard Stop Out"
                        value={deal.hard_stop_out ? 'Yes' : 'No'}
                      />
                      <Detail
                        label="Updated"
                        value={new Date(deal.updated_at).toLocaleDateString('en-GB')}
                      />
                    </div>

                    {deal.comments ? (
                      <p className="mt-5 whitespace-pre-wrap leading-7 text-[#443d35]">
                        {deal.comments}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
          <p className="text-[#7b746b]">No SMA deals yet.</p>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[18px] bg-[#faf8f4] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a88414]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#1f1a14]">
        {value || 'Not set'}
      </p>
    </div>
  )
}


