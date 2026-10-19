import { lazy, Suspense, useEffect } from 'react'
import { startScrollTracking } from './lib/scroll'
import { hasWebGL } from './lib/env'
import { sections, type SectionId } from './data/portfolio'
import Intro from './components/Intro'
import Nav from './components/Nav'
import Footer from './components/Footer'
import MusicPlayer from './components/MusicPlayer'
import SceneFallback from './three/SceneFallback'
import Hero from './sections/Hero'
import Rules from './sections/Rules'
import Force from './sections/Force'
import Projects from './sections/Projects'
import Cases from './sections/Cases'
import Skills from './sections/Skills'
import Duels from './sections/Duels'
import Contact from './sections/Contact'

// The 3D scene is code-split so text content paints first. If its chunk (or the
// three/R3F chunks it pulls in) fails to load (flaky network, a blocker, a stale
// index.html after a redeploy), only the decorative layer falls back to CSS.
const Experience = lazy(() =>
  import('./three/Experience').catch(() => ({ default: SceneFallback })),
)

const sectionIds = new Set<string>(sections.map((s) => s.id))

/** The section named by the URL fragment (e.g. /#eyes), if any. */
function hashSection(): SectionId | null {
  const id = decodeURIComponent(window.location.hash.slice(1))
  return sectionIds.has(id) ? (id as SectionId) : null
}

/** Go to the section in the URL fragment and move focus there. */
function followHash(behavior: ScrollBehavior) {
  const id = hashSection()
  if (!id) return
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior, block: 'start' })
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1')
    el.setAttribute('data-nav-target', '')
  }
  el.focus({ preventScroll: true })
}

export default function App() {
  useEffect(() => startScrollTracking(), [])

  // Deep links: the app renders after the browser has already tried (and failed)
  // to scroll to the fragment, so honour it once the layout has settled (fonts in),
  // and whenever the fragment changes later (back/forward, a pasted #link).
  useEffect(() => {
    let alive = true
    if (hashSection()) {
      const ready = document.fonts?.ready ?? Promise.resolve()
      ready
        .catch(() => undefined)
        .then(() => {
          if (alive) requestAnimationFrame(() => alive && followHash('instant'))
        })
    }
    // Later changes follow the page's scroll-behavior (smooth unless reduced motion).
    const onHash = () => followHash('auto')
    window.addEventListener('hashchange', onHash)
    return () => {
      alive = false
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  const webgl = hasWebGL()

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Intro />
      <Nav />

      {/* Fixed, full-viewport 3D background (z-index: var(--z-canvas)). */}
      <div className="scene-layer" aria-hidden="true">
        {webgl ? (
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        ) : (
          <SceneFallback />
        )}
      </div>

      <main id="main">
        <Hero />
        <Rules />
        <Force />
        <Projects />
        <Cases />
        <Skills />
        <Duels />
        <Contact />
      </main>
      <Footer />
      <MusicPlayer />
      <div className="grain" aria-hidden="true" />
    </>
  )
}
