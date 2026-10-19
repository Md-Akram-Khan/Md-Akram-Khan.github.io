// Procedural textures for the 3D notebook.
// Everything is painted on <canvas> at runtime, so the only files the notebook
// fetches are the self-hosted fonts in /public/fonts.
import * as THREE from 'three'
import { fonts } from '../lib/env'

/* ───────────────────────── Fonts ───────────────────────── */

/** Private family names, so canvas text never depends on the page's CSS. */
export const NOTE_FONTS = {
  gothic: 'NoteGothic',
  hand: 'NoteHand',
  serif: 'NoteSerif',
} as const

/** Canvas font stacks: system fallbacks keep text on the notebook if a file fails to load. */
const STACK = {
  gothic: `${NOTE_FONTS.gothic}, 'Old English Text MT', serif`,
  hand: `${NOTE_FONTS.hand}, 'Segoe Print', cursive`,
  serif: `${NOTE_FONTS.serif}, Georgia, serif`,
}

let fontPromise: Promise<boolean> | null = null

/**
 * Loads the three TTFs used on the notebook. Never rejects: resolves true when
 * every face loaded, false otherwise (canvas text then uses the fallbacks).
 */
export function loadNoteFonts(): Promise<boolean> {
  if (fontPromise) return fontPromise
  if (typeof document === 'undefined' || typeof FontFace === 'undefined' || !document.fonts) {
    fontPromise = Promise.resolve(false)
    return fontPromise
  }
  const faces = [
    new FontFace(NOTE_FONTS.gothic, `url(${fonts.gothic})`),
    new FontFace(NOTE_FONTS.hand, `url(${fonts.hand})`, { weight: '400 700' }),
    new FontFace(NOTE_FONTS.serif, `url(${fonts.serif})`),
  ]
  fontPromise = Promise.allSettled(
    faces.map((face) =>
      face.load().then((loaded) => {
        document.fonts.add(loaded)
      }),
    ),
  ).then((results) => results.every((r) => r.status === 'fulfilled'))
  return fontPromise
}

/* ───────────────────────── Shared page layout ───────────────────────── */

/**
 * Ruled-line layout in normalised page coordinates (0 = top edge, 1 = bottom),
 * shared by the paper and every ink layer so handwriting sits on the rules
 * whatever the canvas resolution.
 */
export const PAGE_LAYOUT = {
  /** Baseline of the first ruled line. */
  firstRule: 0.118,
  /** Distance between ruled lines. */
  ruleGap: 0.0525,
  /** Number of ruled lines on a page. */
  rules: 16,
  /** Red margin line (fraction of page width from the spine side). */
  margin: 0.13,
} as const

export const ruleY = (i: number) => PAGE_LAYOUT.firstRule + PAGE_LAYOUT.ruleGap * i

