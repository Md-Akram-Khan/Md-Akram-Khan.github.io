import { useEffect, useRef, useState } from 'react'
import './MusicPlayer.css'

// L's Theme A, played through YouTube's own embedded player. Nothing is downloaded or
// re-hosted, and YouTube's rules require the player to stay visible (≥ 200×200 px), so
// the music lives in a small card the visitor opens. The iframe only mounts on open, so
// no request reaches YouTube until the visitor asks for music.
const VIDEO_ID = 'E3bOruXptlg'
const TITLE = 'L’s Theme A'
const SOURCE = 'Death Note soundtrack'
const EMBED =
  `https://www.youtube-nocookie.com/embed/${VIDEO_ID}` +
  `?autoplay=1&loop=1&playlist=${VIDEO_ID}&rel=0&modestbranding=1&playsinline=1`
const WATCH = `https://www.youtube.com/watch?v=${VIDEO_ID}`
const PANEL_ID = 'music-player'

export default function MusicPlayer() {
  const [open, setOpen] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeBtn.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    setOpen(false)
    launcher.current?.focus({ preventScroll: true })
  }

  return (
    <div className={`music${open ? ' music--open' : ''}`}>
      {open && (
        <section id={PANEL_ID} className="music__card panel" aria-label="Music player">
          <header className="music__head">
            <span className="music__bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="music__meta">
              <span className="mono music__eyebrow">Now playing</span>
              <span className="gothic music__title">{TITLE}</span>
            </span>
            <button ref={closeBtn} type="button" className="music__close" onClick={close}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Stop the music and close the player</span>
            </button>
          </header>
          <div className="music__screen">
            <iframe
              className="music__frame"
              src={EMBED}
              title={`${TITLE}, ${SOURCE} (YouTube player)`}
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="mono music__credit">
            {SOURCE} ·{' '}
            <a href={WATCH} target="_blank" rel="noopener noreferrer">
              Watch on YouTube<span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </p>
        </section>
      )}

      <button
        ref={launcher}
        type="button"
        className="music__launcher"
        aria-expanded={open}
        aria-controls={open ? PANEL_ID : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <NoteIcon />
        <span className="mono music__launcher-label">{open ? 'Stop' : 'Music'}</span>
        <span className="visually-hidden">{open ? ': stop L’s Theme' : ': play L’s Theme from the Death Note soundtrack'}</span>
      </button>
    </div>
  )
}

function NoteIcon() {
  return (
    <svg className="music__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M9 17.5V5.5l10-2v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.5" fill="currentColor" />
      <circle cx="16.5" cy="15.5" r="2.5" fill="currentColor" />
    </svg>
  )
}
