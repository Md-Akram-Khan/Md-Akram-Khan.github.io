// Moves the notebook through the page. Owns *where* the notebook is; the
// Notebook component itself owns its internals (cover opening, page flips).
//
//   anchor  – world position (blended per section, damped) + idle float
//   halo    – soft radial glow behind the book so a black book reads on black
//   body    – rotation, scale, pointer parallax and a little scroll "inertia"
//   pivot   – slides the book right as it opens, so the open spread (which
//             grows to the LEFT of the spine) stays centred on the anchor and
//             rotations pivot around what you actually see
import { Suspense, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, type Group, type ShaderMaterial } from 'three'
import Notebook from './Notebook'
import { scrollState } from '../lib/scroll'
import { useIsMobile, useReducedMotion } from '../lib/env'
import {
  aspectFit,
  blendPoses,
  damp,
  dampPose,
  easeInOutCubic,
  makePose,
  notebookOpenTarget,
  pose,
  sectionWeights,
  SPREAD_SHIFT,
  transitAmount,
  world,
  type PoseMap,
} from './choreo'

// Visual centre of the book (closed, or its open spread) per section, from the
// layout contract. HTML sits left in hero/rules/contact, right in eyes, and
// full width over the dimmed book in names.
const DESKTOP: PoseMap = {
  //            x      y      z     rx     ry     rz    scale
  hero: pose(1.95, 0.0, 0.0, -0.06, 0.3, 0.07, 1.0),
  rules: pose(1.85, -0.05, 0.1, -0.2, -0.12, 0.02, 0.84),
  names: pose(0.0, 0.05, -3.0, -0.34, 0.0, 0.0, 1.0),
  eyes: pose(-1.85, -0.1, 0.1, -0.16, 0.12, -0.02, 0.78),
  contact: pose(1.9, -0.02, 0.15, 0.06, -0.44, -0.06, 0.94),
}

// Phone: centred and smaller. In the hero the book sits in the top ~45% of the
// viewport; elsewhere it stays behind the (panelled) content, pushed back.
const MOBILE: PoseMap = {
  hero: pose(0.0, 1.06, 0.0, 0.08, -0.3, 0.06, 0.56),
  rules: pose(0.0, 0.6, -1.6, -0.24, 0.0, 0.0, 0.6),
  names: pose(0.0, 0.45, -3.4, -0.3, 0.0, 0.0, 0.64),
  eyes: pose(0.0, 0.6, -1.6, -0.2, 0.0, 0.0, 0.6),
  contact: pose(0.0, 0.35, -2.2, 0.06, -0.36, -0.05, 0.62),
}

const HALO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// A soft black veil in front of the book, faded in for the 'names' section so the
// bright pages sit back behind the project cards instead of competing with them.
const VEIL_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float a = 1.0 - smoothstep(0.35, 1.0, length(p));
    gl_FragColor = vec4(0.0, 0.0, 0.0, a * uOpacity);
  }