/* ───────────────────────── Noise helpers ───────────────────────── */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Value noise on a `period`-sized lattice; wraps seamlessly. */
function valueNoise(seed: number, period: number) {
  const rand = mulberry32(seed)
  const grid = new Float32Array(period * period)
  for (let i = 0; i < grid.length; i++) grid[i] = rand()
  const at = (x: number, y: number) => grid[(((y % period) + period) % period) * period + (((x % period) + period) % period)]
  return (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = x - xi
    const yf = y - yi
    const u = xf * xf * (3 - 2 * xf)
    const v = yf * yf * (3 - 2 * yf)
    const a = at(xi, yi)
    const b = at(xi + 1, yi)
    const c = at(xi, yi + 1)
    const d = at(xi + 1, yi + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
}

/** Fractal noise over [0,1)² that tiles; `base` is the coarsest lattice size. */
function fbm(seed: number, base: number, octaves: number) {
  const layers = Array.from({ length: octaves }, (_, o) => ({
    n: valueNoise(seed + o * 101, base << o),
    f: base << o,
    a: 0.5 ** o,
  }))
  const norm = layers.reduce((s, l) => s + l.a, 0)
  return (u: number, v: number) => {
    let sum = 0
    for (const l of layers) sum += l.n(u * l.f, v * l.f) * l.a
    return sum / norm
  }
}

/**
 * Samples a (smooth, low-frequency) field on a coarse grid once and returns a
 * cheap bilinear lookup, so full-resolution passes stay in the tens of ms.
 */
function coarse(fn: (u: number, v: number) => number, gw: number, gh: number) {
  const row = gw + 1
  const data = new Float32Array(row * (gh + 1))
  for (let y = 0; y <= gh; y++) for (let x = 0; x <= gw; x++) data[y * row + x] = fn(x / gw, y / gh)
  return (u: number, v: number) => {
    const fx = Math.min(Math.max(u, 0), 1) * gw
    const fy = Math.min(Math.max(v, 0), 1) * gh
    const x0 = Math.min(gw - 1, Math.floor(fx))
    const y0 = Math.min(gh - 1, Math.floor(fy))
    const tx = fx - x0
    const ty = fy - y0
    const i = y0 * row + x0
    const a = data[i] + (data[i + 1] - data[i]) * tx
    const b = data[i + row] + (data[i + row + 1] - data[i + row]) * tx
    return a + (b - a) * ty
  }
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return { c, ctx }
}

function colorTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function dataTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  t.anisotropy = 8
  return t
}

/* ───────────────────────── Leather ───────────────────────── */

export type LeatherTextures = {
  /** Cover colour: near-black with mottling and worn, greyed edges. */
  map: THREE.CanvasTexture
  /** Roughness in G: grain variation, hand-polished edges. */
  roughnessMap: THREE.CanvasTexture
  /** Tiling pebble-grain normal map (set repeat per use). */
  normalMap: THREE.CanvasTexture
}

/**
 * Cover leather. `aspect` is width / height of the cover; `cornerR` the corner
 * radius as a fraction of the cover width, so the wear follows the real outline.
 */
export function makeLeatherTextures(aspect: number, cornerR: number): LeatherTextures {
  // Colour + roughness share one pass (non-tiling, cover-shaped).
  const W = 512
  const H = Math.round(W / aspect)
  const col = canvas(W, H)
  const rough = canvas(W, H)
  const colImg = col.ctx.createImageData(W, H)
  const roughImg = rough.ctx.createImageData(W, H)
  const mottle = coarse(fbm(11, 4, 4), 64, 90)
  const wearNoise = coarse(fbm(37, 16, 3), 128, 180)
  const grain = mulberry32(23)
  const r = cornerR * W
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Signed distance (px) to the rounded-rectangle outline, positive inside.
      const qx = Math.max(Math.abs(x + 0.5 - W / 2) - (W / 2 - r), 0)
      const qy = Math.max(Math.abs(y + 0.5 - H / 2) - (H / 2 - r), 0)
      const outside = Math.sqrt(qx * qx + qy * qy)
      const inner = Math.min(W / 2 - Math.abs(x + 0.5 - W / 2), H / 2 - Math.abs(y + 0.5 - H / 2))
      const dist = outside > 0 ? r - outside : inner
      const u = x / W
      const v = y / H
      const wn = wearNoise(u, v)
      // Corners rub through more than straight edges.
      const corner = qx > 0 && qy > 0 ? 1 : 0
      const wear = clamp01(smooth(14 + corner * 10, 0, dist) * (0.35 + 0.9 * wn) + corner * smooth(r * 0.9, 0, r - outside) * 0.25)
      const m = mottle(u, v)
      const g = grain()
      const base = 13 + (m - 0.5) * 9 + (g - 0.5) * 4
      const i = (y * W + x) * 4
      colImg.data[i] = base + wear * 36
      colImg.data[i + 1] = base - 1 + wear * 31
      colImg.data[i + 2] = base - 1 + wear * 27
      colImg.data[i + 3] = 255
      const rr = 0.66 + (g - 0.5) * 0.18 + (m - 0.5) * 0.08 - wear * 0.24
      roughImg.data[i] = 0
      roughImg.data[i + 1] = clamp01(rr) * 255
      roughImg.data[i + 2] = 0
      roughImg.data[i + 3] = 255
    }
  }
  col.ctx.putImageData(colImg, 0, 0)
  rough.ctx.putImageData(roughImg, 0, 0)

  // A few faint scuffs: lighter on colour, glossier on roughness.
  const rand = mulberry32(7)
  for (let s = 0; s < 14; s++) {
    const x0 = rand() * W
    const y0 = rand() * H
    const len = 12 + rand() * 46
    const ang = rand() * Math.PI
    const bend = (rand() - 0.5) * 20
    const path = (ctx: CanvasRenderingContext2D) => {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(
        x0 + Math.cos(ang) * len * 0.5 + bend,
        y0 + Math.sin(ang) * len * 0.5 - bend,
        x0 + Math.cos(ang) * len,
        y0 + Math.sin(ang) * len,
      )
    }
    col.ctx.strokeStyle = `rgba(70, 64, 58, ${0.08 + rand() * 0.12})`
    col.ctx.lineWidth = 0.6 + rand() * 0.9
    path(col.ctx)
    col.ctx.stroke()
    rough.ctx.strokeStyle = 'rgba(0, 96, 0, 0.35)'
    rough.ctx.lineWidth = 1.2
    path(rough.ctx)
    rough.ctx.stroke()
  }

  return {
    map: colorTexture(col.c),
    roughnessMap: dataTexture(rough.c),
    normalMap: makeGrainNormal(),
  }
}

