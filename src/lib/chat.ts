// Talks to the AI chat Worker (worker/), when one is configured at build time with
// VITE_CHAT_ENDPOINT. The Worker keeps the API key secret and reads the
// portfolio's facts from the live /knowledge.txt. Without an endpoint, or when the
// Worker fails, the caller falls back to the built-in answerer (answer.ts).

export const CHAT_ENDPOINT: string = import.meta.env.VITE_CHAT_ENDPOINT ?? ''
export const aiEnabled = CHAT_ENDPOINT.length > 0

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

/** Ask the AI. Throws on any failure so the caller can fall back. */
export async function askAI(history: ChatTurn[], signal?: AbortSignal): Promise<string> {
  const res = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Only the recent conversation, trimmed: the Worker enforces the same limits.
    body: JSON.stringify({ messages: history.slice(-8).map((t) => ({ role: t.role, content: t.content.slice(0, 600) })) }),
    signal,
  })
  if (!res.ok) throw new Error(`chat ${res.status}`)
  const data = (await res.json()) as { reply?: unknown }
  if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('empty reply')
  return data.reply.trim()
}
