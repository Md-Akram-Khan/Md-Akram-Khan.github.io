import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, FormEvent, ReactNode } from 'react'
import { profile, sections } from '../data/portfolio'
import RuleEyebrow from '../components/RuleEyebrow'
import PenReel from '../components/PenReel'
import './Contact.css'

const meta = sections.find((s) => s.id === 'contact') ?? { numeral: 'IV', label: 'Write a Name' }

/** Seconds until the "urge" arrives. */
const URGE_SECONDS = 40
/** How many written names stay visible on the page. */
const MAX_ENTRIES = 4
const MAX_LENGTH = 40

// Original parody "causes", warm and never threatening. The first one is always used first.
const CAUSES = [
  'an overwhelming urge to collaborate',
  'a sudden need to star a repository',
  'an irresistible pull towards a pull request',
  'acute curiosity about what we could build together',
  'a calm, unshakeable certainty that it is time to say hello',
]

type Entry = { id: number; name: string; cause: string; ms: number }
type Status = { kind: 'idle' | 'error' | 'written' | 'owner'; text: string }

type ContactLink = {
  id: string
  label: string
  caption: string
  href: string
  external: boolean
  icon: ReactNode
}

const links: ContactLink[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    caption: 'Say hello, professionally',
    href: profile.links.linkedin,
    external: true,
    icon: <LinkedInIcon />,
  },
  {
    id: 'github',
    label: 'GitHub',
    caption: 'Read the code first',
    href: profile.links.github,
    external: true,
    icon: <GitHubIcon />,
  },
  ...(profile.email
    ? [
        {
          id: 'email',
          label: 'Email',
          caption: profile.email,
          href: `mailto:${profile.email}`,
          external: false,
          icon: <MailIcon />,
        },
      ]
    : []),
]

const pad = (n: number) => String(n).padStart(2, '0')
const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
/** Glue the last two words together so a wrapped cause never leaves one word alone on a line. */
const noOrphan = (s: string) => s.replace(/ (\S+)$/, ' $1')
const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)
const ownerWords = new Set(words(profile.name))
const ownerShort = profile.shortName.toLowerCase()
/**
 * The owner's own name ("Akram", "Akram Khan", the full name), compared as whole
 * words: "Akramul" or "Akram Hossain" is someone else and may write freely.
 */
const isOwner = (s: string) => {
  const w = words(s)
  return w.includes(ownerShort) && w.every((x) => ownerWords.has(x))
}

