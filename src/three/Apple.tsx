// A procedurally modelled red apple: lathe body with dimples and five soft lobes
// at the base, vertex-painted streaks, a curved stem and a small bent leaf.
// It drifts to a different spot in every section and turns slowly. When it has
// to cross the page it dips below the frame instead of passing behind the text.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BufferAttribute,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  LatheGeometry,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Group,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { scrollState } from '../lib/scroll'
import { useIsMobile, useReducedMotion } from '../lib/env'
import { aspectFit, blendPoses, dampPose, makePose, pose, sectionWeights, transitAmount, type PoseMap } from './choreo'

// World placements (the apple's radius is ~1 × scale).
const DESKTOP: PoseMap = {
  hero: pose(0.78, -1.14, 0.9, 0.15, 0, -0.25, 0.26),
  rules: pose(2.75, -1.42, 0.6, 0.1, 0, 0.2, 0.21),
  rulesLeft: pose(-2.75, -1.42, 0.6, 0.1, 0, -0.2, 0.21),
  // The names cards are full width: the apple sinks into the dark with the book.
  names: pose(-1.6, -1.2, -9, 0.2, 0, 0.3, 0.26),
  force: pose(-1.6, -1.2, -9, 0.2, 0, 0.3, 0.26),
  duels: pose(-1.6, -1.2, -9, 0.2, 0, 0.3, 0.26),
  cases: pose(-1.6, -1.2, -9, 0.2, 0, 0.3, 0.26),
  eyes: pose(-2.3, -1.4, 0.8, 0.1, 0, -0.2, 0.25),
  contact: pose(1.15, -1.22, 1.3, 0.2, 0, 0.18, 0.23),
}

// Phones: after the hero every section is full-width panels, so the apple sinks
// into the dark with the book instead of peeking through the gaps between panels.
const MOBILE: PoseMap = {
  hero: pose(0.46, 0.45, 0.9, 0.15, 0, -0.25, 0.15),
  rules: pose(0.3, 0.2, -9, 0.1, 0, 0.2, 0.18),
  names: pose(0.3, 0.2, -9, 0.2, 0, 0.3, 0.18),
  force: pose(0.3, 0.2, -9, 0.2, 0, 0.3, 0.18),
  duels: pose(0.3, 0.2, -9, 0.2, 0, 0.3, 0.18),
  cases: pose(0.3, 0.2, -9, 0.2, 0, 0.3, 0.18),
  eyes: pose(0.3, 0.2, -9, 0.1, 0, -0.2, 0.18),
  contact: pose(0.3, 0.2, -9, 0.2, 0, 0.18, 0.18),
}

function buildBody(): BufferGeometry {
  const pts: Vector2[] = []
  const N = 56
  for (let i = 0; i <= N; i++) {
    const th = (i / N) * Math.PI // 0 = bottom pole, PI = top pole
    const c = Math.cos(th)
    const s = Math.sin(th)
    // Wider shoulders than base.
    const r = s * (1 + 0.09 * -c) * (1 - 0.04 * Math.sin(th * 2))
    let y = -c * 0.9
    y -= 0.3 * Math.exp(-((Math.PI - th) ** 2) / 0.085) // stem cavity
    y += 0.13 * Math.exp(-(th ** 2) / 0.05) // calyx dimple
    pts.push(new Vector2(Math.max(r, 1e-4), y))
  }
  let geo: BufferGeometry = new LatheGeometry(pts, 64)
  geo.deleteAttribute('uv')
  geo.deleteAttribute('normal')
  geo = mergeVertices(geo, 1e-4)

  // Five soft lobes towards the base + colour streaks.
  const pos = geo.attributes.position as BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const deep = new Color('#5a050c')
  const red = new Color('#a3101c')
  const blush = new Color('#c8331f')
  const top = new Color('#6e4a12')
  const tmp = new Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const phi = Math.atan2(z, x)
    const base = Math.max(0, -y) // 0 at equator, ~0.9 at the bottom
    const lobe = 1 + 0.045 * Math.cos(phi * 5) * base
    pos.setXYZ(i, x * lobe, y, z * lobe)

    const streak = 0.5 + 0.5 * Math.sin(phi * 21 + Math.sin(phi * 5) * 2.2 + y * 3)
    const h = (y + 0.9) / 1.8 // 0 bottom .. 1 top
    tmp.copy(deep).lerp(red, 0.35 + 0.45 * h)
    tmp.lerp(blush, streak * 0.35 * (0.4 + h * 0.6))
    // a little ochre in the stem cavity
    const cavity = Math.exp(-((x * x + z * z) / 0.05)) * (y > 0 ? 1 : 0)
    tmp.lerp(top, cavity * 0.7)
    tmp.toArray(colors, i * 3)
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

function buildStem(): BufferGeometry {
  const curve = new CatmullRomCurve3([
    new Vector3(0, 0.58, 0),
    new Vector3(0.02, 0.78, 0.0),
    new Vector3(0.08, 0.98, 0.03),
    new Vector3(0.16, 1.1, 0.05),
  ])
  return new TubeGeometry(curve, 16, 0.032, 6, false)
}

function buildLeaf(): BufferGeometry {
  const s = new Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.14, 0.1, 0.34, 0.14, 0.62, 0)
  s.bezierCurveTo(0.34, -0.14, 0.14, -0.1, 0, 0)
  const geo = new ShapeGeometry(s, 12)
  // Curl the leaf: bend along its length and cup it across.
  const pos = geo.attributes.position as BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    pos.setZ(i, -0.35 * x * x + 0.9 * y * y)
  }
  geo.computeVertexNormals()
  return geo
}

