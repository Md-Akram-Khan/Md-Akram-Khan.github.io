// RULE II · "The Task Force" — experience. Every investigation needs a team; these
// are the ones Akram joined. A vertical timeline of case-file cards: role, place
// and dates on the left (the date stamped like a file label), details on the right.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { roles, sections, type Role } from '../data/portfolio'
import { useReducedMotion } from '../lib/env'
import RuleEyebrow from '../components/RuleEyebrow'
import './Force.css'

const meta = sections.find((s) => s.id === 'force')
const pad = (n: number) => String(n).padStart(2, '0')

function RoleCard({ role, i }: { role: Role; i: number }) {
  return (
    <li className={`force__entry${role.current ? ' force__entry--current' : ''}`} data-reveal>
      <span className="force__node" aria-hidden="true" />
      <article className="force__card">
        <div className="force__side">
          <p className="mono force__file">
            File {pad(i + 1)} <span aria-hidden="true">·</span> {role.kind}
          </p>
          <h3 className="gothic force__role">{role.title}</h3>
          <p className="force__org">{role.org}</p>
          {role.place && <p className="mono force__place">{role.place}</p>}
          <p className="mono force__dates">
            {role.current && <span className="force__live" aria-hidden="true" />}
            {role.dates}
          </p>
        </div>
        <div className="force__body">
          <ul className="force__points" role="list">
            {role.points.map((p) => (
              <li key={p.slice(0, 24)}>{p}</li>
            ))}
          </ul>
          {role.links && (
            <ul className="force__links" role="list">
              {role.links.map((l) => (
                <li key={l.href}>
                  <a className="mono force__link" href={l.href} target="_blank" rel="noopener noreferrer">
                    {l.label}
                    <span className="visually-hidden">
                      {' '}
                      for {role.org} (opens in a new tab)
                    </span>
                    <svg className="force__link-arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                      <path d="M3 9 9 3M4.5 3H9v4.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </li>
  )
}

export default function Force() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const instant = reduced || typeof IntersectionObserver === 'undefined'

  useLayoutEffect(() => {
    if (!instant) ref.current?.classList.add('force--armed')
  }, [instant])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
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
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [instant])

  return (
    <section id="force" className="section force" aria-labelledby="force-title" ref={ref}>
      <div className="container">
        <header className="force__intro" data-reveal>
          <RuleEyebrow numeral={meta?.numeral ?? 'II'} subtitle="Experience" className="force__eyebrow" />
          <h2 className="gothic force__title" id="force-title">
            {meta?.label ?? 'The Task Force'}
          </h2>
          <p className="hand force__lede">Every investigation needs a team. These are the ones I joined.</p>
        </header>

        <ol className="force__timeline" role="list">
          {roles.map((role, i) => (
            <RoleCard key={`${role.title}-${role.org}`} role={role} i={i} />
          ))}
        </ol>
      </div>
    </section>
  )
}
