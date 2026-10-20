import { useEffect, useRef, type CSSProperties, type FocusEvent, type PointerEvent } from 'react'
import type { Project } from '../data/portfolio'
import PageOrnaments from './PageOrnaments'
import './ProjectCard.css'

type Props = {
  project: Project
  index: number
  total: number
  /** Solo flagship entries: full-width, two-column "feature" page on desktop. */
  featured: boolean
  /** Right-hand card in the two-column grid (dropped a little lower on desktop). */
  offset: boolean
}

// Hand-placed tilt for each page (degrees). Straightens on hover.
const TILTS = [-0.5, 0.45, 0.6, -0.55, -0.4, 0.5]
// ASCII only, so Share Tech Mono keeps every glyph the same width while scrambling.
const GLYPHS = '0123456789ABCDEFXYZ#%&@$+=<>/\\'
const pad = (n: number) => String(n).padStart(2, '0')

const prefersStill = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(hover: none)').matches

export default function ProjectCard({ project, index, total, featured, offset }: Props) {
  const eyesRef = useRef<HTMLSpanElement>(null)
  const frame = useRef(0)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  // "Shinigami Eyes": the numbers above the name decode out of noise.
  // Writes straight to the DOM node, so no React re-renders while it runs.
  const decode = () => {
    const el = eyesRef.current
    if (!el || prefersStill()) return
    cancelAnimationFrame(frame.current)
    const target = project.reveal
    const start = performance.now()
    const duration = 420 + target.length * 14
    let last = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      if (now - last > 40 || t === 1) {
        last = now
        const settled = Math.floor((1 - (1 - t) ** 2) * target.length)
        let out = ''
        for (let i = 0; i < target.length; i++) {
          const ch = target[i]
          out += i < settled || !/[0-9A-Za-z]/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]
        }
        el.textContent = out
      }
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') decode()
  }
  const onFocus = (e: FocusEvent<HTMLElement>) => {
    // Only when focus arrives from outside the card, not when moving between its links.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) decode()
  }

  const titleId = `project-${project.id}-title`
  const badge = project.team ? 'Team project' : project.year ? `Solo · ${project.year}` : 'Solo'
  const classes = ['project-card', featured && 'project-card--featured', offset && 'project-card--offset']
    .filter(Boolean)
    .join(' ')
  const style = {
    '--tilt': `${TILTS[index % TILTS.length]}deg`,
    '--tear-x': `${(index * 67) % 220}px`,
    '--stagger': offset ? 1 : 0,
  } as CSSProperties

  return (
    <li className={classes} style={style} data-reveal>
      <span className="project-card__tape" aria-hidden="true" />
      <article
        className="project-card__page"
        aria-labelledby={titleId}
        onPointerEnter={onPointerEnter}
        onFocus={onFocus}
      >
        <PageOrnaments />
        <header className="project-card__head">
          {/* DOM order keeps the name first for screen readers; CSS lifts the meta + eyes lines above it. */}
          <h3 className="project-card__title" id={titleId}>
            <span className="project-card__name">{project.title}</span>
          </h3>
          <p className="project-card__subtitle">{project.subtitle}</p>

          <p className="project-card__eyes">
            <svg className="project-card__eye" viewBox="0 0 24 12" aria-hidden="true" focusable="false">
              <path d="M1 6 C 6 -0.5, 18 -0.5, 23 6 C 18 12.5, 6 12.5, 1 6 Z" />
              <ellipse cx="12" cy="6" rx="1.7" ry="3.6" />
            </svg>
            <span className="visually-hidden">Seen with the Shinigami Eyes: {project.reveal}</span>
            <span className="project-card__eyes-text" ref={eyesRef} aria-hidden="true">
              {project.reveal}
            </span>
          </p>

          <div className="project-card__meta">
            <span className="project-card__no" aria-hidden="true">
              Name {pad(index + 1)} <span className="project-card__of">/ {pad(total)}</span>
            </span>
            <span className={`project-card__stamp${project.team ? ' project-card__stamp--team' : ''}`}>
              {badge}
            </span>
          </div>

          <p className="project-card__desc">{project.description}</p>
        </header>

        <div className="project-card__body">
          <p className="project-card__label" id={`${titleId}-details`}>
            Circumstances
          </p>
          <ul className="project-card__list" aria-labelledby={`${titleId}-details`}>
            {project.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>

          <p className="project-card__label" id={`${titleId}-stack`}>
            Written with
          </p>
          <ul className="project-card__stack" aria-labelledby={`${titleId}-stack`}>
            {project.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>

          <div className="project-card__links">
            <a className="project-card__link" href={project.repo} target="_blank" rel="noopener noreferrer">
              <span className="project-card__link-icon" aria-hidden="true">
                {'</>'}
              </span>
              Code<span className="visually-hidden"> for {project.title} on GitHub (opens in a new tab)</span>
              <span className="project-card__arrow" aria-hidden="true">
                ↗
              </span>
            </a>
            {project.live && (
              <a
                className="project-card__link project-card__link--live"
                href={project.live}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="project-card__live-dot" aria-hidden="true" />
                Live<span className="visually-hidden"> site for {project.title} (opens in a new tab)</span>
                <span className="project-card__arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            )}
          </div>
        </div>
      </article>
    </li>
  )
}