export default function Apple() {
  const outer = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const isMobile = useIsMobile()
  const reduced = useReducedMotion()
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const geos = useMemo(() => ({ body: buildBody(), stem: buildStem(), leaf: buildLeaf() }), [])
  const state = useRef({ cur: makePose(), target: makePose(), init: false, spin: 0 })
  useEffect(
    () => () => {
      geos.body.dispose()
      geos.stem.dispose()
      geos.leaf.dispose()
    },
    [geos],
  )

  useFrame((frame, dt) => {
    const o = outer.current
    const s = spin.current
    if (!o || !s) return
    const st = state.current
    const t = frame.clock.elapsedTime
    const poses = isMobile ? MOBILE : DESKTOP
    const w = sectionWeights()
    blendPoses(poses, st.target, w)
    if (!isMobile) {
      const fit = aspectFit(aspect)
      st.target.x *= fit.x
      st.target.s *= fit.s
    }
    // Crossing sideways (e.g. eyes → contact runs right through the text column):
    // route below the frame and a little back, shrinking, then rise into place.
    const transit = transitAmount(poses, w)
    st.target.y -= transit * 1.9
    st.target.z -= transit * 1.4
    st.target.s *= 1 - 0.35 * transit
    if (!st.init) {
      Object.assign(st.cur, st.target)
      st.init = true
    }
    dampPose(st.cur, st.target, reduced ? 8 : 1.8, dt)
    const c = st.cur
    const m = reduced ? 0 : 1
    o.position.set(
      c.x + scrollState.pointer.x * 0.06 * m,
      c.y + Math.sin(t * 1.1 + 2) * 0.07 * m,
      c.z,
    )
    o.rotation.set(c.rx + Math.sin(t * 0.6) * 0.06 * m, 0, c.rz + Math.sin(t * 0.8 + 1) * 0.05 * m)
    o.scale.setScalar(c.s)
    // Sunk into the fog (names; phones after the hero): not drawn at all.
    o.visible = c.z > -7.5
    // Slow turn, nudged a little by scrolling.
    st.spin += dt * (0.28 + Math.min(Math.abs(scrollState.velocity) * 0.01, 1.2)) * m
    s.rotation.y = st.spin + 0.6
  })

  return (
    <group ref={outer}>
      <group ref={spin}>
        <mesh geometry={geos.body}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.34}
            clearcoat={1}
            clearcoatRoughness={0.14}
            emissive="#2a0004"
            emissiveIntensity={0.6}
            envMapIntensity={1.2}
          />
        </mesh>
        <mesh geometry={geos.stem}>
          <meshStandardMaterial color="#3a2414" roughness={0.85} />
        </mesh>
        <mesh geometry={geos.leaf} position={[0.07, 0.9, 0.02]} rotation={[0.35, -0.6, 0.45]}>
          <meshStandardMaterial color="#2c4219" roughness={0.55} side={DoubleSide} emissive="#0a1205" />
        </mesh>
      </group>
    </group>
  )
}
