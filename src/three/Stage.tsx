// Lighting for the void: a warm candle key that flickers, a hard red rim from
// behind, a whisper of cool fill, and a tiny local environment (Lightformers
// only — nothing is fetched) so glossy things like the apple have something to
// reflect.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import type { PointLight, SpotLight } from 'three'
import { useReducedMotion } from '../lib/env'
import { damp, wobble, world } from './choreo'

const KEY = 46
const RIM = 26
const RIM_LOW = 10

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

      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" color="#ffb36b" intensity={2.4} position={[-4, 3, 4]} scale={[4, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" color="#ff2236" intensity={3.2} position={[5, 1, -3]} scale={[2, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="circle" color="#8090b0" intensity={0.6} position={[0, 6, 1]} scale={3} target={[0, 0, 0]} />
        <Lightformer form="ring" color="#ff8a4a" intensity={1.2} position={[-2, -3, 3]} scale={2} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}
