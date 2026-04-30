'use client'

import { useMemo, useState } from 'react'
import type {
  ZohoMailContent,
  ZohoMailFolder,
  ZohoMailMessage,
} from '@/lib/zoho-mail'

function messageTime(message: ZohoMailMessage) {
  const raw = message.receivedTime || message.sentDateInGMT
  if (!raw) return ''

  const value =
    typeof raw === 'number' || /^\d+$/.test(String(raw)) ? Number(raw) : String(raw)

  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('bg-BG')
}

function replySubject(subject: string | undefined) {
  const value = subject?.trim() || '(No subject)'
  return value.toLowerCase().startsWith('re:') ? value : `Re: ${value}`
}

function forwardSubject(subject: string | undefined) {
  const value = subject?.trim() || '(No subject)'
  return value.toLowerCase().startsWith('fwd:') ? value : `Fwd: ${value}`
}

function messageKey(message: ZohoMailMessage, index: number) {
  return message.messageId ?? `${message.subject}-${index}`
}

function senderName(message: ZohoMailMessage) {
  return message.fromAddress || message.sender || 'Unknown sender'
}

function folderLabel(folder: ZohoMailFolder) {
  return folder.folderName || folder.folderType || folder.path || 'Folder'
}

function isUnread(message: ZohoMailMessage) {
  return String(message.status2 ?? '').toLowerCase().includes('unread')
}

function hasImportantFlag(message: ZohoMailMessage) {
  return String(message.flagid ?? '').toLowerCase() === 'important'
}

