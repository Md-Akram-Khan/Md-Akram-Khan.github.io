// The black notebook: procedurally modelled, opened and leafed through by scroll.
//
// Local frame (closed): ≈1.5 wide × 2.1 tall × 0.14 thick, centred on the origin,
// cover facing +Z, spine on the left edge (x = -0.75). The parent places it in
// the world; this component only animates its own parts, reading scrollState
// inside useFrame (no React state per frame).
//
// When open, the front cover lies to the LEFT of the spine (x ≈ -2.2 … -0.75),
// so the open spread spans roughly x ∈ [-2.2, 0.75].
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { projects } from '../data/portfolio'
import { scrollState } from '../lib/scroll'
import { useReducedMotion } from '../lib/env'
import {
  drawBugsInk,
  drawCoverTitle,
  drawInnerCover,
  drawLastPageInk,
  drawNamesInk,
  loadNoteFonts,
  makeCanvasTexture,
  makeLeatherTextures,
  makePageEdgeTexture,
  makePaperTexture,
  NAME_RULES,
  type InkLine,
} from './notebookTextures'

/* ───────────────────────── Dimensions ───────────────────────── */

const W = 1.5
const H = 2.1
const T = 0.14
const COVER_T = 0.018
const BEVEL = 0.0045
const CORNER = 0.055
const HINGE_X = -W / 2
/** The cover turns about its inner (page-side) edge, so open it lies flush under the turned pages. */
const HINGE_Z = T / 2 - COVER_T
const OPEN_ANGLE = THREE.MathUtils.degToRad(-165)

const SHEETS = 4
const SHEET_GAP = 0.0009
const SHEET_Z0 = HINGE_Z - 0.0009
const PAGE_X0 = -W / 2 + 0.006
const PAGE_X1 = W / 2 - 0.034
const PAGE_W = PAGE_X1 - PAGE_X0
const PAGE_H = H - 0.07
const PAGE_TOP = SHEET_Z0 - SHEETS * SHEET_GAP - 0.0006
const PAGE_BOTTOM = -T / 2 + COVER_T
const SEG = 20
/** How far above the cover each flipped sheet rests, so the left stack fans slightly. */
const REST_LIFT = Array.from({ length: SHEETS }, (_, i) => 0.014 + i * 0.009)
/** Flip duration in "sheet slots"; > 1 so consecutive pages overlap. */
const FLIP_LEN = 1.7

const RIB_N = 18
const RIB_W = 0.044
const RIB_L = 0.5
const RIB_X = -0.3
const RIB_Y = -PAGE_H / 2 + 0.03
const RIB_Z = PAGE_TOP - 0.006

/* ───────────────────────── Small maths ───────────────────────── */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const damp = (current: number, target: number, lambda: number, dt: number) =>
  THREE.MathUtils.damp(current, target, lambda, dt)

/* ───────────────────────── Geometry builders ───────────────────────── */

/** A cover board: rounded rectangle (x 0…w), bevelled, with planar 0…1 UVs. */
function boardGeometry(w: number, h: number, t: number) {
  const b = BEVEL
  const x0 = b
  const x1 = w - b
  const y0 = -h / 2 + b
  const y1 = h / 2 - b
  const rs = 0.012 // spine-side corners stay tight
  const re = CORNER - b
  const s = new THREE.Shape()
  s.moveTo(x0 + rs, y0)
  s.lineTo(x1 - re, y0)
  s.absarc(x1 - re, y0 + re, re, -Math.PI / 2, 0, false)
  s.lineTo(x1, y1 - re)
  s.absarc(x1 - re, y1 - re, re, 0, Math.PI / 2, false)
  s.lineTo(x0 + rs, y1)
  s.absarc(x0 + rs, y1 - rs, rs, Math.PI / 2, Math.PI, false)
  s.lineTo(x0, y0 + rs)
  s.absarc(x0 + rs, y0 + rs, rs, Math.PI, Math.PI * 1.5, false)
  const depth = t - 2 * b
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
    curveSegments: 10,
  })
  g.translate(0, 0, -depth / 2)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w, (pos.getY(i) + h / 2) / h)
  uv.needsUpdate = true
  return g
}