/** Pebbled leather grain: Worley cells (raised) separated by creases, plus fine pores. */
function makeGrainNormal() {
  const S = 256
  const CELLS = 22
  const rand = mulberry32(99)
  const pts = new Float32Array(CELLS * CELLS * 2)
  for (let i = 0; i < CELLS * CELLS; i++) {
    pts[i * 2] = 0.15 + rand() * 0.7
    pts[i * 2 + 1] = 0.15 + rand() * 0.7
  }
  const pores = fbm(5, 64, 2)
  const height = new Float32Array(S * S)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const fx = (x / S) * CELLS
      const fy = (y / S) * CELLS
      const cx = Math.floor(fx)
      const cy = Math.floor(fy)
      let f1 = 9
      let f2 = 9
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const gx = cx + ox
          const gy = cy + oy
          const wx = ((gx % CELLS) + CELLS) % CELLS
          const wy = ((gy % CELLS) + CELLS) % CELLS
          const px = gx + pts[(wy * CELLS + wx) * 2]
          const py = gy + pts[(wy * CELLS + wx) * 2 + 1]
          const d = Math.sqrt((px - fx) * (px - fx) + (py - fy) * (py - fy))
          if (d < f1) {
            f2 = f1
            f1 = d
          } else if (d < f2) f2 = d
        }
      }
      const crease = smooth(0, 0.28, f2 - f1)
      const dome = 1 - smooth(0, 0.75, f1) * 0.35
      height[y * S + x] = crease * dome + (pores(x / S, y / S) - 0.5) * 0.25
    }
  }
  const { c, ctx } = canvas(S, S)
  const img = ctx.createImageData(S, S)
  const h = (x: number, y: number) => height[((y + S) % S) * S + ((x + S) % S)]
  const strength = 2.2
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength
      // Canvas y grows downward while texture v grows upward, hence +dy.
      let nx = -dx
      let ny = dy
      let nz = 1
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz)
      nx /= l
      ny /= l
      nz /= l
      const i = (y * S + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const t = dataTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/* ───────────────────────── Cover title ───────────────────────── */

/**
 * Transparent decal for the front cover: the title in blackletter between two
 * hairline ornaments, plus a faint blind-stamped frame. White on transparent,
 * tinted by the material.
 */
export function drawCoverTitle(c: HTMLCanvasElement, fontsReady: boolean) {
  const ctx = c.getContext('2d')
  if (!ctx) return
  const W = c.width
  const H = c.height
  ctx.clearRect(0, 0, W, H)

  // Blind-stamped double frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.075)'
  ctx.lineWidth = W * 0.003
  ctx.strokeRect(W * 0.07, H * 0.05, W * 0.86, H * 0.9)
  ctx.lineWidth = W * 0.0015
  ctx.strokeRect(W * 0.085, H * 0.061, W * 0.83, H * 0.878)

  if (!fontsReady) return
  const title = 'DEATH NOTE'
  let size = W * 0.15
  ctx.font = `${size}px ${STACK.gothic}`
  const maxW = W * 0.74
  const measured = ctx.measureText(title).width
  if (measured > maxW) size *= maxW / measured
  ctx.font = `${size}px ${STACK.gothic}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const cy = H * 0.3
  // Soft halo so bloom has something to catch.
  ctx.shadowColor = 'rgba(255,255,255,0.35)'
  ctx.shadowBlur = W * 0.012
  ctx.fillStyle = '#ffffff'
  ctx.fillText(title, W / 2, cy)
  ctx.shadowBlur = 0

  // Hairline ornaments above and below.
  const tw = Math.min(ctx.measureText(title).width, maxW)
  const ornament = (y: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = W * 0.0022
    ctx.beginPath()
    ctx.moveTo(W / 2 - tw * 0.46, y)
    ctx.lineTo(W / 2 - W * 0.022, y)
    ctx.moveTo(W / 2 + W * 0.022, y)
    ctx.lineTo(W / 2 + tw * 0.46, y)
    ctx.stroke()
    const d = W * 0.011
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.beginPath()
    ctx.moveTo(W / 2, y - d)
    ctx.lineTo(W / 2 + d, y)
    ctx.lineTo(W / 2, y + d)
    ctx.lineTo(W / 2 - d, y)
    ctx.closePath()
    ctx.fill()
  }
  ornament(cy - size * 1.08)
  ornament(cy + size * 0.55)
}

/* ───────────────────────── Inside of the front cover ───────────────────────── */

/** Original parody rules printed inside the cover. */
export const INNER_RULES = [
  'The developer whose name is written in this note shall ship.',
  'Each bug whose name is written here shall be fixed before the next deploy.',
  'If no cause is written, the cause shall be ruled an off-by-one error.',
  'This note shall not take effect on code that was never committed.',
  'Whoever writes in this note shares its merge conflicts.',
]

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** Black endpaper printed with "How to Use It" and the parody rules, in pale ink. */
export function drawInnerCover(c: HTMLCanvasElement, fontsReady: boolean) {
  const ctx = c.getContext('2d')
  if (!ctx) return
  const W = c.width
  const H = c.height

  // Endpaper: warm black, faint fibres, darker toward the edges.
  ctx.fillStyle = '#0e0c0c'
  ctx.fillRect(0, 0, W, H)
  const rand = mulberry32(41)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,240,230,${0.012 + rand() * 0.02})`
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1)
  }
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.2, W / 2, H / 2, W * 0.95)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)

  // Printed frame.
  ctx.strokeStyle = 'rgba(232,226,208,0.28)'
  ctx.lineWidth = W * 0.0025
  ctx.strokeRect(W * 0.06, H * 0.045, W * 0.88, H * 0.91)
  ctx.lineWidth = W * 0.001
  ctx.strokeRect(W * 0.072, H * 0.054, W * 0.856, H * 0.892)

  if (!fontsReady) return

  // Heading.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  let hs = W * 0.115
  ctx.font = `${hs}px ${STACK.gothic}`
  const heading = 'How to Use It'
  const hw = ctx.measureText(heading).width
  if (hw > W * 0.76) hs *= (W * 0.76) / hw
  ctx.font = `${hs}px ${STACK.gothic}`
  ctx.fillStyle = '#efe8d8'
  ctx.shadowColor = 'rgba(255,245,230,0.25)'
  ctx.shadowBlur = W * 0.008
  ctx.fillText(heading, W / 2, H * 0.155)
  ctx.shadowBlur = 0

  // Ornament: hairline with a red lozenge.
  const oy = H * 0.19
  ctx.strokeStyle = 'rgba(232,226,208,0.45)'
  ctx.lineWidth = W * 0.0018
  ctx.beginPath()
  ctx.moveTo(W * 0.28, oy)
  ctx.lineTo(W * 0.475, oy)
  ctx.moveTo(W * 0.525, oy)
  ctx.lineTo(W * 0.72, oy)
  ctx.stroke()
  const d = W * 0.012
  ctx.fillStyle = '#c1121f'
  ctx.beginPath()
  ctx.moveTo(W / 2, oy - d)
  ctx.lineTo(W / 2 + d, oy)
  ctx.lineTo(W / 2, oy + d)
  ctx.lineTo(W / 2 - d, oy)
  ctx.closePath()
  ctx.fill()

  // Rules.
  const fs = W * 0.0425
  const lh = fs * 1.42
  const left = W * 0.17
  const maxW = W * 0.7
  let y = H * 0.285
  ctx.textAlign = 'left'
  INNER_RULES.forEach((rule, i) => {
    ctx.font = `${fs * 0.92}px ${STACK.serif}`
    ctx.fillStyle = '#d23440'
    ctx.textAlign = 'right'
    ctx.fillText(`${ROMAN[i]}.`, left - W * 0.025, y)
    ctx.textAlign = 'left'
    ctx.font = `${fs}px ${STACK.serif}`
    ctx.fillStyle = '#d9d2c2'
    for (const line of wrap(ctx, rule, maxW)) {
      ctx.fillText(line, left, y)
      y += lh
    }
    y += lh * 0.55
  })

  // Footer flourish.
  ctx.textAlign = 'center'
  ctx.font = `italic ${fs * 0.8}px ${STACK.serif}`
  ctx.fillStyle = 'rgba(217,210,194,0.55)'
  ctx.fillText('— further rules on the following pages —', W / 2, H * 0.915)
}

