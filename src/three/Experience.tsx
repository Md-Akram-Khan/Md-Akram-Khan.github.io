// The 3D world behind the page: a notebook floating in the dark, an apple,
// ash, embers, feathers and, later, a pair of eyes.
//
// Purely decorative: the canvas never takes pointer events and the whole
// layer is aria-hidden (see App). If WebGL fails at runtime (context creation
// error, crash, lost context) we swap in the static CSS SceneFallback so the
// page never goes blank.
import { Component, Suspense, useCallback, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { useIsMobile } from '../lib/env'
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

function World({ onLost }: { onLost: () => void }) {
  const isMobile = useIsMobile()
  const [tier, setTier] = useState<Tier>(FORCED ?? 2)

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
      frameloop="always"
      camera={{ fov: 35, position: [0, 0, 7], near: 0.1, far: 40 }}
      gl={{
        antialias: true,
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

      <PerformanceMonitor
        flipflops={3}
        onDecline={() => step(-1)}
        onIncline={() => step(1)}
        onFallback={() => FORCED === null && setTier(0)}
      />

      <Suspense fallback={null}>
        <Stage />
      </Suspense>
      <NotebookRig />
      <Apple />
      <Atmosphere />
      <ShinigamiEyes />
      <CameraRig />

      {effects ? (
        <Suspense fallback={null}>
          <Effects quality={tier === 2 ? 'full' : 'lite'} />
        </Suspense>
      ) : null}
    </Canvas>
  )
}
