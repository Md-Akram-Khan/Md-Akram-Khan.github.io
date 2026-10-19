// RULE III · "Cases Closed" — competitive programming. Every accepted solution is a
// case closed: the total is kept in a case file, and each online judge is written
// into a ledger page like a name in the note, with its count and an ink bar.
// Under reduced motion (or without IntersectionObserver) everything shows at once.
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { judges, judgesAsOf, problemSolving, sections } from '../data/portfolio'
import { useReducedMotion } from '../lib/env'
import RuleEyebrow from '../components/RuleEyebrow'
import './Cases.css'

const meta = sections.find((s) => s.id === 'cases')
const total = judges.reduce((n, j) => n + j.solved, 0)
const top = judges.reduce((a, b) => (b.solved > a.solved ? b : a))
const firstYear = Math.min(...problemSolving.map((p) => p.since ?? Infinity))
const fmt = (n: number) => n.toLocaleString('en-US')

export default function Cases() {
  const ref = useRef<HTMLElement>(null)
  const numRef = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const instant = reduced || typeof IntersectionObserver === 'undefined'

  // Arm the hidden states (and zero the counter) before first paint, so nothing
  // flashes. The rendered markup always holds the final total.
  useLayoutEffect(() => {
    if (instant) return
    ref.current?.classList.add('cases--armed')
    if (numRef.current) numRef.current.textContent = '0'
  }, [instant])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (instant) {
      items.forEach((el) => el.classList.add('is-in'))
      if (numRef.current) numRef.current.textContent = fmt(total)
      return
    }
    let raf = 0
    // The total counts up once the case file comes into view (written straight to
    // the DOM: no React re-render per frame).
    const countUp = () => {
      const t0 = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / 1600)
        if (numRef.current) numRef.current.textContent = fmt(Math.round(total * (1 - Math.pow(1 - k, 3))))
        if (k < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          if ((entry.target as HTMLElement).dataset.count !== undefined) countUp()
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.2 },
    )
    items.forEach((el) => io.observe(el))
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [instant])

  return (
    <section id="cases" className="section cases" aria-labelledby="cases-title" ref={ref}>
      <div className="container">
        <header className="cases__intro" data-reveal>
          <RuleEyebrow numeral={meta?.numeral ?? 'III'} subtitle="Problem Solving" className="cases__eyebrow" />
          <h2 className="gothic cases__title" id="cases-title">
            {meta?.label ?? 'Cases Closed'}
          </h2>
          <p className="hand cases__lede">Every accepted solution is a case closed, and a name crossed off the list.</p>
        </header>

        <div className="cases__grid">
          {/* The case file: the running total */}
          <article className="panel cases__file" data-reveal data-count aria-label="Case file summary">
            <p className="mono cases__file-label">Case file · Competitive programming</p>
            <p className="cases__total">
              <span className="gothic cases__total-num" aria-hidden="true" ref={numRef}>
                {fmt(total)}
              </span>
              <span className="visually-hidden">{fmt(total)} problems solved</span>
              <span className="mono cases__total-unit" aria-hidden="true">
                cases closed
              </span>
            </p>
            <p className="cases__total-note">
              Accepted solutions across {judges.length} online judges.
            </p>
            <dl className="cases__facts">
              <div>
                <dt className="mono">Largest file</dt>
                <dd>
                  {top.name} <span className="cases__fact-num">· {fmt(top.solved)}</span>
                </dd>
              </div>
              <div>
                <dt className="mono">Judges</dt>
                <dd>{judges.length}</dd>
              </div>
              {Number.isFinite(firstYear) && (
                <div>
                  <dt className="mono">On the case since</dt>
                  <dd>{firstYear}</dd>
                </div>
              )}
            </dl>
            <p className="hand cases__verdict">The investigation never ends.</p>
          </article>

          {/* The ledger: one judge per line, written like a name in the note */}
          <article className="panel cases__ledger" data-reveal aria-labelledby="cases-ledger-title">
            <div className="cases__ledger-head">
              <h3 className="gothic cases__ledger-title" id="cases-ledger-title">
                The Ledger
              </h3>
              <p className="mono cases__ledger-sub">Solved, by judge</p>
            </div>
            <ol className="cases__rows" role="list">
              {judges.map((j, i) => (
                <li
                  key={j.name}
                  className="cases__row"
                  style={
                    {
                      '--share': j.solved / top.solved,
                      '--brand': j.color,
                      '--i': i,
                    } as CSSProperties
                  }
                >
                  <a className="cases__link" href={j.url} target="_blank" rel="noopener noreferrer">
                    <span className="mono cases__row-no" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="cases__who">
                      <span className="hand cases__judge">{j.name}</span>
                      <span className="mono cases__handle">@{j.handle}</span>
                    </span>
                    <span className="cases__count">
                      <span className="gothic cases__count-num">{fmt(j.solved)}</span>
                      <span className="mono cases__count-unit">solved</span>
                    </span>
                    <span className="cases__bar" aria-hidden="true">
                      <span className="cases__bar-ink" />
                    </span>
                    <span className="visually-hidden"> — {j.name} profile (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="mono cases__asof">Counts as of {judgesAsOf}</p>
          </article>
        </div>

        {/* Case notes: the practice repositories */}
        <div className="cases__notes" data-reveal>
          <h3 className="mono cases__notes-title">Case notes · practice notebooks on GitHub</h3>
          <ul className="cases__notes-list" role="list">
            {problemSolving.map((p) => (
              <li key={p.repo}>
                <a className="cases__note" href={p.repo} target="_blank" rel="noopener noreferrer">
                  <span className="rules-text cases__note-title">{p.title}</span>
                  {p.since ? <span className="mono cases__note-since">since {p.since}</span> : null}
                  <span className="cases__note-detail">{p.detail}</span>
                  <span className="visually-hidden"> (GitHub repository, opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
