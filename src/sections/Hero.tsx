// Rule 0 · The Note — the opening section and the page's only <h1>.
// Desktop: content in the left ~55% (the 3D notebook floats on the right).
// Mobile: content in the lower part of the viewport (the notebook sits above).
import { Fragment, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { profile, sections } from '../data/portfolio'
import { scrollToSection } from '../lib/scroll'
import RuleEyebrow from '../components/RuleEyebrow'
import './Hero.css'

const HAND_LINE = 'The developer whose name is written in this note shall ship.'

const heroMeta = sections.find((s) => s.id === 'hero')
const [namePrefix, ...nameRest] = profile.name.split(' ')
const nameMain = nameRest.join(' ')

// The intro publishes its state on <html data-intro> (see Intro.tsx).
const readIntro = () => document.documentElement.dataset.intro ?? 'none'
function subscribeIntro(onChange: () => void) {
  window.addEventListener('note:intro-done', onChange)
  return () => window.removeEventListener('note:intro-done', onChange)
}

/**
 * True while the entrance should wait for the intro. The wait itself is a CSS
 * delay that starts on the same frame as the intro, so the text appears on time
 * even if the main thread is busy. If the visitor skips the intro, this flips
 * to false and the entrance restarts immediately.
 */
function useBehindIntro() {
  // Intro renders before Hero and has already published whether it plays.
  const [startedBehind] = useState(() => readIntro() === 'playing')
  const intro = useSyncExternalStore(subscribeIntro, readIntro, () => 'none')
  return startedBehind && intro !== 'skipped'
}

/** Move to the rules, update the hash without jumping, and carry keyboard focus along. */
function openNote() {
  scrollToSection('rules')
  try {
    history.replaceState(null, '', '#rules')
  } catch {
    /* ignore */
  }
  const el = document.getElementById('rules')
  if (!el) return
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1')
    el.setAttribute('data-nav-target', '')
  }
  el.focus({ preventScroll: true })
}

const v = (vars: Record<string, string | number>) => vars as CSSProperties

/** A line that writes itself, one letter at a time, in wet red ink that dries. */
function HandLine({ text }: { text: string }) {
  // Each letter gets a running index for its delay; spaces count too, so the
  // pen pauses briefly between words. Words never break across lines.
  let n = 0
  const words = text.split(' ').map((word) => {
    const letters = Array.from(word).map((ch) => ({ ch, i: n++ }))
    n++
    return letters
  })
  return (
    <p className="hero__hand hand">
      <span className="visually-hidden">{text}</span>
      <span className="hero__hand-ink" aria-hidden="true">
        {words.map((letters, w) => (
          <Fragment key={w}>
            {w > 0 && ' '}
            <span className="hero__word">
              {letters.map(({ ch, i }) => (
                <span key={i} className="hero__char" style={v({ '--i': i })}>
                  {ch}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </p>
  )
}

/** Everything that animates in. Re-mounted (via key) if the intro is skipped. */
function HeroBody() {
  return (
    <>
      <div className="hero__glow" aria-hidden="true" />

      <div className="container hero__inner">
        <div className="hero__content">
          <RuleEyebrow
            numeral={heroMeta?.numeral ?? '0'}
            subtitle={heroMeta?.label ?? 'The Note'}
            className="hero__eyebrow hero__reveal"
            style={v({ '--d': 0 })}
          />

          <h1 id="hero-title" className="hero__title gothic">
            <span className="hero__title-pre hero__reveal" style={v({ '--d': 1 })}>
              {namePrefix}
            </span>{' '}
            <span className="hero__title-name hero__reveal" style={v({ '--d': 2 })}>
              {nameMain}
              <svg
                className="hero__flourish"
                viewBox="0 0 600 40"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path pathLength="1" d="M6 27 C 90 13, 170 31, 262 22 S 430 9, 520 17 C 556 20, 580 25, 594 19" />
                <path className="hero__flourish-flick" pathLength="1" d="M 540 31 C 562 27, 582 27, 598 32" />
              </svg>
            </span>
          </h1>

          <p className="hero__role mono hero__reveal" style={v({ '--d': 3 })}>
            {profile.role}
          </p>

          <p className="hero__tagline hero__reveal" style={v({ '--d': 4 })}>
            {profile.tagline}
          </p>

          <HandLine text={HAND_LINE} />

          <div className="hero__actions hero__reveal" style={v({ '--d': 5 })}>
            <button type="button" className="hero__cta hero__cta--primary" onClick={openNote}>
              <span>Open the note</span>
              <svg className="hero__cta-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 4v16M5 13l7 7 7-7" />
              </svg>
            </button>
            <a className="hero__cta hero__cta--ghost" href={profile.links.github} target="_blank" rel="noopener noreferrer">
              <span>GitHub</span>
              <span className="visually-hidden"> (opens in a new tab)</span>
              <svg className="hero__cta-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
            <a className="hero__cta hero__cta--ghost" href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">
              <span>LinkedIn</span>
              <span className="visually-hidden"> (opens in a new tab)</span>
              <svg className="hero__cta-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
          </div>

          <p className="hero__location mono hero__reveal" style={v({ '--d': 6 })}>
            <svg className="hero__pin" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z" />
              <circle cx="12" cy="9.8" r="2.2" />
            </svg>
            <span className="visually-hidden">Location: </span>
            {profile.location}
          </p>
        </div>
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <span className="hero__scroll-line">
          <span className="hero__scroll-drop" />
        </span>
        <span className="hero__scroll-label mono">Scroll · turn the page</span>
      </div>
    </>
  )
}

export default function Hero() {
  const late = useBehindIntro()
  return (
    <section id="hero" className={`section hero${late ? ' hero--late' : ''}`} aria-labelledby="hero-title">
      <HeroBody key={late ? 'late' : 'now'} />
    </section>
  )
}
