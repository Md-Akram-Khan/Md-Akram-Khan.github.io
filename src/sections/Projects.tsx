import { useEffect, useRef } from 'react'
import { profile, projects, sections } from '../data/portfolio'
import ProjectCard from './ProjectCard'
import './Projects.css'

const meta = sections.find((s) => s.id === 'names')
/** The first entries are the solo flagship projects; they get the wide "feature" page. */
const FEATURED = 2
const pad = (n: number) => String(n).padStart(2, '0')
const solo = projects.filter((p) => !p.team).length
const team = projects.length - solo

export default function Projects() {
  const ref = useRef<HTMLElement>(null)

  // Reveal on scroll. Elements are only hidden when motion is allowed (see CSS),
  // and each one is revealed once, then unobserved.
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!('IntersectionObserver' in window)) {
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
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section id="names" className="section projects" aria-labelledby="names-title" ref={ref}>
      <div className="container">
        <header className="projects__intro" data-reveal>
          <div className="projects__heading">
            <p className="eyebrow projects__eyebrow">Rule {meta?.numeral ?? 'II'}</p>
            <h2 className="gothic projects__title" id="names-title">
              {meta?.label ?? 'Names Written'}
            </h2>
          </div>
          <div className="projects__aside">
            <p className="hand projects__lede">Every name written here was carried through to the end.</p>
            <p className="mono projects__tally">
              <span>{pad(projects.length)} names</span>
              <span aria-hidden="true"> · </span>
              <span>{pad(solo)} by my own hand</span>
              <span aria-hidden="true"> · </span>
              <span>{pad(team)} by many hands</span>
            </p>
          </div>
        </header>

        <ol className="projects__grid">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={i}
              total={projects.length}
              featured={i < FEATURED}
              offset={i >= FEATURED && (i - FEATURED) % 2 === 1}
            />
          ))}
        </ol>

        <div className="projects__more" data-reveal>
          <p className="hand projects__more-note">The note has more pages.</p>
          <a
            className="projects__more-link"
            href={`${profile.links.github}?tab=repositories`}
            target="_blank"
            rel="noopener noreferrer"
          >
            All repositories<span className="visually-hidden"> on GitHub (opens in a new tab)</span>
            <span className="projects__more-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
