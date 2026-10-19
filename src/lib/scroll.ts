// Shared, mutable scroll + pointer state.
// The 3D scene reads this every frame inside useFrame (no React re-renders).
// HTML components can read it too, or subscribe to `active` changes.
import { sections, type SectionId } from '../data/portfolio'

type SectionState = {
  /** 0 when the section's top reaches the viewport bottom, 1 when its bottom leaves the viewport top. */
  progress: number
  /** 0..1, how much of the viewport the section covers right now. */
  visibility: number
}

export const scrollState = {
  /** 0..1 over the whole document. */
  progress: 0,
  /** px/frame, smoothed. Positive when scrolling down. */
  velocity: 0,
  /** Section whose area is closest to the viewport centre. */
  active: 'hero' as SectionId,
  sections: Object.fromEntries(
    sections.map((s) => [s.id, { progress: 0, visibility: 0 }]),
  ) as Record<SectionId, SectionState>,
  /** Pointer position normalised to -1..1 (x right, y up). Stays 0 on touch devices. */
  pointer: { x: 0, y: 0 },
  /**
   * 0..1: fraction of the viewport below the last section (the footer scrolling in).
   * The 3D scene uses it to scroll up with the page at the very end.
   */
  tail: 0,
}

type Listener = (active: SectionId) => void
const listeners = new Set<Listener>()

/** Subscribe to active-section changes. Returns an unsubscribe function. */
export function onActiveSection(fn: Listener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

function measure() {
  const vh = window.innerHeight
  const doc = document.documentElement
  const max = Math.max(1, doc.scrollHeight - vh)
  const y = window.scrollY
  scrollState.velocity = scrollState.velocity * 0.8 + (y - lastY) * 0.2
  lastY = y
  scrollState.progress = Math.min(1, Math.max(0, y / max))

  let best: SectionId = scrollState.active
  let bestDist = Infinity
  let lastBottom = vh
  for (const { id } of sections) {
    const el = document.getElementById(id)
    if (!el) continue
    const r = el.getBoundingClientRect()
    lastBottom = r.bottom
    const s = scrollState.sections[id]
    s.progress = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh)))
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
    s.visibility = visible / vh
    const centre = vh / 2
    const dist = r.top <= centre && r.bottom >= centre ? 0 : Math.min(Math.abs(r.top - centre), Math.abs(r.bottom - centre))
    if (dist < bestDist) {
      bestDist = dist
      best = id
    }
  }
  scrollState.tail = Math.min(1, Math.max(0, (vh - lastBottom) / vh))
  if (best !== scrollState.active) {
    scrollState.active = best
    listeners.forEach((fn) => fn(best))
  }
}

let lastY = 0
let frame = 0

/** Start tracking scroll and pointer. Call once from App. Returns a cleanup function. */
export function startScrollTracking() {
  lastY = window.scrollY
  const schedule = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      measure()
    })
  }
  const onPointer = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    scrollState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    scrollState.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  // Velocity decays even when the page is not scrolling.
  const decay = window.setInterval(() => {
    scrollState.velocity *= 0.85
  }, 50)

  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  window.addEventListener('pointermove', onPointer, { passive: true })
  measure()
  return () => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('pointermove', onPointer)
    window.clearInterval(decay)
    if (frame) cancelAnimationFrame(frame)
    frame = 0
  }
}

/** Smooth-scroll to a section, respecting reduced motion. */
export function scrollToSection(id: SectionId) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