/* ───────────────────────── Paper ───────────────────────── */

/** Shared page paper: warm off-white, fibres, aged edges, faint rules and a red margin. */
export function makePaperTexture() {
  const W = 768
  const H = Math.round(W * (2.03 / 1.46))
  const { c, ctx } = canvas(W, H)
  const img = ctx.createImageData(W, H)
  const mottle = coarse(fbm(3, 6, 4), 96, 134)
  const fibre = coarse(fbm(17, 96, 2), 192, 267)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W
      const v = y / H
      const edge = Math.min(u, 1 - u, v, 1 - v)
      const age = smooth(0.08, 0, edge)
      const m = mottle(u, v)
      const f = fibre(u, v)
      const i = (y * W + x) * 4
      const b = 222 + (m - 0.5) * 14 + (f - 0.5) * 6 - age * 26
      img.data[i] = b
      img.data[i + 1] = b - 6 - age * 4
      img.data[i + 2] = b - 22 - age * 14
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  // Ruled lines.
  ctx.lineWidth = Math.max(1, W / 640)
  for (let i = 0; i < PAGE_LAYOUT.rules; i++) {
    const y = ruleY(i) * H
    ctx.strokeStyle = 'rgba(70, 78, 96, 0.28)'
    ctx.beginPath()
    ctx.moveTo(W * 0.035, y)
    ctx.lineTo(W * 0.965, y)
    ctx.stroke()
  }
  // Header rule (double) and the red margin.
  ctx.strokeStyle = 'rgba(70, 78, 96, 0.35)'
  ctx.beginPath()
  ctx.moveTo(W * 0.035, H * 0.062)
  ctx.lineTo(W * 0.965, H * 0.062)
  ctx.moveTo(W * 0.035, H * 0.068)
  ctx.lineTo(W * 0.965, H * 0.068)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(176, 24, 36, 0.42)'
  ctx.lineWidth = Math.max(1, W / 520)
  ctx.beginPath()
  ctx.moveTo(W * PAGE_LAYOUT.margin, H * 0.03)
  ctx.lineTo(W * PAGE_LAYOUT.margin, H * 0.97)
  ctx.stroke()

  return colorTexture(c)
}

