// Scroll choreography helpers shared by the 3D world.
//
// Every moving thing in the scene declares one "pose" per section. Each frame we
// blend those poses using how much of the viewport each section covers
// (scrollState.sections[id].visibility), eased so the scene settles into a
// section's pose and crosses over smoothly between two sections. The result is
// then damped, so jumps (nav clicks, page-down) glide instead of snapping.
import { sections, type SectionId } from '../data/portfolio'
import { scrollState } from '../lib/scroll'

export type Pose = {
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  s: number
}

export type PoseMap = Record<SectionId, Pose>

export const pose = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1): Pose => ({
  x,
  y,
  z,
  rx,
  ry,
  rz,
  s,
})

export const makePose = (): Pose => pose(0, 0, 0)

const ids = sections.map((s) => s.id)
const weights = Object.fromEntries(ids.map((id) => [id, id === 'hero' ? 1 : 0])) as Record<SectionId, number>

/** smootherstep — flat at both ends, so a section "holds" its pose. */
const ease = (v: number) => {
  const t = Math.min(1, Math.max(0, v))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * Normalised section weights for the current scroll position (sum = 1).
 * Two neighbouring sections with visibility v and 1-v get ease(v) and ease(1-v),
 * which still sum to 1, so the blend is an eased cross-fade.
 */
export function sectionWeights(): Readonly<Record<SectionId, number>> {
  let sum = 0
  for (const id of ids) sum += ease(scrollState.sections[id].visibility)
  if (sum < 1e-4) return weights // nothing measured yet: keep last weights
  for (const id of ids) weights[id] = ease(scrollState.sections[id].visibility) / sum
  return weights
}

/**
 * Horizontal layout factors for the viewport's aspect ratio. Desktop poses are
 * authored for 16:10 (1440×900); narrower windows (e.g. 1024×768, or a tall
 * 800px-wide window) pull things towards the centre and shrink them a little so
 * the book never slides off the edge; ultra-wide ones spread out slightly.
 */
export function aspectFit(aspect: number) {
  const k = aspect / 1.6
  return { x: Math.min(1.15, Math.max(0.38, k)), s: Math.min(1, Math.max(0.6, k)) }
}

/** Camera field of view (degrees) and its resting distance, as set up in Experience. */
export const CAMERA = { fov: 35, z: 7 }

/** Half the visible world width at depth `z` for the given viewport aspect. */
export const visibleHalfWidth = (aspect: number, z: number) =>
  Math.tan((CAMERA.fov * Math.PI) / 360) * Math.max(0.5, CAMERA.z - z) * aspect

/** Weighted blend of per-section poses into `out`. */
export function blendPoses(map: PoseMap, out: Pose, w = sectionWeights()): Pose {
  out.x = out.y = out.z = out.rx = out.ry = out.rz = out.s = 0
  for (const id of ids) {
    const k = w[id]
    if (!k) continue
    const p = map[id]
    out.x += p.x * k
    out.y += p.y * k
    out.z += p.z * k
    out.rx += p.rx * k
    out.ry += p.ry * k
    out.rz += p.rz * k
    out.s += p.s * k
  }
  return out
}

/**
 * 0..1: how much the object is "in transit" between two sections whose poses are
 * far apart sideways (1 = exactly halfway between two poses ≥ `span` apart).
 * Used to let the notebook recede and dim while it crosses behind the text.
 */
export function transitAmount(map: PoseMap, w = sectionWeights(), span = 1.5): number {
  let t = 0
  for (let i = 0; i < ids.length; i++) {
    const a = w[ids[i]]
    if (!a) continue
    for (let j = i + 1; j < ids.length; j++) {
      const b = w[ids[j]]
      if (!b) continue
      t += 4 * a * b * Math.min(1, Math.abs(map[ids[i]].x - map[ids[j]].x) / span)
    }
  }
  return Math.min(1, t)
}

/** Weighted blend of one number per section. */
export function blendValues(values: Record<SectionId, number>, w = sectionWeights()): number {
  let v = 0
  for (const id of ids) v += values[id] * w[id]
  return v
}

/** Frame-rate independent exponential damping (stable for any dt). */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * Math.min(dt, 0.5)))

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * How open the notebook is meant to be right now (0 closed .. 1 open).
 * Mirrors the timing Notebook.tsx uses for its cover, so the rig can keep the
 * open spread (which grows to the LEFT of the spine) centred where the layout
 * contract wants the book. Undamped; callers damp it.
 */
export function notebookOpenTarget(reduced: boolean): number {
  const s = scrollState.sections
  if (reduced) {
    const a = scrollState.active
    return a === 'rules' || a === 'names' || a === 'eyes' ? 1 : 0
  }
  return smooth(0.12, 0.42, s.rules.progress) * (1 - smooth(0.18, 0.5, s.contact.progress))
}

/** Same cubic ease Notebook.tsx applies to its cover angle. */
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** Local x of the open spread's centre relative to the closed book's centre. */
export const SPREAD_SHIFT = 0.725

/** Damp every field of `cur` towards `target`. */
export function dampPose(cur: Pose, target: Pose, lambda: number, dt: number) {
  cur.x = damp(cur.x, target.x, lambda, dt)
  cur.y = damp(cur.y, target.y, lambda, dt)
  cur.z = damp(cur.z, target.z, lambda, dt)
  cur.rx = damp(cur.rx, target.rx, lambda, dt)
  cur.ry = damp(cur.ry, target.ry, lambda, dt)
  cur.rz = damp(cur.rz, target.rz, lambda, dt)
  cur.s = damp(cur.s, target.s, lambda, dt)
}

/**
 * Live world facts other objects can follow (written by NotebookRig every frame).
 * Plain mutable object, read inside useFrame only.
 */
export const world = {
  /** Notebook anchor position in world space. */
  notebook: { x: 1.9, y: 0, z: 0 },
  /** 0..1, how dimmed the notebook should be (the 'names' section, or crossing the page). */
  dim: 0,
  /**
   * 0..1, how open the notebook is (damped). Computed once per frame by NotebookRig
   * (which runs first) and read by Notebook for the cover, so the cover angle and
   * the spread-centring slide always use the very same value.
   */
  open: 0,
}

/** Cheap smooth pseudo-noise in about -1..1 (sum of incommensurate sines). */
export const wobble = (t: number, seed = 0) =>
  (Math.sin(t * 1.7 + seed) * 0.5 + Math.sin(t * 2.9 + seed * 1.3) * 0.3 + Math.sin(t * 5.3 + seed * 2.1) * 0.2)

/** Deterministic PRNG so particle layouts are stable between renders. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