/** Half-elliptic spine wrapping the left edge of the block. */
function spineGeometry() {
  const g = new THREE.CylinderGeometry(T / 2, T / 2, H - 0.004, 20, 1, false, Math.PI, Math.PI)
  g.scale(0.34, 1, 1)
  return g
}

/** A page sheet: a strip of SEG columns, re-bent on the CPU when it moves. */
function sheetGeometry() {
  const g = new THREE.PlaneGeometry(PAGE_W, PAGE_H, SEG, 1)
  bendSheet(g, 0, 0, -10, 0)
  return g
}

/**
 * Lays the sheet out as a curve from the spine: each column's angle is
 * `angle + bend·t²` (t = 0 at the spine, 1 at the fore-edge), clamped so the
 * paper never passes through the cover below (minAngle) or the block (maxAngle).
 */
function bendSheet(g: THREE.BufferGeometry, angle: number, bend: number, minAngle: number, maxAngle: number) {
  const pos = g.attributes.position as THREE.BufferAttribute
  const nor = g.attributes.normal as THREE.BufferAttribute
  const step = PAGE_W / SEG
  let x = 0
  let z = 0
  for (let j = 0; j <= SEG; j++) {
    const t = j / SEG
    if (j > 0) {
      const tm = (j - 0.5) / SEG
      const pm = THREE.MathUtils.clamp(angle + bend * tm * tm, minAngle, maxAngle)
      x += step * Math.cos(pm)
      z -= step * Math.sin(pm)
    }
    const phi = THREE.MathUtils.clamp(angle + bend * t * t, minAngle, maxAngle)
    const nx = Math.sin(phi)
    const nz = Math.cos(phi)
    pos.setXYZ(j, x, PAGE_H / 2, z)
    pos.setXYZ(SEG + 1 + j, x, -PAGE_H / 2, z)
    nor.setXYZ(j, nx, 0, nz)
    nor.setXYZ(SEG + 1 + j, nx, 0, nz)
  }
  pos.needsUpdate = true
  nor.needsUpdate = true
}

