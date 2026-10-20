// "Shinigami AI" — a chat that answers visitors' questions about Akram from the
// portfolio itself. With an AI endpoint configured (VITE_CHAT_ENDPOINT) it uses
// the AI and falls back to the built-in answerer on any failure; without one it
// uses the built-in answerer only. A floating launcher opens a dialog panel.
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { profile, sections, type SectionId } from '../data/portfolio'
import { answer, starters } from '../lib/answer'
import { aiEnabled, askAI, type ChatTurn } from '../lib/chat'
import { scrollToSection } from '../lib/scroll'
import './Assistant.css'

type Msg = { id: number; role: 'user' | 'assistant'; text: string; section?: SectionId; suggest?: string[] }

const MAX_LEN = 300
const GREETING: Msg = {
  id: 0,
  role: 'assistant',
  text: `I have read every page of this note. Ask me anything about **${profile.name}**: projects, skills, experience, contests or how to get in touch.`,
  suggest: starters,
}

// ───────── light markdown → React (no innerHTML) ─────────
const link = (href: string, label: ReactNode, key: string) => {
  const external = !href.startsWith('mailto:')
  return (
    <a key={key} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {label}
    </a>
  )
}

/**
 * Inline markdown: [label](url) · **bold** (which may itself hold a link) ·
 * *emphasis* · bare https://… addresses. Anything else stays plain text.
 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const re =
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|\*\*(.+?)\*\*|__(.+?)__|(?<![*\w])\*([^*\n]+)\*(?![*\w])|(https?:\/\/[^\s<>()\]]+[^\s<>()\].,;:!?'"*])/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${key}-${i++}`
    if (m[1]) out.push(link(m[2], m[1], k))
    else if (m[3] ?? m[4]) out.push(<strong key={k}>{inline(m[3] ?? m[4], k)}</strong>)
    else if (m[5]) out.push(<em key={k}>{inline(m[5], k)}</em>)
    else if (m[6]) out.push(link(m[6], m[6].replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), k))
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/

/**
 * Block markdown: groups consecutive bullet / numbered lines into a list, turns
 * headings into bold lines, and joins other lines into paragraphs.
 */
function Rich({ text }: { text: string }) {
  type Block = { kind: 'p' | 'ul'; lines: string[] }
  const blocks: Block[] = []
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      blocks.push({ kind: 'p', lines: [] }) // paragraph break
      continue
    }
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/)
    const kind = BULLET.test(line) ? 'ul' : 'p'
    const content = heading ? `**${heading[1].replace(/\*\*/g, '')}**` : kind === 'ul' ? line.replace(BULLET, '') : line.trim()
    const prev = blocks[blocks.length - 1]
    if (prev && prev.kind === kind && (kind === 'ul' || prev.lines.length > 0)) prev.lines.push(content)
    else blocks.push({ kind, lines: [content] })
  }
  return (
    <>
      {blocks
        .filter((b) => b.lines.length)
        .map((b, bi) =>
          b.kind === 'ul' ? (
            <ul key={bi}>
              {b.lines.map((l, li) => (
                <li key={li}>{inline(l, `${bi}-${li}`)}</li>
              ))}
            </ul>
          ) : (
            <p key={bi}>
              {b.lines.map((l, li) => (
                <span key={li}>
                  {li > 0 && <br />}
                  {inline(l, `${bi}-${li}`)}
                </span>
              ))}
            </p>
          ),
        )}
    </>
  )
}