export default function Contact() {
  const [value, setValue] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' })
  const [deadline, setDeadline] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const written = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Count down to the "urge": one update per whole second, measured against a fixed deadline
  // so timer drift never accumulates (re-renders this section only, once a second).
  useEffect(() => {
    if (deadline === null) return
    let timer = 0
    const tick = () => {
      const ms = deadline - Date.now()
      const left = Math.max(0, Math.ceil(ms / 1000))
      setRemaining(left)
      if (left > 0) timer = window.setTimeout(tick, (ms % 1000) + 15)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [deadline])

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    if (status.kind === 'error' || status.kind === 'owner') setStatus({ kind: 'idle', text: '' })
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const name = clean(value)
    if (!name) {
      setStatus({ kind: 'error', text: 'The page is still blank. Write a name first; a nickname will do.' })
      inputRef.current?.focus()
      return
    }
    if (isOwner(name)) {
      setStatus({
        kind: 'owner',
        text: `${profile.shortName}’s name is already on every page of this note. Try your own.`,
      })
      inputRef.current?.focus()
      return
    }
    const cause = CAUSES[written.current % CAUSES.length]
    written.current += 1
    const id = written.current
    const ms = Math.min(1900, 520 + name.length * 75)
    setEntries((list) => [...list, { id, name, cause, ms }].slice(-MAX_ENTRIES))
    setStatus({
      kind: 'written',
      text: `Your name has been written. Within ${URGE_SECONDS} seconds, you will feel ${cause}. The links below will help.`,
    })
    setDeadline(Date.now() + URGE_SECONDS * 1000)
    setValue('')
  }

  const summoned = entries.length > 0
  const invalid = status.kind === 'error'
  const nextLine = (entries.length ? entries[entries.length - 1].id : 0) + 1

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="container contact__inner">
        <div className="contact__col">
          <header className="contact__header">
            <RuleEyebrow numeral={meta.numeral} subtitle="Contact" className="contact__eyebrow" />
            <h2 id="contact-title" className="gothic contact__title">
              {meta.label}
            </h2>
            <p className="contact__lede">
              Every name in this note so far has been a project. The last line is saved for you: write your
              name, see what happens, then say hello.
            </p>
          </header>

          <PenReel replayKey={nextLine - 1} />

          <div className="panel contact__page">
            <div className="contact__page-head">
              <p className="mono contact__page-title">Instructions for the last page</p>
              <ol className="rules-text contact__page-rules">
                <li>Write one name per line. Nicknames are accepted.</li>
                <li id="contact-privacy">Nothing written here is stored or sent. The ink dries when you leave.</li>
              </ol>
            </div>

            <div className="contact__sheet">
              {entries.length > 0 && (
                <ol className="contact__entries" aria-label="Names written on this page">
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="contact__entry"
                      style={{ '--write-dur': `${entry.ms}ms` } as CSSProperties}
                    >
                      <span className="mono contact__line-no" aria-hidden="true">
                        {pad(entry.id)}
                      </span>
                      <span className="hand contact__entry-name">
                        <span className="contact__ink">{entry.name}</span>
                        <span className="contact__nib" aria-hidden="true">
                          <QuillIcon />
                        </span>
                      </span>
                      <span className="rules-text contact__entry-cause">
                        <span className="visually-hidden">, cause: </span>
                        <span aria-hidden="true">— </span>
                        {noOrphan(entry.cause)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}

              <form className="contact__form" onSubmit={onSubmit} noValidate aria-label="Write a name in the note">
                <label htmlFor="contact-name" className="mono contact__label">
                  Your name
                </label>
                <div className="contact__field">
                  <span className="mono contact__line-no contact__line-no--next" aria-hidden="true">
                    {pad(nextLine)}
                  </span>
                  <span className="contact__line">
                    <input
                      ref={inputRef}
                      id="contact-name"
                      name="name"
                      type="text"
                      className="hand contact__input"
                      value={value}
                      onChange={onChange}
                      maxLength={MAX_LENGTH}
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="done"
                      placeholder={summoned ? 'Another name?' : 'write it here…'}
                      aria-invalid={invalid || undefined}
                      aria-describedby={invalid ? 'contact-status contact-privacy' : 'contact-privacy'}
                    />
                  </span>
                  <button type="submit" className="contact__write">
                    <QuillIcon />
                    <span>Write it</span>
                  </button>
                </div>
              </form>

              <div className="contact__result">
                <p
                  id="contact-status"
                  role="status"
                  className={`contact__status contact__status--${status.kind}`}
                >
                  {status.text}
                </p>
                {remaining !== null && status.kind !== 'error' && (
                  <p className={`mono contact__timer${remaining === 0 ? ' contact__timer--done' : ''}`} aria-hidden="true">
                    {remaining > 0 ? (
                      <>
                        Urge arrives in <span className="contact__clock">00:{pad(remaining)}</span>
                      </>
                    ) : (
                      <>The urge has arrived. Pick a link below.</>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={`contact__reach${summoned ? ' contact__reach--summoned' : ''}`}>
            <h3 className="mono contact__reach-title">Where to find me</h3>
            <ul className="contact__links">
              {links.map((link) => (
                <li key={link.id} className={`contact__item contact__item--${link.id}`}>
                  <a
                    className="contact__link"
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    <span className="contact__icon" aria-hidden="true">
                      {link.icon}
                    </span>
                    <span className="contact__link-text">
                      <span className="contact__link-label">{link.label}</span>
                      <span className="contact__link-caption">{link.caption}</span>
                    </span>
                    <ArrowIcon external={link.external} />
                    {link.external && <span className="visually-hidden"> (opens in a new tab)</span>}
                  </a>
                </li>
              ))}
            </ul>
            <p className="contact__location">
              <PinIcon />
              <span>
                <span className="mono contact__location-label">Based in</span> {profile.location}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ───────────── Icons (inline, decorative) ───────────── */

function QuillIcon() {
  return (
    <svg className="contact__quill" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M20.5 3.5c-5.2-.6-10 2.4-12 7.6l-1.2 3.4 2.6.4 1.7-1.2c-.2.9-.6 1.7-1.1 2.4 4.9.3 9.2-3.6 10-12.6z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M3.5 20.5 14 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6.6" y="10" width="2.3" height="7.4" fill="currentColor" />
      <circle cx="7.75" cy="7.1" r="1.4" fill="currentColor" />
      <path
        d="M11.3 10h2.2v1.05c.48-.78 1.38-1.25 2.45-1.25 1.95 0 2.85 1.2 2.85 3.35v4.25h-2.3v-3.85c0-1.07-.38-1.65-1.25-1.65-.98 0-1.6.7-1.6 1.85v3.65h-2.35z"
        fill="currentColor"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  )
}

function ArrowIcon({ external }: { external: boolean }) {
  return (
    <svg className="contact__arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d={external ? 'M7 17 17 7M9 7h8v8' : 'M5 12h14M13 6l6 6-6 6'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="contact__pin" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