/** Satin bookmark ribbon with a swallow-tail end; three vertices across. */
function ribbonGeometry() {
  const g = new THREE.BufferGeometry()
  const count = (RIB_N + 1) * 3
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  const uv = new Float32Array(count * 2)
  const index: number[] = []
  for (let r = 0; r <= RIB_N; r++) {
    for (let c = 0; c < 3; c++) {
      uv[(r * 3 + c) * 2] = c / 2
      uv[(r * 3 + c) * 2 + 1] = 1 - r / RIB_N
    }
    if (r < RIB_N) {
      for (let c = 0; c < 2; c++) {
        const a = r * 3 + c
        index.push(a, a + 3, a + 1, a + 1, a + 3, a + 4)
      }
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(index)
  bendRibbon(g, 0, 0)
  return g
}

function bendRibbon(g: THREE.BufferGeometry, time: number, sway: number) {
  const pos = g.attributes.position as THREE.BufferAttribute
  for (let r = 0; r <= RIB_N; r++) {
    const s = r / RIB_N
    const cx = RIB_X + 0.018 * s + Math.sin(s * 2.4 + time * 0.75) * 0.014 * s * sway
    const cy = RIB_Y - s * RIB_L
    const cz = RIB_Z + 0.075 * s * s + Math.sin(time * 0.55 + s * 3.1) * 0.012 * s * sway
    const twist = (0.35 + Math.sin(time * 0.4) * 0.15 * sway) * s * s
    for (let c = 0; c < 3; c++) {
      const off = ((c - 1) * RIB_W) / 2
      let y = cy
      if (r === RIB_N && c === 1) y += RIB_W * 0.7 // swallow-tail notch
      pos.setXYZ(r * 3 + c, cx + off * Math.cos(twist), y, cz - off * Math.sin(twist))
    }
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
}

/* ───────────────────────── Materials ───────────────────────── */

const MAX_LINES = NAME_RULES.length

// Injected into MeshStandardMaterial: paper map + a separate ink layer, optional
// mirroring (for the backs of sheets) and a per-line left-to-right reveal.
const PAGE_PARS = /* glsl */ `
uniform sampler2D uInk;
#ifdef NOTE_REVEAL
uniform float uRevealX[${MAX_LINES}];
uniform float uLineV[${MAX_LINES}];
uniform float uFresh[${MAX_LINES}];
#endif
`
const PAGE_MAP = /* glsl */ `
#ifdef NOTE_MIRROR
  vec2 noteUv = vec2(1.0 - vMapUv.x, vMapUv.y);
#else
  vec2 noteUv = vMapUv;
#endif
  vec4 sampledDiffuseColor = texture2D(map, noteUv);
  diffuseColor *= sampledDiffuseColor;
  vec4 inkTexel = texture2D(uInk, noteUv);
  float inkAlpha = inkTexel.a;
  vec3 inkColor = inkTexel.rgb;
#ifdef NOTE_REVEAL
  float shown = 0.0;
  float fresh = 0.0;
  for (int i = 0; i < ${MAX_LINES}; i++) {
    float inBand = 1.0 - step(0.046, abs(noteUv.y - uLineV[i]));
    float edge = uRevealX[i];
    shown += inBand * (1.0 - smoothstep(edge - 0.02, edge, noteUv.x));
    fresh += inBand * uFresh[i] * (1.0 - smoothstep(0.0, 0.14, edge - noteUv.x));
  }
  inkAlpha *= clamp(shown, 0.0, 1.0);
  // Fresh ink is red and dries to black.
  inkColor = mix(inkColor, vec3(0.6, 0.015, 0.03), clamp(fresh, 0.0, 1.0));
#endif
  diffuseColor.rgb = mix(diffuseColor.rgb, inkColor, inkAlpha);
`

type PageUniforms = {
  uInk: { value: THREE.Texture }
  uRevealX: { value: Float32Array }
  uLineV: { value: Float32Array }
  uFresh: { value: Float32Array }
}

function pageMaterial(paper: THREE.Texture, ink: THREE.Texture, opts: { mirror?: boolean; reveal?: boolean; side?: THREE.Side } = {}) {
  const uniforms: PageUniforms = {
    uInk: { value: ink },
    uRevealX: { value: new Float32Array(MAX_LINES).fill(-1) },
    uLineV: { value: new Float32Array(MAX_LINES).fill(-1) },
    uFresh: { value: new Float32Array(MAX_LINES) },
  }
  const material = new THREE.MeshStandardMaterial({
    map: paper,
    roughness: 0.92,
    metalness: 0,
    side: opts.side ?? THREE.FrontSide,
    emissive: new THREE.Color('#f2ead6'),
    emissiveIntensity: 0.025,
  })
  const defines: Record<string, string> = {}
  if (opts.mirror) defines.NOTE_MIRROR = ''
  if (opts.reveal) defines.NOTE_REVEAL = ''
  material.defines = defines
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PAGE_PARS}`)
      .replace('#include <map_fragment>', PAGE_MAP)
  }
  return { material, uniforms }
}

/* ───────────────────────── Assets (created once) ───────────────────────── */

function createAssets() {
  const mobile = window.matchMedia('(max-width: 760px)').matches
  const q = mobile ? 0.7 : 1
  const px = (n: number) => Math.round(n * q)

  const leatherTex = makeLeatherTextures(W / H, CORNER / W)
  const coverNormal = leatherTex.normalMap
  coverNormal.repeat.set(5, 7)
  const spineNormal = coverNormal.clone()
  spineNormal.repeat.set(0.7, 7)

  const leather = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    map: leatherTex.map,
    roughness: 1,
    roughnessMap: leatherTex.roughnessMap,
    normalMap: coverNormal,
    normalScale: new THREE.Vector2(0.4, 0.4),
    sheen: 0.55,
    sheenColor: new THREE.Color('#3b3434'),
    sheenRoughness: 0.5,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
  })
  const spine = new THREE.MeshPhysicalMaterial({
    color: '#141112',
    roughness: 0.58,
    normalMap: spineNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    sheen: 0.55,
    sheenColor: new THREE.Color('#3b3434'),
    sheenRoughness: 0.5,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
  })

  const title = makeCanvasTexture(px(1024), px(1024 * (H / W)))
  drawCoverTitle(title.canvas, false)
  const titleMat = new THREE.MeshStandardMaterial({
    color: '#d9d5cc',
    map: title.texture,
    metalness: 0.35,
    roughness: 0.32,
    emissive: new THREE.Color('#d6d0c4'),
    emissiveMap: title.texture,
    emissiveIntensity: 0.62,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  })

  const inner = makeCanvasTexture(px(768), px(768 * (H / W)))
  drawInnerCover(inner.canvas, false)
  const innerMat = new THREE.MeshStandardMaterial({
    map: inner.texture,
    roughness: 0.88,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: inner.texture,
    emissiveIntensity: 0.1,
  })

  const paper = makePaperTexture()
  const edgeV = makePageEdgeTexture(false)
  const edgeH = makePageEdgeTexture(true)
  const edgeMatV = new THREE.MeshStandardMaterial({ map: edgeV, roughness: 0.95 })
  const edgeMatH = new THREE.MeshStandardMaterial({ map: edgeH, roughness: 0.95 })

  const pageAspect = PAGE_H / PAGE_W
  const namesInk = makeCanvasTexture(px(768), px(768 * pageAspect))
  const names = projects.map((p) => p.title)
  const lines: InkLine[] = drawNamesInk(namesInk.canvas, names, false)
  const bugInks = [101, 202, 303].map((seed) => {
    const ink = makeCanvasTexture(px(512), px(512 * pageAspect))
    drawBugsInk(ink.canvas, seed, false)
    return { ...ink, seed }
  })
  const lastInk = makeCanvasTexture(px(512), px(512 * pageAspect))
  drawLastPageInk(lastInk.canvas, false)

  // Which bug list sits on each side of each sheet. Chosen so that neither a
  // resting spread (back i | front i+1) nor a mid-turn view (back i-1 | front i+1)
  // ever shows the same list on both sides, and each landing changes the left page.
  const FRONTS = [-1, 0, 1, 2]
  const BACKS = [2, 0, 1, 0]
  const namesPage = pageMaterial(paper, namesInk.texture, { reveal: true })
  const sheets = Array.from({ length: SHEETS }, (_, i) => ({
    geometry: sheetGeometry(),
    front: i === 0 ? namesPage.material : pageMaterial(paper, bugInks[FRONTS[i]].texture).material,
    back: pageMaterial(paper, bugInks[BACKS[i]].texture, { mirror: true, side: THREE.BackSide }).material,
  }))
  const lastPage = pageMaterial(paper, lastInk.texture).material

  const ribbonMat = new THREE.MeshPhysicalMaterial({
    color: '#6d0810',
    roughness: 0.42,
    sheen: 1,
    sheenColor: new THREE.Color('#ff4a52'),
    sheenRoughness: 0.35,
    side: THREE.DoubleSide,
  })

  const assets = {
    boardGeo: boardGeometry(W, H, COVER_T),
    spineGeo: spineGeometry(),
    titleGeo: new THREE.PlaneGeometry(W, H),
    innerGeo: new THREE.PlaneGeometry(W - 0.034, H - 0.03),
    blockGeo: new THREE.BoxGeometry(PAGE_W, PAGE_H, PAGE_TOP - PAGE_BOTTOM),
    ribbonGeo: ribbonGeometry(),
    leather,
    spine,
    titleMat,
    innerMat,
    // BoxGeometry face order: +x (fore-edge), -x, +y, -y, +z (last page), -z.
    blockMats: [edgeMatV, edgeMatV, edgeMatH, edgeMatH, lastPage, edgeMatH],
    sheets,
    ribbonMat,
    namesUniforms: namesPage.uniforms,
    lines,
    /** Redraw every canvas once the fonts have loaded. */
    redraw(fontsReady: boolean) {
      drawCoverTitle(title.canvas, fontsReady)
      title.texture.needsUpdate = true
      drawInnerCover(inner.canvas, fontsReady)
      inner.texture.needsUpdate = true
      assets.lines = drawNamesInk(namesInk.canvas, names, fontsReady)
      namesInk.texture.needsUpdate = true
      for (const ink of bugInks) {
        drawBugsInk(ink.canvas, ink.seed, fontsReady)
        ink.texture.needsUpdate = true
      }
      drawLastPageInk(lastInk.canvas, fontsReady)
      lastInk.texture.needsUpdate = true
    },
    dispose() {
      const textures = [
        leatherTex.map,
        leatherTex.roughnessMap,
        coverNormal,
        spineNormal,
        title.texture,
        inner.texture,
        paper,
        edgeV,
        edgeH,
        namesInk.texture,
        lastInk.texture,
        ...bugInks.map((b) => b.texture),
      ]
      const materials = new Set<THREE.Material>([leather, spine, titleMat, innerMat, edgeMatV, edgeMatH, lastPage, ribbonMat])
      for (const s of sheets) {
        materials.add(s.front)
        materials.add(s.back)
        s.geometry.dispose()
      }
      textures.forEach((t) => t.dispose())
      materials.forEach((m) => m.dispose())
      const geometries = [assets.boardGeo, assets.spineGeo, assets.titleGeo, assets.innerGeo, assets.blockGeo, assets.ribbonGeo]
      geometries.forEach((g) => g.dispose())
    },
  }
  return assets
}

/* ───────────────────────── Component ───────────────────────── */

export default function Notebook() {
  const reduced = useReducedMotion()
  const assets = useMemo(() => createAssets(), [])
  // Per-frame writes (uniforms, bent geometry) go through a ref, as R3F intends.
  // assets never changes (empty deps), so the initial value stays current.
  const live = useRef(assets)

  const cover = useRef<THREE.Group>(null)
  const anim = useRef({
    open: 0,
    write: 0,
    flip: 0,
    flutter: 0,
    fresh: new Float32Array(MAX_LINES),
    last: Array.from({ length: SHEETS }, () => ({ angle: NaN, bend: NaN, min: NaN })),
  })

  useEffect(() => {
    let alive = true
    // Draw the text once the fonts are in (or with fallbacks if they failed).
    loadNoteFonts().then(() => {
      if (alive) live.current.redraw(true)
    })
    return () => {
      alive = false
    }
  }, [assets])

  useEffect(() => () => assets.dispose(), [assets])

  useFrame((state, delta) => {
    const a = anim.current
    const nb = live.current
    const dt = Math.min(delta, 0.1)
    const time = state.clock.elapsedTime
    const sec = scrollState.sections

    // ── Targets from scroll ──
    let openT: number
    let writeT: number
    let flipT: number
    if (reduced) {
      const act = scrollState.active
      openT = act === 'rules' || act === 'names' || act === 'eyes' ? 1 : 0
      writeT = act === 'hero' ? 0 : 1
      flipT = 0
    } else {
      openT = smooth(0.12, 0.42, sec.rules.progress) * (1 - smooth(0.18, 0.5, sec.contact.progress))
      writeT = smooth(0.24, 0.56, sec.rules.progress)
      flipT = smooth(0.16, 0.84, sec.names.progress)
    }

    if (reduced) {
      a.open = openT
      a.write = writeT
      a.flip = flipT
      a.flutter = 0
    } else {
      a.open = damp(a.open, openT, 3.2, dt)
      a.write = damp(a.write, writeT, 3, dt)
      a.flip = damp(a.flip, flipT, 2.6, dt)
      const vel = clamp01(Math.abs(scrollState.velocity) / 28)
      a.flutter = damp(a.flutter, vel, vel > a.flutter ? 6 : 1.5, dt)
    }

    // ── Cover ──
    const open = a.open
    let coverAngle = easeInOut(open) * OPEN_ANGLE
    if (!reduced) {
      // Closed: the cover "breathes", lifting a hair. Open: a slow sway.
      const breath = Math.sin(time * 0.9) * 0.5 + 0.5
      coverAngle += -(1 - open) * breath * breath * 0.012 + open * Math.sin(time * 0.5) * 0.006
    }
    if (cover.current) cover.current.rotation.y = coverAngle

    // ── Sheets ──
    const span = SHEETS - 1 + FLIP_LEN
    let topRight = -1
    let topLeft = -1
    for (let i = 0; i < SHEETS; i++) {
      const f = clamp01((a.flip * span - i) / FLIP_LEN)
      if (f < 0.5 && topRight < 0) topRight = i
      if (f >= 0.5) topLeft = i
    }
    const idle = reduced ? 0 : (Math.sin(time * 1.3) * 0.5 + 0.5) * 0.035 + Math.sin(time * 3.1) * 0.006
    const flutter = (idle + a.flutter * 0.16) * smooth(0.6, 1, open)
    for (let i = 0; i < SHEETS; i++) {
      const f = clamp01((a.flip * span - i) / FLIP_LEN)
      // Never below the cover on the left; never into the block (keeps min ≤ max while closed).
      const minAngle = Math.min(0, coverAngle + REST_LIFT[i])
      const rest = OPEN_ANGLE + REST_LIFT[i]
      const angle = Math.min(0, Math.max(easeInOut(f) * rest, minAngle))
      // The fore-edge leads the turn; idle flutter lifts the visible top sheets.
      let bend = reduced ? 0 : -0.6 * Math.sin(Math.PI * f) * (1 + a.flutter * 0.5)
      if (i === topRight) bend -= flutter
      if (i === topLeft) bend += flutter * 0.8
      const last = a.last[i]
      if (Math.abs(last.angle - angle) < 1e-5 && Math.abs(last.bend - bend) < 1e-5 && Math.abs(last.min - minAngle) < 1e-5) continue
      last.angle = angle
      last.bend = bend
      last.min = minAngle
      bendSheet(nb.sheets[i].geometry, angle, bend, minAngle, 0)
    }

    // ── Handwritten names (write-on, line by line) ──
    const u = nb.namesUniforms
    const n = nb.lines.length
    for (let i = 0; i < MAX_LINES; i++) {
      const line = nb.lines[i]
      if (!line) {
        u.uRevealX.value[i] = -1
        u.uLineV.value[i] = -1
        continue
      }
      const p = clamp01(a.write * n - i)
      u.uLineV.value[i] = line.v
      u.uRevealX.value[i] = p <= 0 ? -1 : line.x0 + (line.x1 - line.x0) * p
      const writing = !reduced && p > 0.001 && p < 0.999 ? 1 : 0
      a.fresh[i] = reduced ? 0 : damp(a.fresh[i], writing, writing ? 12 : 1.6, dt)
      u.uFresh.value[i] = a.fresh[i]
    }

    // ── Ribbon sway ──
    if (!reduced) bendRibbon(nb.ribbonGeo, time, 1 + a.flutter * 2)
  })

  return (
    <group name="notebook">
      {/* Back cover */}
      <mesh geometry={assets.boardGeo} material={assets.leather} position={[-W / 2, 0, -T / 2 + COVER_T / 2]} />
      {/* Spine */}
      <mesh geometry={assets.spineGeo} material={assets.spine} position={[-W / 2 + 0.006, 0, 0]} />
      {/* Page block; its top face is the last page */}
      <mesh
        geometry={assets.blockGeo}
        material={assets.blockMats}
        position={[(PAGE_X0 + PAGE_X1) / 2, 0, (PAGE_TOP + PAGE_BOTTOM) / 2]}
      />
      {/* Loose sheets, hinged at the spine */}
      {assets.sheets.map((s, i) => (
        <group key={i} position={[PAGE_X0, 0, SHEET_Z0 - i * SHEET_GAP]}>
          <mesh geometry={s.geometry} material={s.front} frustumCulled={false} />
          <mesh geometry={s.geometry} material={s.back} frustumCulled={false} />
        </group>
      ))}
      {/* Front cover, hinged on the spine */}
      <group ref={cover} position={[HINGE_X, 0, HINGE_Z]}>
        <mesh geometry={assets.boardGeo} material={assets.leather} position={[0, 0, COVER_T / 2]} />
        <mesh geometry={assets.titleGeo} material={assets.titleMat} position={[W / 2, 0, COVER_T + 0.0012]} />
        <mesh
          geometry={assets.innerGeo}
          material={assets.innerMat}
          position={[W / 2 + 0.008, 0, -0.0004]}
          rotation={[0, Math.PI, 0]}
        />
      </group>
      {/* Bookmark ribbon */}
      <mesh geometry={assets.ribbonGeo} material={assets.ribbonMat} frustumCulled={false} />
    </group>
  )
}