export default function Assistant() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([GREETING])
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const nextId = useRef(1)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const titleId = useId()

  // Keep the newest message in view.
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [msgs, busy])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => () => abortRef.current?.abort(), [])

  function close() {
    setOpen(false)
    launcherRef.current?.focus({ preventScroll: true })
  }

  async function ask(raw: string) {
    const question = raw.trim().slice(0, MAX_LEN)
    if (!question || busy) return
    const user: Msg = { id: nextId.current++, role: 'user', text: question }
    const history: ChatTurn[] = [...msgs.slice(1), user].map((m) => ({ role: m.role, content: m.text }))
    setMsgs((m) => [...m, user])
    setValue('')

    const local = answer(question)
    let reply: Msg = { id: nextId.current++, role: 'assistant', text: local.text, section: local.section, suggest: local.suggest }
    if (aiEnabled) {
      setBusy(true)
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const timer = window.setTimeout(() => ctrl.abort(), 15000)
      try {
        const text = await askAI(history, ctrl.signal)
        // The AI writes the words; the built-in answerer still offers the jump and follow-ups.
        reply = { ...reply, text }
      } catch {
        // keep the built-in answer
      } finally {
        window.clearTimeout(timer)
        setBusy(false)
      }
    }
    setMsgs((m) => [...m, reply])
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void ask(value)
  }

  const showSection = (id: SectionId) => {
    setOpen(false)
    scrollToSection(id)
  }

  const last = msgs[msgs.length - 1]

  return (
    <div className={`assistant${open ? ' assistant--open' : ''}`}>
      {open && (
        <section className="assistant__panel" role="dialog" aria-modal="false" aria-labelledby={titleId}>
          <header className="assistant__head">
            <span className="assistant__eye" aria-hidden="true">
              <EyeIcon />
            </span>
            <span className="assistant__meta">
              <span className="mono assistant__kicker">{aiEnabled ? 'AI · answers from this portfolio' : 'Answers from this portfolio'}</span>
              <h2 className="gothic assistant__title" id={titleId}>
                Shinigami AI
              </h2>
            </span>
            <button type="button" className="assistant__close" onClick={close}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Close the chat</span>
            </button>
          </header>

          <div className="assistant__log" ref={logRef} aria-live="polite" aria-busy={busy}>
            {msgs.map((m) => (
              <div key={m.id} className={`assistant__msg assistant__msg--${m.role}`}>
                <span className="visually-hidden">{m.role === 'user' ? 'You:' : 'Shinigami AI:'}</span>
                <div className="assistant__bubble">
                  {m.role === 'assistant' ? <Rich text={m.text} /> : <p>{m.text}</p>}
                  {m.role === 'assistant' && m.section && (
                    <button type="button" className="mono assistant__jump" onClick={() => showSection(m.section!)}>
                      Show me: {sections.find((s) => s.id === m.section)?.plain} ↓
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="assistant__msg assistant__msg--assistant">
                <div className="assistant__bubble assistant__typing" aria-label="Writing an answer">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {!busy && last.role === 'assistant' && last.suggest && last.suggest.length > 0 && (
            <div className="assistant__chips" aria-label="Suggested questions">
              {last.suggest.map((s) => (
                <button key={s} type="button" className="assistant__chip" onClick={() => void ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <form className="assistant__form" onSubmit={onSubmit}>
            <label htmlFor="assistant-input" className="visually-hidden">
              Your question
            </label>
            <input
              ref={inputRef}
              id="assistant-input"
              className="assistant__input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={MAX_LEN}
              placeholder={`Ask about ${profile.shortName}…`}
              autoComplete="off"
              enterKeyHint="send"
              disabled={busy}
            />
            <button type="submit" className="assistant__send" disabled={busy || !value.trim()}>
              <SendIcon />
              <span className="visually-hidden">Send</span>
            </button>
          </form>
          <p className="mono assistant__note">{aiEnabled ? 'AI can make mistakes; the sections hold the full record.' : 'Answers come straight from the note.'}</p>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        className="assistant__launcher"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <EyeIcon />
        <span className="mono assistant__launcher-label">{open ? 'Close' : 'Shinigami AI'}</span>
        <span className="visually-hidden">{open ? '' : `: chat about ${profile.name}`}</span>
      </button>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg className="assistant__icon" viewBox="0 0 24 14" aria-hidden="true" focusable="false">
      <path d="M1 7C4.5 2 8 0.8 12 0.8S19.5 2 23 7c-3.5 5-7 6.2-11 6.2S4.5 12 1 7Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="7" r="3.3" fill="currentColor" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M4 12 20 4l-6 16-3-7-7-1Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