/**
 * Page-edge striations for the sides of the page block. The stripes run across
 * the block's thickness: along u when `alongV` is false (fore-edge face of a
 * BoxGeometry), along v when true (top and bottom faces). Edges near the covers
 * are shaded, as if in their shadow.
 */
export function makePageEdgeTexture(alongV: boolean) {
  const N = 96
  const L = 4
  const { c, ctx } = canvas(alongV ? L : N, alongV ? N : L)
  const rand = mulberry32(alongV ? 62 : 61)
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N
    const occl = 0.6 + 0.4 * smooth(0, 0.16, Math.min(t, 1 - t))
    const k = (0.8 + rand() * 0.2 - (rand() < 0.1 ? 0.2 : 0)) * occl
    ctx.fillStyle = `rgb(${Math.round(218 * k)}, ${Math.round(209 * k)}, ${Math.round(188 * k)})`
    if (alongV) ctx.fillRect(0, i, L, 1)
    else ctx.fillRect(i, 0, 1, L)
  }
  const t = colorTexture(c)
  t.anisotropy = 4
  return t
}

/* ───────────────────────── Ink layers ───────────────────────── */

export type InkLine = {
  /** Normalised [0,1] uv range covered by the line's ink. */
  x0: number
  x1: number
  /** Line centre in uv (v grows upward). */
  v: number
}

