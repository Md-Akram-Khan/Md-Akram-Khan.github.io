// RULE III · "Shinigami Eyes" — skills and practice notebooks.
// Hovering a skill shows it "through the eyes": a red reticle, a scan line and a
// short decode of its name. The "Make the eye deal" toggle reveals every skill at
// once (keyboard and touch friendly). Reduced motion: no decode, no scan, no reveal delay.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { problemSolving, sections, skillGroups } from '../data/portfolio'
import { useReducedMotion } from '../lib/env'
import RuleEyebrow from '../components/RuleEyebrow'
import './Skills.css'

const numeral = sections.find((s) => s.id === 'eyes')?.numeral ?? 'III'
const totalSkills = skillGroups.reduce((n, g) => n + g.items.length, 0)

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&+=<>/?'
const running = new WeakMap<HTMLElement, number>()

/** Scramble a chip's name and resolve it left to right (an aria-hidden overlay; the real text never changes). */
function decode(chip: HTMLElement, delay = 0) {
  const label = chip.querySelector<HTMLElement>('.skills__chip-label')
  const ghost = chip.querySelector<HTMLElement>('.skills__chip-ghost')
  if (!label || !ghost) return
  const text = label.textContent ?? ''
  const prev = running.get(chip)
  if (prev) cancelAnimationFrame(prev)

  const start = performance.now() + delay
  const duration = 320 + text.length * 22
  const tick = (now: number) => {
    const t = (now - start) / duration
    if (t < 0) {
      running.set(chip, requestAnimationFrame(tick))
      return
    }
    if (t >= 1) {
      ghost.textContent = ''
      chip.classList.remove('is-decoding')
      running.delete(chip)
      return
    }
    chip.classList.add('is-decoding')
    const solved = Math.floor(t * t * text.length)
    let out = ''
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      out += i < solved || !/[A-Za-z0-9]/.test(c) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]
    }
    ghost.textContent = out
    running.set(chip, requestAnimationFrame(tick))
  }
  running.set(chip, requestAnimationFrame(tick))
}

export default function Skills() {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const [eyes, setEyes] = useState(false)

  // Arm the hidden state before first paint, so nothing flashes in and out.
  // (Set on the panel: its className never changes, so React never resets it.)
  useLayoutEffect(() => {
    const panel = rootRef.current?.querySelector('.skills__panel')
    if (!panel || reduced || !('IntersectionObserver' in window)) return
    panel.classList.add('skills--armed')
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
        let n = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          const delay = n * 140
          el.style.setProperty('--reveal-delay', `${delay}ms`)
          el.classList.add('is-revealed')
          // A skill group "comes into focus": its names decode one after another.
          el.querySelectorAll<HTMLElement>('.skills__chip').forEach((chip, i) => decode(chip, delay + 200 + i * 70))
          io.unobserve(el)
          n++
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.2 },
    )
    items.forEach((el) => {
      if (!el.classList.contains('is-revealed')) io.observe(el)
    })
    return () => io.disconnect()
  }, [reduced])

  const onChipEnter = useCallback(
    (e: ReactPointerEvent<HTMLLIElement>) => {
      if (reduced || e.pointerType !== 'mouse') return
      decode(e.currentTarget)
    },
    [reduced],
  )

  const toggleEyes = () => {
    const next = !eyes
    setEyes(next)
    if (next && !reduced && rootRef.current) {
      rootRef.current.querySelectorAll<HTMLElement>('.skills__chip').forEach((chip, i) => decode(chip, i * 35))
    }
  }

  return (
    <section
      id="eyes"
      ref={rootRef}
      className={`section skills${eyes ? ' skills--open' : ''}`}
      aria-labelledby="eyes-title"
      data-eyes={eyes ? 'open' : 'closed'}
    >
      <div className="container skills__layout">
        <div className="panel skills__panel">
          <div className="skills__sweep" aria-hidden="true" />

          <header className="skills__head" data-reveal>
            <RuleEyebrow numeral={numeral} subtitle="Skills" className="skills__eyebrow" />
            <h2 id="eyes-title" className="gothic skills__title">
              Shinigami <span className="skills__title-accent">Eyes</span>
            </h2>
            <p className="skills__lead">
              Make the eye deal and every tool in the room shows you its name. Mine cost far less than half a
              lifespan: mostly stack traces.
            </p>
            <div className="skills__controls">
              <button type="button" className="skills__deal" aria-pressed={eyes} onClick={toggleEyes}>
                <svg className="skills__deal-icon" viewBox="0 0 40 14" aria-hidden="true" focusable="false">
                  <path className="skills__deal-lid" d="M1 7c3.2-4.2 12.8-4.2 16 0-3.2 4.2-12.8 4.2-16 0Z" />
                  <path className="skills__deal-lid" d="M23 7c3.2-4.2 12.8-4.2 16 0-3.2 4.2-12.8 4.2-16 0Z" />
                  <ellipse className="skills__deal-pupil" cx="9" cy="7" rx="1.1" ry="2.6" />
                  <ellipse className="skills__deal-pupil" cx="31" cy="7" rx="1.1" ry="2.6" />
                </svg>
                <span>Make the eye deal</span>
                <span className="skills__deal-state mono" aria-hidden="true">
                  {eyes ? 'open' : 'closed'}
                </span>
              </button>
              <p className="skills__hint mono">or hover over any name</p>
            </div>
            <p className="visually-hidden" role="status">
              {eyes ? `The eyes are open: ${totalSkills} names revealed.` : ''}
            </p>
          </header>

          <div className="skills__groups">
            {skillGroups.map((group, gi) => (
              <div key={group.title} className="skills__group" data-reveal>
                <h3 className="skills__group-title">
                  <span className="skills__group-index mono" aria-hidden="true">
                    {String(gi + 1).padStart(2, '0')}
                  </span>
                  {group.title}
                  <span className="skills__group-count mono" aria-hidden="true">
                    ×{group.items.length}
                  </span>
                </h3>
                <ul className="skills__chips" role="list">
                  {group.items.map((item) => (
                    <li key={item} className="skills__chip mono" onPointerEnter={onChipEnter}>
                      <span className="skills__chip-label">{item}</span>
                      <span className="skills__chip-ghost" aria-hidden="true" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="skills__practice" data-reveal>
            <h3 className="gothic skills__practice-title">Practice notebooks</h3>
            <p className="skills__practice-lead">Competitive programming and DSA practice, kept in the open.</p>
            <ul className="skills__notebooks" role="list">
              {problemSolving.map((p) => (
                <li key={p.repo}>
                  <a className="skills__notebook" href={p.repo} target="_blank" rel="noopener noreferrer">
                    <span className="skills__notebook-row">
                      <span className="rules-text skills__notebook-title">{p.title}</span>{' '}
                      <span className="skills__notebook-leader" aria-hidden="true" />
                      {p.since ? <span className="mono skills__notebook-since">since {p.since}</span> : null}{' '}
                      <svg className="skills__notebook-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                        <path d="M3 9 9 3M4.5 3H9v4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                    </span>{' '}
                    <span className="skills__notebook-detail">{p.detail}</span>
                    <span className="visually-hidden"> (GitHub repository, opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
