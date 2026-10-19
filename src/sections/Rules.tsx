// RULE I · "How to Use It" — the About section, written on the note's inside cover.
// Each rule is "written in" (ink wipe) as it scrolls into view. Under reduced
// motion, or without IntersectionObserver, every rule is shown immediately.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { about, profile, rules, sections } from '../data/portfolio'
import { useReducedMotion } from '../lib/env'
import RuleEyebrow from '../components/RuleEyebrow'
import './Rules.css'

const numeral = sections.find((s) => s.id === 'rules')?.numeral ?? 'I'

const links = [
  { label: 'GitHub', href: profile.links.github },
  { label: 'LinkedIn', href: profile.links.linkedin },
]

export default function Rules() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  // Arm the hidden state before first paint, so nothing flashes in and out.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || reduced || !('IntersectionObserver' in window)) return
    root.classList.add('rules--armed')
  }, [reduced])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-revealed'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        // Items that arrive together are written one after another.
        let n = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.style.setProperty('--reveal-delay', `${n * 180}ms`)
          el.classList.add('is-revealed')
          io.unobserve(el)
          n++
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.25 },
    )
    items.forEach((el) => {
      if (!el.classList.contains('is-revealed')) io.observe(el)
    })
    return () => io.disconnect()
  }, [reduced])

  return (
    <section id="rules" ref={rootRef} className="section rules" aria-labelledby="rules-title">
      <div className="container rules__layout">
        <div className="panel rules__panel">
          <span className="rules__corner rules__corner--tl" aria-hidden="true" />
          <span className="rules__corner rules__corner--tr" aria-hidden="true" />
          <span className="rules__corner rules__corner--bl" aria-hidden="true" />
          <span className="rules__corner rules__corner--br" aria-hidden="true" />

          <header className="rules__head" data-reveal>
            <RuleEyebrow numeral={numeral} subtitle="About" className="rules__eyebrow" />
            <h2 id="rules-title" className="gothic rules__title">
              How to Use It
            </h2>
            <p className="rules__lead">
              Inside the front cover, in small and careful letters: the rules of this note. They double,
              conveniently, as an introduction to its owner.
            </p>
          </header>

          <ol className="rules__list" role="list">
            {rules.map((rule) => (
              <li key={rule.numeral} className="rules__item" data-reveal>
                <span className="rules__num">
                  <span className="visually-hidden">Rule </span>
                  {rule.numeral}
                </span>
                <p className="rules-text rules__text">{rule.text}</p>
              </li>
            ))}
          </ol>

          <div className="rules__owner" data-reveal>
            <p className="rules__owner-label mono">{about.label}</p>
            <h3 className="gothic rules__owner-title">{about.title}</h3>
            <p className="hand rules__owner-name">{profile.name}</p>
            <div className="rules__bio">
              {about.paragraphs.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
            <p className="hand rules__verdict">
              {about.verdict.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
            <dl className="rules__owner-facts">
              <div>
                <dt className="mono">Role</dt>
                <dd>{profile.role}</dd>
              </div>
              <div>
                <dt className="mono">Based in</dt>
                <dd>{profile.location}</dd>
              </div>
            </dl>
            <ul className="rules__owner-links" role="list">
              {links.map((link) => (
                <li key={link.label}>
                  <a className="rules__link mono" href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                    <svg className="rules__link-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                      <path d="M3 9 9 3M4.5 3H9v4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  </a>
                </li>
              ))}
              {profile.email ? (
                <li>
                  <a className="rules__link mono" href={`mailto:${profile.email}`}>
                    Email
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
