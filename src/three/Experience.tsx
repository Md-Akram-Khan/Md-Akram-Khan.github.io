// The 3D world behind the page: a notebook floating in the dark, an apple,
// ash, embers, feathers and, later, a pair of eyes.
//
// Purely decorative: the canvas never takes pointer events and the whole
// layer is aria-hidden (see App). If WebGL fails at runtime (context creation
// error, crash, lost context) we swap in the static CSS SceneFallback so the
// page never goes blank.
import { Component, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { useIsMobile, useReducedMotion } from '../lib/env'
import SceneFallback from './SceneFallback'
import Stage from './Stage'
import NotebookRig from './NotebookRig'
import Apple from './Apple'
import Atmosphere from './Atmosphere'
import ShinigamiEyes from './ShinigamiEyes'
import CameraRig from './CameraRig'
import Effects from './Effects'

/** 2 = full (max DPR + all effects), 1 = lighter effects, 0 = DPR 1, no post. */
type Tier = 0 | 1 | 2

// Dev/QA override: VITE_QUALITY=high pins tier 2 (e.g. for headless screenshots,
// where a software renderer would otherwise make the monitor downgrade).
const FORCED: Tier | null =
  import.meta.env.VITE_QUALITY === 'high' ? 2 : import.meta.env.VITE_QUALITY === 'low' ? 0 : null

const BG = '#050505'

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function Experience() {
  const [failed, setFailed] = useState(false)
  const fail = useCallback(() => setFailed(true), [])
  if (failed) return <SceneFallback />
  return (
    <SceneBoundary onError={fail}>
      <World onLost={fail} />
    </SceneBoundary>
  )
}

/**
 * Reduced motion: the canvas renders on demand. Nothing moves on its own, so a
 * frame is only needed while something changed: for a moment after load (fonts,
 * textures), and while the page is scrolled, resized or interacted with (the eye
 * deal), long enough for the scene to settle into its new pose.
 */
function DemandDriver() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let until = 0
    let raf = 0
    const loop = () => {
      invalidate()
      raf = performance.now() < until ? requestAnimationFrame(loop) : 0
    }
    const wake = (ms: number) => {
      until = Math.max(until, performance.now() + ms)
      if (!raf) raf = requestAnimationFrame(loop)
    }
    const onEvent = () => wake(1200)
    wake(3000)
    const opts = { passive: true } as const
    window.addEventListener('scroll', onEvent, opts)
    window.addEventListener('resize', onEvent)
    window.addEventListener('click', onEvent, opts)
    window.addEventListener('keyup', onEvent, opts)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onEvent)
      window.removeEventListener('resize', onEvent)
      window.removeEventListener('click', onEvent)
      window.removeEventListener('keyup', onEvent)
    }
  }, [invalidate])
  return null
}

function World({ onLost }: { onLost: () => void }) {
  const isMobile = useIsMobile()
  const reduced = useReducedMotion()
  const [tier, setTier] = useState<Tier>(FORCED ?? 2)
  // gl attributes are fixed when the canvas is created. On desktop the composer
  // renders into its own (multisampled) targets, so a multisampled default
  // framebuffer would only cost memory; phones render without post, so they keep it.
  const [antialias] = useState(isMobile)

  const device = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const cap = isMobile ? 1.25 : 1.75
  const dpr = Math.min(device, tier === 2 ? cap : tier === 1 ? Math.min(cap, 1.25) : 1)
  const effects = !isMobile && tier > 0

  const step = (d: -1 | 1) => {
    if (FORCED !== null) return
    setTier((t) => Math.max(0, Math.min(2, t + d)) as Tier)
  }

  return (
    <Canvas
      dpr={dpr}
      frameloop={reduced ? 'demand' : 'always'}
      camera={{ fov: 35, position: [0, 0, 7], near: 0.1, far: 40 }}
      gl={{
        antialias,
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
        outputColorSpace: SRGBColorSpace,
      }}
      style={{ pointerEvents: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor(BG, 1)
        gl.domElement.setAttribute('aria-hidden', 'true')
        gl.domElement.setAttribute('tabindex', '-1')
        gl.domElement.addEventListener('webglcontextlost', onLost, { once: true })
      }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 6.5, 19]} />

      {/* On-demand frames (reduced motion) would read as a low frame rate. */}
      {reduced ? null : (
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => step(-1)}
          onIncline={() => step(1)}
          onFallback={() => FORCED === null && setTier(0)}
        />
      )}

      <Suspense fallback={null}>
        <Stage />
      </Suspense>
      <NotebookRig />
      <Apple />
      <Atmosphere />
      <ShinigamiEyes />
      <CameraRig />
      {reduced ? <DemandDriver /> : null}

      {effects ? (
        <Suspense fallback={null}>
          <Effects quality={tier === 2 ? 'full' : 'lite'} still={reduced} />
        </Suspense>
      ) : null}
    </Canvas>
  )
}
