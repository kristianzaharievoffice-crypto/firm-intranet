import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type GroqChoice = {
  message?: {
    role?: string
    content?: string
  }
}

type GroqResponse = {
  choices?: GroqChoice[]
  error?: {
    message?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const messages = Array.isArray(body?.messages) ? body.messages : []

    const sanitizedMessages: ChatMessage[] = messages
      .filter(
        (message: unknown): message is ChatMessage =>
          typeof message === 'object' &&
          message !== null &&
          'role' in message &&
          'content' in message &&
          (message as ChatMessage).role !== 'system' &&
          typeof (message as ChatMessage).content === 'string'
      )
      .slice(-12)

    const groqApiKey = process.env.GROQ_API_KEY

    if (!groqApiKey) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY in environment variables.' },
        { status: 500 }
      )
    }

    const systemMessage: ChatMessage = {
      role: 'system',
      content:
        'You are the internal AI assistant for a company intranet. Always respond in English. Be helpful, concise, practical, and professional. Do not invent company data. If you are unsure, say so clearly. Only use information provided in the chat.',
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.4,
        max_tokens: 700,
        messages: [systemMessage, ...sanitizedMessages],
      }),
      cache: 'no-store',
    })

    const data = (await response.json()) as GroqResponse

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            `Groq request failed with status ${response.status}.`,
        },
        { status: response.status }
      )
    }

    const content = data?.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json(
        { error: 'The AI provider returned an empty response.' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { reply: content },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected AI assistant error.'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