export default function ZohoMailClient({
  messages,
  folders,
  activeFolderId,
  emailAddress,
}: {
  messages: ZohoMailMessage[]
  folders: ZohoMailFolder[]
  activeFolderId: string | null
  emailAddress: string | null
}) {
  const [composeOpen, setComposeOpen] = useState(false)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [replyMessageId, setReplyMessageId] = useState<string | null>(null)
  const [toAddress, setToAddress] = useState('')
  const [ccAddress, setCcAddress] = useState('')
  const [bccAddress, setBccAddress] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(false)
  const [messageContent, setMessageContent] = useState<ZohoMailContent | null>(null)
  const [statusText, setStatusText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const selectedMessage = useMemo(
    () => messages.find((message) => message.messageId === selectedMessageId) ?? null,
    [messages, selectedMessageId]
  )

  const filteredMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return messages

    return messages.filter((message) =>
      [
        message.subject,
        message.summary,
        message.fromAddress,
        message.sender,
        message.toAddress,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [messages, searchQuery])

  const resetCompose = () => {
    setToAddress('')
    setCcAddress('')
    setBccAddress('')
    setSubject('')
    setContent('')
  }

  const openCompose = () => {
    resetCompose()
    setComposeOpen(true)
  }

  const openForward = (message: ZohoMailMessage) => {
    resetCompose()
    setSubject(forwardSubject(message.subject))
    setContent(`\n\n---------- Forwarded message ----------\nFrom: ${senderName(message)}\nSubject: ${message.subject || '(No subject)'}\n\n${message.summary || ''}`)
    setComposeOpen(true)
  }

  const loadMessage = async (message: ZohoMailMessage) => {
    setStatusText('')

    if (!message.messageId || !message.folderId) {
      setSelectedMessageId(message.messageId ?? null)
      setMessageContent(null)
      setStatusText('This email cannot be opened because Zoho did not return folder data.')
      return
    }

    setSelectedMessageId(message.messageId)
    setReplyMessageId(null)
    setReplyContent('')
    setLoadingMessage(true)

    const response = await fetch(
      `/api/zoho/message?folderId=${encodeURIComponent(message.folderId)}&messageId=${encodeURIComponent(message.messageId)}`,
      { credentials: 'same-origin' }
    )
    const data = (await response.json()) as {
      message?: ZohoMailContent
      error?: string
    }

    setLoadingMessage(false)

    if (!response.ok) {
      setMessageContent(null)
      setStatusText(data.error || 'Could not load this email.')
      return
    }

    setMessageContent(data.message ?? null)
  }

  const runAction = async (
    action: 'markRead' | 'markUnread' | 'important' | 'unflag' | 'delete',
    message: ZohoMailMessage
  ) => {
    setStatusText('')

    if (!message.messageId) {
      setStatusText('This email cannot be updated.')
      return
    }

    const response = await fetch('/api/zoho/action', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        messageId: message.messageId,
        folderId: message.folderId,
      }),
    })
    const data = (await response.json()) as { error?: string }

    if (!response.ok) {
      setStatusText(data.error || 'Email action failed.')
      return
    }

    if (action === 'delete') {
      setSelectedMessageId(null)
      setMessageContent(null)
    }

    setStatusText('Done. Refreshing...')
    window.location.reload()
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
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'compose',
        toAddress,
        ccAddress,
        bccAddress,
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
      credentials: 'same-origin',
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
    <section className="overflow-hidden rounded-[32px] border border-[#ece5d8] bg-white shadow-sm">
      <div className="border-b border-[#ece5d8] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#1f1a14]">Mail</h2>
            <p className="mt-1 text-sm text-[#7b746b]">
              {emailAddress || 'Connected Zoho mailbox'}
            </p>
          </div>

          <button
            type="button"
            onClick={openCompose}
            className="rounded-[18px] bg-[#c9a227] px-4 py-2 font-semibold text-white hover:bg-[#a88414]"
          >
            Compose
          </button>
        </div>

        {statusText ? (
          <div className="mt-4 rounded-[18px] bg-[#fcfbf8] px-4 py-3 text-sm text-[#7b746b]">
            {statusText}
          </div>
        ) : null}
      </div>

      <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[220px_minmax(280px,380px)_1fr]">
        <aside className="border-b border-[#ece5d8] bg-[#fcfbf8] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 text-xs font-black uppercase tracking-wide text-[#8f6f16]">
            Folders
          </div>

          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            <a
              href="/mail"
              className={`whitespace-nowrap rounded-[16px] px-3 py-2 text-sm font-semibold ${
                !activeFolderId
                  ? 'bg-[#c9a227] text-white'
                  : 'bg-white text-[#5d5346] hover:bg-[#f3efe8]'
              }`}
            >
              Inbox
            </a>

            {folders.map((folder) => {
              const id = folder.folderId
              if (!id) return null

              return (
                <a
                  key={id}
                  href={`/mail?folderId=${encodeURIComponent(id)}`}
                  className={`whitespace-nowrap rounded-[16px] px-3 py-2 text-sm font-semibold ${
                    activeFolderId === id
                      ? 'bg-[#c9a227] text-white'
                      : 'bg-white text-[#5d5346] hover:bg-[#f3efe8]'
                  }`}
                >
                  {folderLabel(folder)}
                </a>
              )
            })}
          </div>
        </aside>

        <div className="border-b border-[#ece5d8] lg:border-b-0 lg:border-r">
          <div className="border-b border-[#ece5d8] p-4">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search mail..."
              className="w-full rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
            />
          </div>

          {filteredMessages.length ? (
            <div className="max-h-[580px] overflow-y-auto">
              {filteredMessages.map((message, index) => {
                const id = messageKey(message, index)
                const active = selectedMessageId === message.messageId

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void loadMessage(message)}
                    className={`block w-full border-b border-[#ece5d8] px-4 py-4 text-left transition ${
                      active ? 'bg-[#fff8df]' : 'bg-white hover:bg-[#fcfbf8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm ${
                            isUnread(message)
                              ? 'font-black text-[#1f1a14]'
                              : 'font-semibold text-[#1f1a14]'
                          }`}
                        >
                          {hasImportantFlag(message) ? '★ ' : ''}
                          {message.subject || '(No subject)'}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#7b746b]">
                          {senderName(message)}
                        </p>
                      </div>
                      <p className="shrink-0 text-[11px] text-[#9a8d75]">
                        {messageTime(message)}
                      </p>
                    </div>

                    {message.summary ? (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#5d5346]">
                        {message.summary}
                      </p>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-5 text-sm text-[#7b746b]">No emails loaded.</div>
          )}
        </div>

        <div className="min-w-0 bg-[#fcfbf8] p-5">
          {composeOpen ? (
            <div className="mb-5 rounded-[24px] border border-[#ece5d8] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-black text-[#1f1a14]">New email</div>
                <button
                  type="button"
                  onClick={() => {
                    resetCompose()
                    setComposeOpen(false)
                  }}
                  className="rounded-[14px] bg-[#f3efe8] px-3 py-2 text-xs font-semibold text-[#5d5346]"
                >
                  Close
                </button>
              </div>

              <div className="grid gap-3">
                <input
                  value={toAddress}
                  onChange={(event) => setToAddress(event.target.value)}
                  placeholder="To"
                  className="rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={ccAddress}
                    onChange={(event) => setCcAddress(event.target.value)}
                    placeholder="Cc"
                    className="rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
                  />
                  <input
                    value={bccAddress}
                    onChange={(event) => setBccAddress(event.target.value)}
                    placeholder="Bcc"
                    className="rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
                  />
                </div>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Subject"
                  className="rounded-[16px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
                />
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Write your email..."
                  rows={8}
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
                  onClick={resetCompose}
                  className="rounded-[16px] bg-[#f3efe8] px-4 py-2 text-sm font-semibold text-[#5d5346]"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          {selectedMessage ? (
            <article className="rounded-[24px] border border-[#ece5d8] bg-white p-5">
              <div className="flex flex-col gap-3 border-b border-[#ece5d8] pb-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h3 className="text-xl font-black tracking-tight text-[#1f1a14]">
                    {selectedMessage.subject || '(No subject)'}
                  </h3>
                  <p className="mt-2 text-sm text-[#7b746b]">
                    From: {senderName(selectedMessage)}
                  </p>
                  {selectedMessage.toAddress ? (
                    <p className="mt-1 text-sm text-[#7b746b]">
                      To: {selectedMessage.toAddress}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-[#9a8d75]">
                    {messageTime(selectedMessage)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyMessageId(
                        replyMessageId === selectedMessage.messageId
                          ? null
                          : selectedMessage.messageId ?? null
                      )
                      setReplyContent('')
                    }}
                    className="rounded-[14px] bg-[#c9a227] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => openForward(selectedMessage)}
                    className="rounded-[14px] bg-[#f3efe8] px-3 py-2 text-xs font-semibold text-[#5d5346]"
                  >
                    Forward
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void runAction(
                        isUnread(selectedMessage) ? 'markRead' : 'markUnread',
                        selectedMessage
                      )
                    }
                    className="rounded-[14px] bg-[#f3efe8] px-3 py-2 text-xs font-semibold text-[#5d5346]"
                  >
                    {isUnread(selectedMessage) ? 'Mark read' : 'Mark unread'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void runAction(
                        hasImportantFlag(selectedMessage) ? 'unflag' : 'important',
                        selectedMessage
                      )
                    }
                    className="rounded-[14px] bg-[#f3efe8] px-3 py-2 text-xs font-semibold text-[#5d5346]"
                  >
                    {hasImportantFlag(selectedMessage) ? 'Unflag' : 'Important'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void runAction('delete', selectedMessage)}
                    className="rounded-[14px] bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {replyMessageId === selectedMessage.messageId ? (
                <div className="mt-4 rounded-[18px] border border-[#ece5d8] bg-[#fcfbf8] p-3">
                  <textarea
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value)}
                    placeholder="Write your reply..."
                    rows={5}
                    className="w-full rounded-[14px] border border-[#ece5d8] bg-white px-4 py-3 text-sm outline-none"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void sendReply(selectedMessage)}
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
                      className="rounded-[14px] bg-white px-4 py-2 text-xs font-semibold text-[#5d5346]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                {loadingMessage ? (
                  <div className="rounded-[18px] bg-[#fcfbf8] p-5 text-sm text-[#7b746b]">
                    Loading email...
                  </div>
                ) : messageContent?.content ? (
                  <iframe
                    title="Email content"
                    sandbox=""
                    srcDoc={messageContent.content}
                    className="h-[520px] w-full rounded-[18px] border border-[#ece5d8] bg-white"
                  />
                ) : (
                  <div className="rounded-[18px] bg-[#fcfbf8] p-5 text-sm leading-6 text-[#5d5346]">
                    {selectedMessage.summary || 'Open the email to load its content.'}
                  </div>
                )}
              </div>
            </article>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-[#d8cdb9] bg-white p-8 text-center text-sm text-[#7b746b]">
              Select an email to read it, reply, forward, mark it, or delete it.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