/** The names page: one entry per line, written on alternating rules. */
export const NAME_RULES = [1, 3, 5, 7, 9, 11]

/**
 * Handwritten names on transparent canvas. Returns the measured extent of each
 * line (uv space) so the shader can reveal it left to right.
 */
export function drawNamesInk(c: HTMLCanvasElement, names: string[], fontsReady: boolean): InkLine[] {
  const ctx = c.getContext('2d')
  const W = c.width
  const H = c.height
  const lines: InkLine[] = []
  if (!ctx) return lines
  ctx.clearRect(0, 0, W, H)
  const rand = mulberry32(1234)
  const maxW = W * (0.93 - PAGE_LAYOUT.margin - 0.04)
  names.slice(0, NAME_RULES.length).forEach((name, i) => {
    const base = ruleY(NAME_RULES[i]) * H
    const x = W * (PAGE_LAYOUT.margin + 0.035) + rand() * W * 0.035
    let size = H * 0.052 * (0.94 + rand() * 0.1)
    ctx.font = `600 ${size}px ${STACK.hand}`
    const w0 = ctx.measureText(name).width
    if (w0 > maxW) size *= maxW / w0
    ctx.font = `600 ${size}px ${STACK.hand}`
    const width = fontsReady ? ctx.measureText(name).width : maxW * 0.6
    const tilt = (rand() - 0.5) * 0.03
    if (fontsReady) {
      ctx.save()
      ctx.translate(x, base - H * 0.006)
      ctx.rotate(tilt)
      ctx.fillStyle = '#16131a'
      ctx.fillText(name, 0, 0)
      ctx.restore()
    }
    lines.push({
      x0: x / W - 0.01,
      x1: (x + width) / W + 0.012,
      v: 1 - (base - size * 0.3) / H,
    })
  })
  return lines
}