`

const HALO_FRAG = /* glsl */ `
  uniform vec3 uOuter;
  uniform vec3 uInner;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uWide;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    p.x /= mix(1.0, 1.45, uWide);  // stretch sideways while the book is open
    p.y *= 1.12;
    float d = length(p);
    float outer = pow(1.0 - smoothstep(0.0, 1.0, d), 2.4);
    float inner = exp(-d * d * 7.0);
    // a slow, barely-there breathing so the light feels alive
    float breathe = 0.92 + 0.08 * sin(uTime * 0.6);
    vec3 col = uOuter * outer + uInner * inner * breathe;
    gl_FragColor = vec4(col * uOpacity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export default function NotebookRig() {
  const anchor = useRef<Group>(null)
  const body = useRef<Group>(null)
  const pivot = useRef<Group>(null)
  const halo = useRef<ShaderMaterial>(null)
  const veil = useRef<ShaderMaterial>(null)
  const isMobile = useIsMobile()
  const reduced = useReducedMotion()
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))

  const state = useRef({ cur: makePose(), target: makePose(), px: 0, py: 0, vel: 0, open: 0, init: false })

  const haloUniforms = useMemo(
    () => ({
      uOuter: { value: new Color('#3d070c') },
      uInner: { value: new Color('#6b2a12') },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uWide: { value: 0 },
    }),
    [],
  )
  const veilUniforms = useMemo(() => ({ uOpacity: { value: 0 } }), [])

  useFrame((frame, dt) => {
    const a = anchor.current
    const b = body.current
    const pv = pivot.current
    if (!a || !b || !pv) return
    const st = state.current
    const t = frame.clock.elapsedTime
    const w = sectionWeights()
    const poses = isMobile ? MOBILE : DESKTOP
    blendPoses(poses, st.target, w)
    if (!isMobile) {
      const fit = aspectFit(aspect)
      st.target.x *= fit.x
      st.target.s *= fit.s
    }
    // Crossing from one side of the page to the other: pull back into the dark
    // on the way, so the bright pages never sit full-size behind the text.
    const transit = transitAmount(poses, w)
    st.target.z -= transit * 1.8

    const openTarget = notebookOpenTarget(reduced)
    if (!isMobile) {
      // Portrait-ish desktop windows (e.g. an 820×1000 tablet): the open spread is
      // twice as wide as the closed book, so shrink it while open to keep it in the
      // free column beside the text instead of sliding under the panel.
      const portrait = Math.min(1, Math.max(0, (1.25 - aspect) / 0.45))
      st.target.s *= 1 - 0.2 * portrait * openTarget
    }
    // First frame: jump straight to the pose (no swoop in from the origin).
    if (!st.init) {
      Object.assign(st.cur, st.target)
      st.open = openTarget
      st.init = true
    }
    dampPose(st.cur, st.target, reduced ? 8 : 2.6, dt)
    // Same rate and dt clamp as Notebook.tsx uses for its cover, so they stay in step.
    st.open = reduced ? openTarget : damp(st.open, openTarget, 3.2, Math.min(dt, 1 / 20))
    const c = st.cur

    // Pointer parallax, idle float and scroll inertia (all off under reduced motion).
    const m = reduced ? 0 : 1
    st.px = damp(st.px, scrollState.pointer.x * m, 2.4, dt)
    st.py = damp(st.py, scrollState.pointer.y * m, 2.4, dt)
    const v = Math.max(-40, Math.min(40, scrollState.velocity)) * m
    st.vel = damp(st.vel, v, 4, dt)

    const floatY = Math.sin(t * 0.85) * 0.06 * m
    const floatR = Math.sin(t * 0.55 + 1.2) * 0.025 * m

    a.position.set(c.x + st.px * 0.1, c.y + floatY + st.py * 0.06, c.z)
    b.rotation.set(
      c.rx - st.py * 0.12 + st.vel * 0.004 + Math.sin(t * 0.7) * 0.02 * m,
      c.ry + st.px * 0.22,
      c.rz + floatR,
    )
    b.scale.setScalar(c.s)
    // Slide with the cover (same easing), so the spread stays centred as it opens.
    pv.position.x = SPREAD_SHIFT * easeInOutCubic(st.open)

    // Publish for lights / apple / atmosphere.
    world.notebook.x = a.position.x
    world.notebook.y = a.position.y
    world.notebook.z = a.position.z
    // Dim for the names, while crossing the page, and (phones) whenever the book
    // sits behind panelled content, i.e. everywhere but the hero.
    let dim = Math.max(Math.min(1, w.names * 1.6), transit * 0.85)
    if (isMobile) dim = Math.max(dim, (1 - w.hero) * 0.85)
    world.dim = damp(world.dim, dim, 3, dt)

    if (halo.current) {
      const u = halo.current.uniforms
      u.uTime.value = reduced ? 0 : t
      u.uOpacity.value = 1 - world.dim * 0.6
      u.uWide.value = st.open
    }
    if (veil.current) {
      veil.current.uniforms.uOpacity.value = world.dim * 0.55
      veil.current.visible = world.dim > 0.01
    }
  })

  return (
    <group ref={anchor}>
      {/* Soft glow behind the book (faces camera, never rotates with the book). */}
      <mesh position={[0, 0.05, -1.4]} scale={[7.5, 6.5, 1]} renderOrder={-1}>
        <planeGeometry />
        <shaderMaterial
          ref={halo}
          vertexShader={HALO_VERT}
          fragmentShader={HALO_FRAG}
          uniforms={haloUniforms}
          blending={AdditiveBlending}
          depthWrite={false}
          transparent
          fog={false}
        />
      </mesh>
      {/* Dimming veil between the book and the camera (names, crossings, phones). */}
      <mesh position={[0, 0, 1.1]} scale={[6.5, 5, 1]} renderOrder={2}>
        <planeGeometry />
        <shaderMaterial
          ref={veil}
          vertexShader={HALO_VERT}
          fragmentShader={VEIL_FRAG}
          uniforms={veilUniforms}
          depthWrite={false}
          transparent
          fog={false}
        />
      </mesh>
      <group ref={body}>
        <group ref={pivot}>
          <Suspense fallback={null}>
            <Notebook />
          </Suspense>
        </group>
      </group>
    </group>
  )
}
