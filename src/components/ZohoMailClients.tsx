'use client'

import { useState } from 'react'
import type { ZohoMailMessage } from '@/lib/zoho-mail'

function messageTime(message: ZohoMailMessage) {
  const raw = message.receivedTime || message.sentDateInGMT
  if (!raw) return ''

  const value =
    typeof raw === 'number' || /^\d+$/.test(String(raw))
      ? Number(raw)
      : String(raw)

  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('bg-BG')
}

function replySubject(subject: string | undefined) {
  const value = subject?.trim() || '(No subject)'
  return value.toLowerCase().startsWith('re:') ? value : `Re: ${value}`
}

export default function ZohoMailClient({
  messages,
  emailAddress,
}: {
  messages: ZohoMailMessage[]
  emailAddress: string | null
}) {
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyMessageId, setReplyMessageId] = useState<string | null>(null)
  const [toAddress, setToAddress] = useState('')
  const [ccAddress, setCcAddress] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)
  const [statusText, setStatusText] = useState('')

  const resetCompose = () => {
    setToAddress('')
    setCcAddress('')
    setSubject('')
    setContent('')
  }

  const sendMail = async () => {
    setStatusText('')

    if (!toAddress.trim() || !subject.trim() || !content.trim()) {
      setStatusText('To, subject and message are required.')
      return
    }

    setSending(true)

    const response = await fetch('/api/zoho/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'compose',
        toAddress,
        ccAddress,
        subject,
        content,
      }),
    })
    const data = (await response.json()) as { error?: string }

    setSending(false)

    if (!response.ok) {
      setStatusText(data.error || 'Could not send email.')
      return
    }

    resetCompose()
    setComposeOpen(false)
    setStatusText('Email sent.')
  }

  const sendReply = async (message: ZohoMailMessage) => {
    setStatusText('')

    if (!replyContent.trim()) {
      setStatusText('Reply message is required.')
      return
    }

    if (!message.messageId) {
      setStatusText('This email cannot be replied to.')
      return
    }

    setSending(true)

    const response = await fetch('/api/zoho/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'reply',
        messageId: message.messageId,
        toAddress: message.fromAddress || message.sender || undefined,
        subject: replySubject(message.subject),
        content: replyContent,
      }),
    })
    const data = (await response.json()) as { error?: string }

    setSending(false)

    if (!response.ok) {
      setStatusText(data.error || 'Could not send reply.')
      return
    }

    setReplyContent('')
    setReplyMessageId(null)
    setStatusText('Reply sent.')
  }

  return (
    <section className="rounded-[32px] border border-[#ece5d8] bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">
            Inbox
          </h2>
          <p className="mt-1 text-sm text-[#7b746b]">
            {emailAddress || 'Connected Zoho mailbox'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setComposeOpen((current) => !current)}
          className="rounded-[18px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414]"
        >
          Compose
        </button>
      </div>

      {statusText ? (
        <div className="mb-4 rounded-[18px] bg-[#fcfbf8] px-4 py-3 text-sm text-[#7b746b]">
          {statusText}
        </div>
      ) : null}

      {composeOpen ? (
        <div className="mb-5 rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-4">
          <div className="grid gap-3">
            <input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="To"
              className="rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
            />
            <input
              value={ccAddress}
              onChange={(e) => setCcAddress(e.target.value)}
              placeholder="Cc"
              className="rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
            />
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your email..."
              rows={6}
              className="rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void sendMail()}
              disabled={sending}
              className="rounded-[16px] bg-[#c9a227] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetCompose()
                setComposeOpen(false)
              }}
              className="rounded-[16px] bg-white px-4 py-2 text-sm font-semibold text-[#5d5346]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {messages.length ? (
        <div className="divide-y divide-[#ece5d8] overflow-hidden rounded-[24px] border border-[#ece5d8]">
          {messages.map((message, index) => {
            const id = message.messageId ?? `${message.subject}-${index}`
            const isReplying = replyMessageId === id

            return (
              <div key={id} className="bg-[#fcfbf8] px-5 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-[#1f1a14]">
                      {message.subject || '(No subject)'}
                    </p>
                    <p className="mt-1 truncate text-sm text-[#7b746b]">
                      {message.fromAddress || message.sender || 'Unknown sender'}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-[#9a8d75]">
                    {messageTime(message)}
                  </p>
                </div>

                {message.summary ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5d5346]">
                    {message.summary}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyMessageId(isReplying ? null : id)
                      setReplyContent('')
                    }}
                    className="rounded-[14px] bg-white px-3 py-2 text-xs font-semibold text-[#5d5346]"
                  >
                    Reply
                  </button>
                </div>

                {isReplying ? (
                  <div className="mt-4 rounded-[18px] border border-[#ece5d8] bg-white p-3">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write your reply..."
                      rows={4}
                      className="w-full rounded-[14px] border border-[#ece5d8] bg-[#fcfbf8] px-4 py-3 text-sm outline-none"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void sendReply(message)}
                        disabled={sending}
                        className="rounded-[14px] bg-[#c9a227] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {sending ? 'Sending...' : 'Send reply'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyMessageId(null)
                          setReplyContent('')
                        }}
                        className="rounded-[14px] bg-[#f3efe8] px-4 py-2 text-xs font-semibold text-[#5d5346]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[24px] border border-[#ece5d8] bg-[#fcfbf8] p-5 text-sm text-[#7b746b]">
          No emails loaded yet.
        </div>
      )}
    </section>
  )
}
