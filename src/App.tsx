import { lazy, Suspense, useEffect } from 'react'
import { startScrollTracking } from './lib/scroll'
import { hasWebGL } from './lib/env'
import Intro from './components/Intro'
import Nav from './components/Nav'
import Footer from './components/Footer'
import SceneFallback from './three/SceneFallback'
import Hero from './sections/Hero'
import Rules from './sections/Rules'
import Projects from './sections/Projects'
import Skills from './sections/Skills'
import Contact from './sections/Contact'

// The 3D scene is code-split so text content paints first.
const Experience = lazy(() => import('./three/Experience'))

export default function App() {
  useEffect(() => startScrollTracking(), [])
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
        <Projects />
        <Skills />
        <Contact />
      </main>
      <Footer />
      <div className="grain" aria-hidden="true" />
    </>
  )
}
