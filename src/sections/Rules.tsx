// RULE I · "How to Use It" — the About section, written on the note's inside cover
// across two facing pages of the same size. Page one sits on the left beside the
// notebook; page two follows on the right, and the notebook crosses to the left
// for it (see scrollState.rulesSide). Each rule is "written in" (ink wipe) as it
// scrolls into view; under reduced motion, or without IntersectionObserver, every
// rule is shown immediately.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { profile, rules, sections, type Rule } from '../data/portfolio'
import { asset, useReducedMotion } from '../lib/env'
import { RULES_SECOND_PAGE_ID } from '../lib/scroll'
import RuleEyebrow from '../components/RuleEyebrow'
import './Rules.css'

const numeral = sections.find((s) => s.id === 'rules')?.numeral ?? 'I'
const pageOne = rules.filter((r) => r.page === 1)
const pageTwo = rules.filter((r) => r.page === 2)

function Corners() {
  return (
    <>
      <span className="rules__corner rules__corner--tl" aria-hidden="true" />
      <span className="rules__corner rules__corner--tr" aria-hidden="true" />
      <span className="rules__corner rules__corner--bl" aria-hidden="true" />
      <span className="rules__corner rules__corner--br" aria-hidden="true" />
    </>
  )
}

/** The owner's portrait, pinned to the page like a photo clipped to a case file. */
function CaseFilePhoto() {
  return (
    <figure className="rules__photo">
      <span className="rules__photo-tape" aria-hidden="true" />
      <picture>
        <source type="image/webp" srcSet={asset(profile.photo.webp)} />
        <img
          className="rules__photo-img"
          src={asset(profile.photo.jpg)}
          alt={profile.photo.alt}
          width={480}
          height={600}
          loading="lazy"
          decoding="async"
        />
      </picture>
      <span className="mono rules__photo-stamp" aria-hidden="true">
        Subject 01
      </span>
      <figcaption className="hand rules__photo-caption">{profile.name}</figcaption>
    </figure>
  )
}

function RuleItem({ rule }: { rule: Rule }) {
  return (
    <li className={`rules__item${rule.secret ? ' rules__item--secret' : ''}${rule.photo ? ' rules__item--photo' : ''}`} data-reveal>
      <span className="rules__num">
        <span className="visually-hidden">Rule </span>
        {rule.num}
      </span>
      {rule.photo && <CaseFilePhoto />}
      {rule.secret && (
        <p className="mono rules__seal">
          <EyeIcon />
          Final and secret rule
        </p>
      )}
      <h3 className="gothic rules__rule-title">{rule.title}</h3>
      <div className="rules-text rules__text">
        {rule.paragraphs.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      {rule.coda && <p className="hand rules__coda">{rule.coda}</p>}
    </li>
  )
}

function PageFoot({ n }: { n: string }) {
  return (
    <p className="mono rules__foot" aria-hidden="true">
      <span>—</span> Page {n} <span>—</span>
    </p>
  )
}

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
        {/* Page one: left, beside the notebook */}
        <article className="panel rules__panel rules__page rules__page--1" aria-label="How to Use It, page one">
          <Corners />
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
            {pageOne.map((rule) => (
              <RuleItem key={rule.num} rule={rule} />
            ))}
          </ol>
          <PageFoot n="I" />
        </article>

        {/* Page two: right; the notebook crosses to the left as it arrives */}
        <article
          id={RULES_SECOND_PAGE_ID}
          className="panel rules__panel rules__page rules__page--2"
          aria-label="How to Use It, page two"
        >
          <Corners />
          <ol className="rules__list" role="list" start={pageOne.length + 1}>
            {pageTwo.map((rule) => (
              <RuleItem key={rule.num} rule={rule} />
            ))}
          </ol>
          <PageFoot n="II" />
        </article>
      </div>
    </section>
  )
}

function EyeIcon() {
  return (
    <svg className="rules__seal-eye" viewBox="0 0 24 14" aria-hidden="true" focusable="false">
      <path d="M1 7C4.5 2 8 0.8 12 0.8S19.5 2 23 7c-3.5 5-7 6.2-11 6.2S4.5 12 1 7Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="7" r="3.3" fill="currentColor" />
    </svg>
  )
}
