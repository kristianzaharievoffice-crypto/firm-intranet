'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>
    ) => {
      dispose?: () => void
      executeCommand?: (command: string, ...args: unknown[]) => void
    }
  }
}

type Props = {
  displayName: string
  email: string
}

type MeetingMode = 'audio' | 'video'

function slugifyRoomName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateRoomName() {
  const random = Math.random().toString(36).slice(2, 8)
  return `rcx-room-${random}`
}

export default function JitsiCallClient({ displayName, email }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const apiRef = useRef<{
    dispose?: () => void
    executeCommand?: (command: string, ...args: unknown[]) => void
  } | null>(null)

  const [roomName, setRoomName] = useState(generateRoomName())
  const [activeRoom, setActiveRoom] = useState('')
  const [meetingMode, setMeetingMode] = useState<MeetingMode>('video')
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(false)
  const [hasMeeting, setHasMeeting] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  const joinUrl = useMemo(() => {
    if (!activeRoom) return ''
    return `https://meet.jit.si/${activeRoom}`
  }, [activeRoom])

  useEffect(() => {
    return () => {
      apiRef.current?.dispose?.()
      apiRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!copyMessage) return
    const timeout = window.setTimeout(() => setCopyMessage(''), 2000)
    return () => window.clearTimeout(timeout)
  }, [copyMessage])

  async function ensureJitsiScript() {
    if (window.JitsiMeetExternalAPI) return

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-jitsi-external-api="true"]'
      )

      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener(
          'error',
          () => reject(new Error('Failed to load Jitsi external API script.')),
          { once: true }
        )
        return
      }

      const script = document.createElement('script')
      script.src = 'https://meet.jit.si/external_api.js'
      script.async = true
      script.dataset.jitsiExternalApi = 'true'
      script.onload = () => resolve()
      script.onerror = () =>
        reject(new Error('Failed to load Jitsi external API script.'))

      document.body.appendChild(script)
    })
  }

  async function startMeeting(mode: MeetingMode) {
    const safeRoom = slugifyRoomName(roomName) || generateRoomName()

    if (!containerRef.current) return

    setIsLoadingMeeting(true)

    try {
      await ensureJitsiScript()

      apiRef.current?.dispose?.()
      apiRef.current = null
      containerRef.current.innerHTML = ''

      const domain = 'meet.jit.si'

      const options = {
        roomName: safeRoom,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        lang: 'en',
        userInfo: {
          displayName,
          email,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: mode === 'audio',
          prejoinPageEnabled: false,
          disableModeratorIndicator: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
        },
      }

      const api = new window.JitsiMeetExternalAPI!(domain, options)
      apiRef.current = api

      if (mode === 'audio') {
        window.setTimeout(() => {
          api.executeCommand?.('toggleVideo')
        }, 1200)
      }

      setActiveRoom(safeRoom)
      setMeetingMode(mode)
      setHasMeeting(true)
    } catch (error) {
      console.error(error)
      alert('Could not load the meeting. Please try again.')
    } finally {
      setIsLoadingMeeting(false)
    }
  }

  function leaveMeeting() {
    apiRef.current?.dispose?.()
    apiRef.current = null

    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    setHasMeeting(false)
    setActiveRoom('')
  }

  async function copyRoomLink() {
    if (!joinUrl) return

    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopyMessage('Link copied')
    } catch {
      setCopyMessage('Copy failed')
    }
  }

  async function joinExistingRoom() {
    await startMeeting(meetingMode)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                Start or join a room
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Create a new room name, choose whether you want audio or video,
                and launch the meeting directly inside this page.
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-700">
                Room name
              </span>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="example: team-standup"
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setMeetingMode('audio')}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  meetingMode === 'audio'
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                Audio mode
              </button>

              <button
                type="button"
                onClick={() => setMeetingMode('video')}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  meetingMode === 'video'
                    ? 'bg-neutral-900 text-white'
                    : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                Video mode
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void startMeeting('audio')}
                disabled={isLoadingMeeting}
                className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMeeting && meetingMode === 'audio'
                  ? 'Opening...'
                  : 'Start audio call'}
              </button>

              <button
                type="button"
                onClick={() => void startMeeting('video')}
                disabled={isLoadingMeeting}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingMeeting && meetingMode === 'video'
                  ? 'Opening...'
                  : 'Start video call'}
              </button>

              <button
                type="button"
                onClick={() => void joinExistingRoom()}
                disabled={isLoadingMeeting}
                className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Join room
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-base font-semibold text-neutral-900">
              How it works
            </h3>

            <div className="mt-4 space-y-3 text-sm leading-6 text-neutral-600">
              <p>
                1. Type a room name, for example <strong>sales-daily</strong>.
              </p>
              <p>
                2. Choose whether you want an audio or video meeting.
              </p>
              <p>
                3. Click start, or share the same room name with teammates so
                they can join the same call.
              </p>
              <p>
                4. If the room is already active, pressing <strong>Join room</strong>{' '}
                will open it here.
              </p>
            </div>

            {activeRoom ? (
              <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Active room
                </p>
                <p className="mt-2 text-lg font-semibold text-neutral-900">
                  {activeRoom}
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  Mode: {meetingMode === 'audio' ? 'Audio' : 'Video'}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void copyRoomLink()}
                    className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Copy room link
                  </button>

                  <button
                    type="button"
                    onClick={leaveMeeting}
                    className="rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Leave meeting
                  </button>
                </div>

                {copyMessage ? (
                  <p className="mt-3 text-xs font-medium text-emerald-600">
                    {copyMessage}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500">
                No active room yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3 px-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
              Embedded meeting
            </h2>
            <p className="text-sm text-neutral-600">
              The call opens directly inside your intranet page.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-950">
          {hasMeeting ? (
            <div ref={containerRef} className="h-[72vh] w-full" />
          ) : (
            <div className="flex h-[72vh] items-center justify-center px-6 text-center text-sm text-neutral-400">
              Start or join a room to load the meeting here.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
