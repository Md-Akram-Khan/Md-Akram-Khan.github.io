// Lighting for the void: a warm candle key that flickers, a hard red rim from
// behind, a whisper of cool fill, and a tiny local environment so glossy things
// like the apple have something to reflect.
//
// The environment is a handful of glowing panels rendered once through
// PMREMGenerator. (drei's <Environment> would also work with Lightformers, but it
// ships the HDR/EXR/gain-map loaders and the remote preset table with it.)
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CircleGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  RingGeometry,
  Scene,
  type BufferGeometry,
  type PointLight,
  type SpotLight,
} from 'three'
import { useReducedMotion } from '../lib/env'
import { damp, wobble, world } from './choreo'

const KEY = 46
const RIM = 26
const RIM_LOW = 10

/** Emissive panels for the environment: [shape, colour, intensity, position, scale]. */
const PANELS: [shape: 'rect' | 'circle' | 'ring', color: string, intensity: number, pos: [number, number, number], scale: [number, number]][] = [
  ['rect', '#ffb36b', 2.4, [-4, 3, 4], [4, 2]],
  ['rect', '#ff2236', 3.2, [5, 1, -3], [2, 5]],
  ['circle', '#8090b0', 0.6, [0, 6, 1], [3, 3]],
  ['ring', '#ff8a4a', 1.2, [-2, -3, 3], [2, 2]],
]

/** Bakes PANELS into a prefiltered environment map and sets it on the scene. */
function LocalEnvironment({ intensity }: { intensity: number }) {
  const get = useThree((s) => s.get)
  useEffect(() => {
    // The renderer and scene live as long as the canvas; read them from the store.
    const { gl, scene, invalidate } = get()
    const env = new Scene()
    env.background = new Color('#000000')
    const disposables: { dispose: () => void }[] = []
    for (const [shape, color, k, pos, scale] of PANELS) {
      const geo: BufferGeometry =
        shape === 'rect' ? new PlaneGeometry(1, 1) : shape === 'circle' ? new CircleGeometry(0.5, 32) : new RingGeometry(0.25, 0.5, 32)
      const mat = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), side: DoubleSide, toneMapped: false })
      const m = new Mesh(geo, mat)
      m.position.set(...pos)
      m.scale.set(scale[0], scale[1], 1)
      m.lookAt(0, 0, 0)
      env.add(m)
      disposables.push(geo, mat)
    }
    const pmrem = new PMREMGenerator(gl)
    const target = pmrem.fromScene(env, 0.02)
    pmrem.dispose()
    disposables.forEach((d) => d.dispose())
    const prev = scene.environment
    const prevIntensity = scene.environmentIntensity
    scene.environment = target.texture
    scene.environmentIntensity = intensity
    invalidate()
    return () => {
      scene.environment = prev
      scene.environmentIntensity = prevIntensity
      target.dispose()
    }
  }, [get, intensity])
  return null
}

export default function Stage() {
  const key = useRef<SpotLight>(null)
  const rim = useRef<PointLight>(null)
  const under = useRef<PointLight>(null)
  const reduced = useReducedMotion()
  const s = useRef({ x: 1.9, y: 0, z: 0 })

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const nb = world.notebook
    // Lights trail the notebook a little, which reads as weight.
    const p = s.current
    p.x = damp(p.x, nb.x, 3, dt)
    p.y = damp(p.y, nb.y, 3, dt)
    p.z = damp(p.z, nb.z, 3, dt)

    // Candle flicker: slow sway + quick shiver, never dropping below ~85%.
    const flicker = reduced ? 1 : 1 + wobble(t * 2.3) * 0.07 + Math.sin(t * 19.0) * Math.sin(t * 7.3) * 0.03
    const dim = 1 - world.dim * 0.7

    const k = key.current
    if (k) {
      k.intensity = KEY * flicker * dim
      k.position.set(p.x - 2.2, p.y + 2.8, p.z + 4.2)
      k.target.position.set(p.x - 0.4, p.y - 0.2, p.z)
      k.target.updateMatrixWorld()
    }
    const r = rim.current
    if (r) {
      r.intensity = RIM * (1 - world.dim * 0.35)
      r.position.set(p.x + 1.7, p.y + 1.3, p.z - 1.5)
    }
    const u = under.current
    if (u) {
      u.intensity = RIM_LOW * (0.85 + 0.15 * flicker)
      u.position.set(p.x - 2.0, p.y - 1.8, p.z - 0.8)
    }
  })

  return (
    <>
      <ambientLight intensity={0.16} color="#3b2c2c" />
      <hemisphereLight args={['#2a2430', '#050505', 0.35]} />

      {/* Warm candle key, upper-left front. */}
      <spotLight
        ref={key}
        color="#ffb36b"
        intensity={KEY}
        angle={0.55}
        penumbra={0.95}
        decay={2}
        distance={0}
      />
      {/* Blood-red rim, behind and to the right. */}
      <pointLight ref={rim} color="#ff1a2b" intensity={RIM} distance={9} decay={2} />
      {/* Low red kicker from below-left, so the underside never goes dead. */}
      <pointLight ref={under} color="#c1121f" intensity={RIM_LOW} distance={7} decay={2} />
      {/* Faint cool fill from the right. */}
      <directionalLight position={[5, -1, 4]} intensity={0.22} color="#7d8db5" />

      <LocalEnvironment intensity={0.55} />
    </>
  )
}
