// Cinematic opening: the name is handwritten onto a ruled page, a caption
// appears, and the black overlay lifts. Decorative only (aria-hidden), never
// traps focus, skippable with any click / key / wheel / touch, and skipped
// entirely on repeat visits in the same tab session and under reduced motion.
//
// The whole visual timeline is CSS, starting the frame the overlay mounts, so
// it ends on time (~2.25s) even if the main thread is busy (e.g. while the 3D
// scene compiles). JS only handles skipping, the "done" signal and unmounting.
//
// Integration contract (no imports needed):
//   <html data-intro> is 'playing' while the intro runs (set during Intro's
//   first render, so siblings rendered after it can read it on their first
//   render), then 'done' when it starts to lift, or 'skipped' if the visitor
//   skipped it. Without an intro it is 'done' from the start.
//   window receives a `note:intro-done` event when it leaves (either way).
//   Hero and Nav schedule their entrance behind it with matching CSS delays.
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { profile } from '../data/portfolio'
import './Intro.css'

const SEEN_KEY = 'the-note:intro-seen'
const DONE_EVENT = 'note:intro-done'

/** Keep in sync with Intro.css: the overlay starts to lift at 1750ms and is gone by 2250ms. */
const LEAVE_AT_MS = 1750
const UNMOUNT_AT_MS = 2300
const SKIP_OUT_MS = 300

// SVG geometry (viewBox units). Caveat at 120px sets "Md. Akram Khan" ≈ 843
// units wide; textLength pins that width so the ink wipe and the pen stay in
// sync even while the font is still swapping in.
const VB_W = 1000
const VB_H = 240
const TEXT_X = 78
const TEXT_W = 843
const BASELINE = 164
const SOFT_EDGE = 110 // width of the feathered leading edge of the ink wipe
const WIPE_W = 1100
const TRAVEL = TEXT_W + SOFT_EDGE
const PEN_X = TEXT_X - SOFT_EDGE / 2
const PEN_Y = BASELINE - 34

// Start fetching the handwriting font as early as possible.
try {
  document.fonts?.load('500 1em Caveat').catch(() => {})
} catch {
  /* ignore */
}

function shouldPlay(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  } catch {
    /* matchMedia unavailable: play */
  }
  try {
    if (window.sessionStorage.getItem(SEEN_KEY)) return false
  } catch {
    /* storage blocked: play once per page load */
  }
  return true
}

export default function Intro() {
  // Decided once and published on <html> during this first render.
  const [play] = useState(() => {
    const p = shouldPlay()
    document.documentElement.dataset.intro = p ? 'playing' : 'done'
    return p
  })
  const [leaving, setLeaving] = useState<false | 'normal' | 'skip'>(false)
  const [gone, setGone] = useState(!play)

  useEffect(() => {
    if (!play) {
      window.dispatchEvent(new Event(DONE_EVENT))
      return
    }
    try {
      window.sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* ignore */
    }

    const mountedAt = performance.now()
    const timers: number[] = []
    let left = false

    const leave = (how: 'normal' | 'skip') => {
      if (left) return
      left = true
      // A late "skip" (after the CSS timeline already lifted the overlay) is a normal exit.
      const skipped = how === 'skip' && performance.now() - mountedAt < LEAVE_AT_MS
      setLeaving(skipped ? 'skip' : 'normal')
      document.documentElement.dataset.intro = skipped ? 'skipped' : 'done'
      window.dispatchEvent(new Event(DONE_EVENT))
      const remaining = skipped ? SKIP_OUT_MS : Math.max(0, UNMOUNT_AT_MS - (performance.now() - mountedAt))
      timers.push(window.setTimeout(() => setGone(true), remaining))
    }

    timers.push(window.setTimeout(() => leave('normal'), LEAVE_AT_MS))
    const skip = () => leave('skip')
    const opts = { passive: true } as const
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip, opts)
    window.addEventListener('wheel', skip, opts)
    window.addEventListener('touchmove', skip, opts)

    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchmove', skip)
    }
  }, [play])

  if (gone) return null

  const cls = ['intro', leaving && 'intro--leaving', leaving === 'skip' && 'intro--skip'].filter(Boolean).join(' ')
  const vars = { '--intro-travel': `${TRAVEL}px` } as CSSProperties
  const textProps = {
    x: TEXT_X,
    y: BASELINE,
    textLength: TEXT_W,
    lengthAdjust: 'spacingAndGlyphs' as const,
  }

  return (
    <div className={cls} aria-hidden="true" style={vars}>
      <div className="intro__stage">
        <svg className="intro__svg" viewBox={`0 0 ${VB_W} ${VB_H}`} focusable="false">
          <defs>
            <linearGradient id="intro-edge" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" />
              <stop offset={1 - SOFT_EDGE / WIPE_W} stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="intro-rule-fade" gradientUnits="userSpaceOnUse" x1="0" x2={VB_W} y1="0" y2="0">
              <stop className="intro__rule-stop intro__rule-stop--clear" offset="0" />
              <stop className="intro__rule-stop" offset="0.18" />
              <stop className="intro__rule-stop" offset="0.82" />
              <stop className="intro__rule-stop intro__rule-stop--clear" offset="1" />
            </linearGradient>
            <radialGradient id="intro-nib-glow">
              <stop className="intro__glow-stop" offset="0" />
              <stop className="intro__glow-stop intro__glow-stop--edge" offset="1" />
            </radialGradient>
            {(['stroke', 'fill'] as const).map((k) => (
              <mask key={k} id={`intro-mask-${k}`} maskUnits="userSpaceOnUse" x="0" y="0" width={VB_W} height={VB_H}>
                <rect
                  className={`intro__wipe intro__wipe--${k}`}
                  x={TEXT_X - WIPE_W}
                  y="0"
                  width={WIPE_W}
                  height={VB_H}
                  fill="url(#intro-edge)"
                />
              </mask>
            ))}
          </defs>

          {/* A page of the note: two faint rules and a red margin line. */}
          <line
            className="intro__rule intro__rule--faint"
            x1="0"
            x2={VB_W}
            y1="54"
            y2="54"
            stroke="url(#intro-rule-fade)"
          />
          <line
            className="intro__rule"
            x1="0"
            x2={VB_W}
            y1={BASELINE + 8}
            y2={BASELINE + 8}
            stroke="url(#intro-rule-fade)"
          />
          <line className="intro__margin" x1="40" x2="40" y1="0" y2={VB_H} />

          <text className="intro__name intro__name--stroke" mask="url(#intro-mask-stroke)" {...textProps}>
            {profile.name}
          </text>
          <text className="intro__name intro__name--fill" mask="url(#intro-mask-fill)" {...textProps}>
            {profile.name}
          </text>

          {/* The pen travels with the wipe and wobbles like a writing hand. */}
          <g className="intro__pen">
            <g className="intro__pen-hand">
              <circle cx={PEN_X} cy={PEN_Y} r="24" fill="url(#intro-nib-glow)" />
              <line className="intro__quill" x1={PEN_X} y1={PEN_Y} x2={PEN_X + 38} y2={PEN_Y - 78} />
              <circle className="intro__nib" cx={PEN_X} cy={PEN_Y} r="3.2" />
            </g>
          </g>
        </svg>
        <p className="intro__caption gothic">The note has been found.</p>
      </div>
      <p className="intro__hint mono">
        <span className="intro__hint-mouse">Click or press any key to skip</span>
        <span className="intro__hint-touch">Tap to skip</span>
      </p>
    </div>
  )
}
