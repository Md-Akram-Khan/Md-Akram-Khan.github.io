// Air in the void: drifting ash, a few rising embers that bloom, and black
// feathers that fall and twirl. Ash and embers animate entirely on the GPU
// (one uniform per frame); the handful of feathers are an InstancedMesh.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  NormalBlending,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  type InstancedMesh,
  type ShaderMaterial,
} from 'three'
import { scrollState } from '../lib/scroll'
import { useIsMobile, useReducedMotion } from '../lib/env'
import { damp, mulberry32 } from './choreo'

/* ────────────────────────────── textures ────────────────────────────── */

function makeSprite(): CanvasTexture {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.75)')
  grd.addColorStop(0.7, 'rgba(255,255,255,0.18)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(c)
  return tex
}

/** A dark corvid feather drawn barb by barb. Tip at the top of the canvas. */
function makeFeather(): CanvasTexture {
  const w = 128
  const h = 512
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  const rand = mulberry32(7)
  const cx = w / 2
  const baseY = h - 6
  const tipY = 10
  const len = baseY - tipY
  // Shaft x at parameter u (0 base .. 1 tip): a gentle bow.
  const shaftX = (u: number) => cx + Math.sin(u * Math.PI) * 7 - u * 4
  const shaftY = (u: number) => baseY - u * len

  // Vane half-widths (asymmetric, like a flight feather).
  const envelope = (u: number) => {
    if (u < 0.1) return 0
    if (u < 0.24) return ((u - 0.1) / 0.14) * 0.75
    const v = (u - 0.24) / 0.76
    return Math.pow(Math.sin(Math.min(1, v * 0.62 + 0.38) * Math.PI), 0.55) * (1 - Math.pow(v, 6) * 0.15)
  }

  g.lineCap = 'round'
  // Barbs, from base to tip, with occasional splits in the vane.
  let splitL = 0
  let splitR = 0
  for (let y = 0; y < len; y += 1.6) {
    const u = y / len
    const e = envelope(u)
    if (e <= 0) continue
    const sx = shaftX(u)
    const sy = shaftY(u)
    for (const side of [-1, 1]) {
      if (side < 0 && splitL > 0) {
        splitL -= 1
        continue
      }
      if (side > 0 && splitR > 0) {
        splitR -= 1
        continue
      }
      if (u > 0.3 && rand() < 0.012) {
        if (side < 0) splitL = 2 + Math.floor(rand() * 3)
        else splitR = 2 + Math.floor(rand() * 3)
      }
      const reach = e * (side > 0 ? 50 : 36) * (0.94 + rand() * 0.1)
      const lift = reach * (0.62 + (1 - u) * 0.25)
      const downy = u < 0.26
      const shade = 70 + Math.floor(rand() * 45)
      g.strokeStyle = downy
        ? `rgba(${shade + 40},${shade + 38},${shade + 46},${0.35 + rand() * 0.25})`
        : `rgba(${shade},${shade},${shade + 10},${0.82 + rand() * 0.18})`
      g.lineWidth = downy ? 0.8 : 1.3
      g.beginPath()
      g.moveTo(sx, sy)
      const ex = sx + side * reach
      const ey = sy - lift
      g.quadraticCurveTo(sx + side * reach * 0.45, sy - lift * 0.2, ex, ey + (downy ? (rand() - 0.5) * 12 : 0))
      g.stroke()
    }
  }

  // Rachis (shaft): pale and tapering, bare quill at the base.
  for (let i = 0; i < 40; i++) {
    const u0 = i / 40
    const u1 = (i + 1) / 40
    g.strokeStyle = `rgba(${190 - u0 * 70},${182 - u0 * 68},${176 - u0 * 64},1)`
    g.lineWidth = 3.4 - u0 * 2.6
    g.beginPath()
    g.moveTo(shaftX(u0), shaftY(u0))
    g.lineTo(shaftX(u1), shaftY(u1))
    g.stroke()
  }

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/* ────────────────────────────── ash ────────────────────────────── */

const ASH_VERT = /* glsl */ `
  attribute vec4 aSeed;   // x speed, y phase, z size, w sway
  uniform float uTime;
  uniform float uScroll;
  uniform float uHeight;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vAlpha;
  varying float vTint;
  void main() {
    vec3 p = position;
    float span = uHeight;
    float y = mod(p.y - uTime * aSeed.x + uScroll * (0.6 + aSeed.x), span);
    float edge = smoothstep(0.0, 0.1, y / span) * smoothstep(1.0, 0.88, y / span);
    p.y = y - span * 0.5;
    p.x += sin(uTime * 0.31 + aSeed.y) * aSeed.w + sin(uTime * 0.83 + aSeed.y * 2.0) * aSeed.w * 0.3;
    p.z += cos(uTime * 0.23 + aSeed.y * 1.7) * aSeed.w * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(0.5, -mv.z);
    gl_PointSize = min(uSize * aSeed.z * uPixelRatio * (7.0 / dist), 22.0 * uPixelRatio);
    float far = 1.0 - smoothstep(7.0, 19.0, dist);
    float near = smoothstep(1.2, 3.0, dist);
    vAlpha = edge * near * mix(0.18, 1.0, far);
    vTint = fract(aSeed.y * 7.13);
  }
`

const ASH_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform vec3 uWarm;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vTint;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a;
    vec3 col = mix(uColor, uWarm, step(0.86, vTint));
    gl_FragColor = vec4(col, a * vAlpha * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/* ────────────────────────────── embers ────────────────────────────── */

const EMBER_VERT = /* glsl */ `
  attribute vec4 aSeed;   // x speed, y phase, z size, w sway
  uniform float uTime;
  uniform float uHeight;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vGlow;
  void main() {
    vec3 p = position;
    float span = uHeight;
    float y = mod(p.y + uTime * aSeed.x, span);
    float life = y / span;
    p.y = y - span * 0.5;
    p.x += sin(uTime * 0.9 + aSeed.y) * aSeed.w + sin(uTime * 2.3 + aSeed.y * 3.0) * 0.05;
    p.z += cos(uTime * 0.7 + aSeed.y) * aSeed.w * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(0.5, -mv.z);
    float flick = 0.6 + 0.4 * sin(uTime * (5.0 + aSeed.y) + aSeed.y * 10.0);
    // born dim, flare, then cool and die as they rise
    float fade = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.55, 1.0, life));
    vGlow = flick * fade * (1.0 - smoothstep(9.0, 20.0, dist));
    gl_PointSize = uSize * aSeed.z * uPixelRatio * (7.0 / dist) * (0.6 + 0.4 * fade);
  }
`

const EMBER_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vGlow;
  void main() {
    float a = texture2D(uMap, gl_PointCoord).a;
    float core = smoothstep(0.55, 1.0, a);
    vec3 col = uColor * (a * 0.8 + core * 1.6) * vGlow * uIntensity;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

type Field = {
  geometry: BufferGeometry
}

function makeField(
  count: number,
  seed: number,
  spread: { x: number; y: number; zMin: number; zMax: number },
  speed: [number, number],
  size: [number, number],
  sway: [number, number],
): Field {
  const r = mulberry32(seed)
  const pos = new Float32Array(count * 3)
  const s = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() * 2 - 1) * spread.x
    pos[i * 3 + 1] = r() * spread.y
    pos[i * 3 + 2] = spread.zMin + r() * (spread.zMax - spread.zMin)
    s[i * 4] = speed[0] + r() * (speed[1] - speed[0])
    s[i * 4 + 1] = r() * Math.PI * 2
    s[i * 4 + 2] = size[0] + Math.pow(r(), 2.6) * (size[1] - size[0])
    s[i * 4 + 3] = sway[0] + r() * (sway[1] - sway[0])
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(pos, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(s, 4))
  return { geometry }
}

/* ────────────────────────────── feathers ────────────────────────────── */

type Feather = {
  x: number
  y: number
  z: number
  speed: number
  phase: number
  sway: number
  freq: number
  spin: number
  tilt: number
  size: number
}

function featherGeometry() {
  // Long plane, bent along its length so light rolls across it.
  const geo = new PlaneGeometry(0.26, 1, 1, 8)
  const pos = geo.attributes.position as BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const x = pos.getX(i)
    pos.setZ(i, -0.12 * (y + 0.5) * (y + 0.5) + 0.25 * x * x)
  }
  geo.computeVertexNormals()
  return geo
}

const HEIGHT = 11
/** Scratch object for composing instance matrices (used synchronously only). */
const dummy = new Object3D()

export default function Atmosphere() {
  const isMobile = useIsMobile()
  const reduced = useReducedMotion()
  const viewport = useThree((s) => s.viewport)
  const dpr = useThree((s) => s.viewport.dpr)
  const ash = useRef<ShaderMaterial>(null)
  const embers = useRef<ShaderMaterial>(null)
  const feathers = useRef<InstancedMesh>(null)

  // Width of the view at z = 0, used to spread things across the frame
  // (quantised so a window resize doesn't rebuild the particles every pixel).
  const halfW = Math.max(1.2, Math.round(viewport.width) / 2)
  const counts = isMobile ? { ash: 240, embers: 18, feathers: 7 } : { ash: 620, embers: 46, feathers: 16 }

  const sprite = useMemo(() => makeSprite(), [])
  const featherTex = useMemo(() => makeFeather(), [])
  const featherGeo = useMemo(() => featherGeometry(), [])

  const ashField = useMemo(
    () =>
      makeField(counts.ash, 11, { x: halfW * 1.6 + 1, y: HEIGHT, zMin: -9, zMax: 4 }, [0.08, 0.22], [1.2, 5.5], [0.1, 0.5]),
    [counts.ash, halfW],
  )
  // Embers stay behind the book's plane: blooming in front of it, they blotted out
  // the cover title. Only the fine ash drifts in front, for depth.
  const emberField = useMemo(
    () =>
      makeField(counts.embers, 23, { x: halfW * 1.3 + 0.5, y: HEIGHT, zMin: -7, zMax: -0.9 }, [0.18, 0.5], [2.2, 6], [0.15, 0.6]),
    [counts.embers, halfW],
  )

  const featherData = useMemo<Feather[]>(() => {
    const r = mulberry32(99)
    return Array.from({ length: counts.feathers }, () => ({
      x: (r() * 2 - 1) * (halfW * 1.25 + 0.6),
      y: r() * HEIGHT,
      // Behind the page plane, so a feather never sweeps across a heading up close.
      z: -7.5 + r() * 6.6,
      speed: 0.16 + r() * 0.16,
      phase: r() * Math.PI * 2,
      sway: 0.25 + r() * 0.45,
      freq: 0.45 + r() * 0.4,
      spin: (r() < 0.5 ? -1 : 1) * (0.15 + r() * 0.35),
      tilt: (r() - 0.5) * 0.8,
      size: 0.42 + r() * 0.36,
    }))
  }, [counts.feathers, halfW])

  const uniforms = useMemo(
    () => ({
      ash: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uHeight: { value: HEIGHT },
        uSize: { value: 4.2 },
        uPixelRatio: { value: 1 },
        uMap: { value: sprite },
        uColor: { value: new Color('#8a847b') },
        uWarm: { value: new Color('#c9824a') },
        uOpacity: { value: 0.55 },
      },
      embers: {
        uTime: { value: 0 },
        uHeight: { value: HEIGHT },
        uSize: { value: 5 },
        uPixelRatio: { value: 1 },
        uMap: { value: sprite },
        uColor: { value: new Color('#ff4a1c') },
        uIntensity: { value: 2.6 },
      },
    }),
    [sprite],
  )

  const state = useRef({ time: 0, scroll: 0 })

  // These were created imperatively, so they are released imperatively.
  useEffect(() => () => ashField.geometry.dispose(), [ashField])
  useEffect(() => () => emberField.geometry.dispose(), [emberField])
  useEffect(
    () => () => {
      sprite.dispose()
      featherTex.dispose()
      featherGeo.dispose()
    },
    [sprite, featherTex, featherGeo],
  )

  useFrame((_, dt) => {
    const st = state.current
    // Under reduced motion the air holds still (and the canvas renders on demand).
    const speed = reduced ? 0 : 1
    st.time += Math.min(dt, 0.1) * speed
    const t = st.time
    st.scroll = damp(st.scroll, reduced ? 0 : scrollState.progress * 7, 3, dt)

    const a = ash.current
    if (a) {
      a.uniforms.uTime.value = t
      a.uniforms.uScroll.value = st.scroll
      a.uniforms.uPixelRatio.value = dpr
    }
    const e = embers.current
    if (e) {
      e.uniforms.uTime.value = t
      e.uniforms.uPixelRatio.value = dpr
    }

    const m = feathers.current
    if (!m) return
    const d = dummy
    for (let i = 0; i < featherData.length; i++) {
      const f = featherData[i]
      const y = (((f.y - t * f.speed + st.scroll * 0.5) % HEIGHT) + HEIGHT) % HEIGHT
      const swing = Math.sin(t * f.freq + f.phase)
      d.position.set(f.x + swing * f.sway, y - HEIGHT / 2, f.z + Math.cos(t * f.freq * 0.7 + f.phase) * 0.25)
      // Falling-leaf motion: pendulum swing + slow spin around the fall axis.
      d.rotation.set(f.tilt + swing * 0.35, f.phase + t * f.spin, swing * 0.75 + 0.2)
      d.scale.setScalar(f.size)
      d.updateMatrix()
      m.setMatrixAt(i, d.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <points geometry={ashField.geometry} frustumCulled={false}>
        <shaderMaterial
          ref={ash}
          vertexShader={ASH_VERT}
          fragmentShader={ASH_FRAG}
          uniforms={uniforms.ash}
          transparent
          depthWrite={false}
          blending={NormalBlending}
        />
      </points>
      <points geometry={emberField.geometry} frustumCulled={false}>
        <shaderMaterial
          ref={embers}
          vertexShader={EMBER_VERT}
          fragmentShader={EMBER_FRAG}
          uniforms={uniforms.embers}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      <instancedMesh
        key={featherData.length}
        ref={feathers}
        args={[featherGeo, undefined, featherData.length]}
        frustumCulled={false}
      >
        <meshPhysicalMaterial
          map={featherTex}
          color="#77778a"
          roughness={0.42}
          metalness={0}
          sheen={1}
          sheenColor="#4a5c9a"
          sheenRoughness={0.3}
          envMapIntensity={1.6}
          side={DoubleSide}
          transparent
          alphaTest={0.04}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  )
}