/** Generic programmer foes, written as "names" on the following pages. */
const BUGS = [
  'Segmentation fault',
  'Off-by-one error',
  'undefined is not a function',
  'Merge conflict on main',
  'CORS policy error',
  'Race condition',
  'Memory leak',
  'Time Limit Exceeded',
  'Wrong Answer on test 2',
  'Null pointer',
  'Infinite loop',
  'Stack overflow',
  'Missing semicolon',
  'Works on my machine',
  'Flaky test',
  'Dangling pointer',
  'N+1 queries',
  'Unhandled promise rejection',
  '404 Not Found',
  'Deadlock',
  'Integer overflow',
  'Cache invalidation',
]

/** A page densely filled with crossed-out bug names. `seed` picks the selection. */
export function drawBugsInk(c: HTMLCanvasElement, seed: number, fontsReady: boolean) {
  const ctx = c.getContext('2d')
  if (!ctx) return
  const W = c.width
  const H = c.height
  ctx.clearRect(0, 0, W, H)
  if (!fontsReady) return
  const rand = mulberry32(seed)
  const pool = [...BUGS].sort(() => rand() - 0.5)
  const count = 12 + Math.floor(rand() * 3)
  for (let i = 0; i < count; i++) {
    const name = pool[i % pool.length]
    const base = ruleY(i + 1) * H
    const x = W * (PAGE_LAYOUT.margin + 0.03) + rand() * W * 0.06
    const size = H * 0.04 * (0.92 + rand() * 0.16)
    ctx.save()
    ctx.translate(x, base - H * 0.005)
    ctx.rotate((rand() - 0.5) * 0.035)
    ctx.font = `${500 + Math.round(rand() * 2) * 50} ${size}px ${STACK.hand}`
    ctx.fillStyle = `rgba(22, 19, 26, ${0.78 + rand() * 0.18})`
    ctx.fillText(name, 0, 0)
    // Most of them are dealt with: a quick strike-through.
    if (rand() < 0.62) {
      const w = ctx.measureText(name).width
      ctx.strokeStyle = 'rgba(22, 19, 26, 0.8)'
      ctx.lineWidth = Math.max(1, H * 0.0024)
      ctx.beginPath()
      ctx.moveTo(-W * 0.01, -size * 0.28)
      ctx.quadraticCurveTo(w * 0.5, -size * 0.36 + (rand() - 0.5) * size * 0.2, w + W * 0.012, -size * 0.3)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** The last page: blank but for an invitation. */
export function drawLastPageInk(c: HTMLCanvasElement, fontsReady: boolean) {
  const ctx = c.getContext('2d')
  if (!ctx) return
  const W = c.width
  const H = c.height
  ctx.clearRect(0, 0, W, H)
  if (!fontsReady) return
  const base = ruleY(1) * H
  const x = W * (PAGE_LAYOUT.margin + 0.04)
  const size = H * 0.048
  ctx.save()
  ctx.translate(x, base - H * 0.006)
  ctx.rotate(-0.012)
  ctx.font = `500 ${size}px ${STACK.hand}`
  ctx.fillStyle = 'rgba(120, 14, 22, 0.85)'
  const text = 'your name here?'
  ctx.fillText(text, 0, 0)
  const w = ctx.measureText(text).width
  ctx.strokeStyle = 'rgba(120, 14, 22, 0.55)'
  ctx.lineWidth = Math.max(1, H * 0.002)
  ctx.beginPath()
  ctx.moveTo(0, size * 0.22)
  ctx.quadraticCurveTo(w * 0.55, size * 0.3, w * 1.04, size * 0.16)
  ctx.stroke()
  ctx.restore()
}

/** Canvas + texture pair for content that is redrawn once fonts arrive. */
export function makeCanvasTexture(w: number, h: number, srgb = true) {
  const { c } = canvas(w, h)
  const t = srgb ? colorTexture(c) : dataTexture(c)
  return { canvas: c, texture: t }
}
