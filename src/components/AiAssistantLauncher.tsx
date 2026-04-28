'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function AiAssistantLauncher() {
  const pathname = usePathname()
  const isChatPage = pathname === '/chat' || pathname.startsWith('/chat/')
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your internal AI assistant. I can help with writing, ideas, explanations, tasks, and everyday work questions.',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  async function handleSend() {
    const trimmed = input.trim()

    if (!trimmed || loading) return

    const nextMessages: Message[] = [...messages, { role: 'user', content: trimmed }]

    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          messages: nextMessages,
        }),
      })

      const json = (await response.json()) as { reply?: string; error?: string }

      if (!response.ok) {
        throw new Error(json.error || 'Failed to get AI response.')
      }

      if (!json.reply) {
        throw new Error('Empty reply from AI assistant.')
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: json.reply!,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI response.')
    } finally {
      setLoading(false)
    }
  }

  function handleClearChat() {
    setMessages([
      {
        role: 'assistant',
        content:
          'Chat cleared. I am ready to help again with writing, ideas, and tasks.',
      },
    ])
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-44 z-50 h-14 w-14 items-center justify-center rounded-full border border-fuchsia-300 bg-gradient-to-br from-fuchsia-500 to-violet-500 text-xl font-semibold text-white shadow-lg transition hover:scale-105 ${
          isChatPage ? 'hidden md:flex' : 'flex'
        }`}
        title="Open AI assistant"
      >
        AI
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 sm:p-6">
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-fuchsia-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-fuchsia-100 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                  AI Assistant
                </h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Internal assistant for questions, writing, and everyday tasks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-neutral-50 px-4 py-4 sm:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white'
                          : 'border border-neutral-200 bg-white text-neutral-900'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {loading ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-3xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500 shadow-sm">
                      AI assistant is typing...
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="border-t border-fuchsia-100 bg-white px-4 py-4 sm:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                  rows={3}
                  placeholder="Type your question, request, or task..."
                  className="min-h-[80px] flex-1 resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
                />

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim()}
                  className="inline-flex items-center justify-center rounded-2xl border border-fuchsia-300 bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:w-36"
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


