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
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  // **bold** · [label](url) · bare https://… addresses (AI answers sometimes write those)
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|(https?:\/\/[^\s<>()\]]+[^\s<>()\].,;:!?'"])/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[1]) out.push(<strong key={`${key}-${i++}`}>{m[1]}</strong>)
    else if (m[4]) {
      out.push(
        <a key={`${key}-${i++}`} href={m[4]} target="_blank" rel="noopener noreferrer">
          {m[4].replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
        </a>,
      )
    } else {
      const external = !m[3].startsWith('mailto:')
      out.push(
        <a key={`${key}-${i++}`} href={m[3]} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {m[2]}
        </a>,
      )
    }
    last = re.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        if (lines.every((l) => /^\s*[-*•] /.test(l))) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*[-*•] /, ''), `${bi}-${li}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {inline(l.replace(/^\s*[-*•] /, '• '), `${bi}-${li}`)}
              </span>
            ))}
          </p>
        )
      })}
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
