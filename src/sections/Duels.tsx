// RULE V · "Duels Fought" — contests. Every contest is a battle of wits against
// the clock; each one is kept as an evidence card with the final standing stamped
// on it in red. Filter: all / team CTFs / solo programming contests.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { contests, sections, type Contest } from '../data/portfolio'
import { useReducedMotion } from '../lib/env'
import RuleEyebrow from '../components/RuleEyebrow'
import './Duels.css'

const meta = sections.find((s) => s.id === 'duels')

type Filter = 'all' | Contest['kind']
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ctf', label: 'CTF · Team' },
  { id: 'cp', label: 'CP · Solo' },
]

const KIND = {
  ctf: {
    badge: 'CTF',
    mode: 'Team',
    unit: 'teams',
    line: 'A capture-the-flag contest: security challenges cracked as a team, against the clock.',
    tags: ['Capture the Flag', 'Cyber Security', 'Teamwork'],
  },
  cp: {
    badge: 'CP',
    mode: 'Solo',
    unit: 'participants',
    line: 'A solo programming contest: algorithmic problems, one coder, one clock.',
    tags: ['Competitive Programming', 'Algorithms', 'Solo'],
  },
} as const

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
/** "Top x%" of the field (for "650+" fields the true share is even smaller). */
const topShare = (c: Contest) => Math.max(1, Math.ceil((c.rank / c.field) * 100))

const best = contests.reduce((a, b) => (topShare(b) < topShare(a) ? b : a))
const teamCount = contests.filter((c) => c.kind === 'ctf').length
const soloCount = contests.length - teamCount

function DuelCard({ c }: { c: Contest }) {
  const k = KIND[c.kind]
  const field = `${c.field}${c.fieldPlus ? '+' : ''}`
  return (
    <li className={`duels__card duels__card--${c.kind}`} data-reveal>
      <div className="duels__card-top">
        <span className={`mono duels__badge duels__badge--${c.kind}`}>
          {k.badge} <span aria-hidden="true">·</span> {k.mode}
        </span>
        <span className="mono duels__year">{c.year}</span>
      </div>
      <h3 className="gothic duels__name">{c.name}</h3>
      <p className="duels__org">
        <span className="mono duels__org-label">Organised by</span> {c.organizer}
      </p>
      {c.team && (
        <p className="duels__team">
          <span className="mono duels__team-label">Team</span>
          <span className="hand duels__team-name">{c.team}</span>
        </p>
      )}

      {/* the standing, stamped in red */}
      <div className="duels__verdict">
        <p className="duels__rank">
          <span className="gothic duels__rank-num">{ordinal(c.rank)}</span>
          <span className="duels__rank-of">
            place, among <strong>{field}</strong> {k.unit}
          </span>
        </p>
        <span className="mono duels__stamp" aria-label={`Top ${topShare(c)} percent`}>
          Top {topShare(c)}%
        </span>
      </div>

      <p className="duels__line">{k.line}</p>
      <ul className="duels__tags" role="list">
        {k.tags.map((t) => (
          <li key={t} className="mono duels__tag">
            {t}
          </li>
        ))}
      </ul>
    </li>
  )
}

export default function Duels() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const [filter, setFilter] = useState<Filter>('all')
  const instant = reduced || typeof IntersectionObserver === 'undefined'

  useLayoutEffect(() => {
    if (!instant) ref.current?.classList.add('duels--armed')
  }, [instant])

  // Reveal on scroll; re-run when the filter brings other cards into the list.
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)'))
    if (instant) {
      items.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [instant, filter])

  const shown = filter === 'all' ? contests : contests.filter((c) => c.kind === filter)

  return (
    <section id="duels" className="section duels" aria-labelledby="duels-title" ref={ref}>
      <div className="container">
        <header className="duels__intro" data-reveal>
          <div className="duels__heading">
            <RuleEyebrow numeral={meta?.numeral ?? 'V'} subtitle="Contests" className="duels__eyebrow" />
            <h2 className="gothic duels__title" id="duels-title">
              {meta?.label ?? 'Duels Fought'}
            </h2>
            <p className="hand duels__lede">Every contest is a battle of wits against the clock. The record stays in the note.</p>
          </div>
          <div className="duels__aside">
            <p className="mono duels__tally">
              <span>{String(contests.length).padStart(2, '0')} duels</span>
              <span aria-hidden="true"> · </span>
              <span>{String(teamCount).padStart(2, '0')} as a team</span>
              <span aria-hidden="true"> · </span>
              <span>{String(soloCount).padStart(2, '0')} alone</span>
            </p>
            <p className="duels__best">
              <span className="mono duels__best-label">Best standing</span>
              <span className="duels__best-value">
                {ordinal(best.rank)} of {best.field}
                {best.fieldPlus ? '+' : ''} · {best.name}
              </span>
            </p>
            <div className="duels__filters" role="group" aria-label="Filter contests">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`mono duels__filter${filter === f.id ? ' is-on' : ''}`}
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <ol className="duels__grid" role="list" aria-live="polite">
          {shown.map((c) => (
            <DuelCard key={`${c.name}-${c.year}`} c={c} />
          ))}
        </ol>
      </div>
    </section>
  )
}
