// Static stand-in for the 3D scene when WebGL is unavailable (or crashes).
// Pure CSS + inline SVG: a black notebook, an apple, a red haze and — in the
// "Shinigami Eyes" section — two glowing slits. It follows the same layout
// contract as the 3D world (right side on desktop, top on phones) and reacts
// to the active section with CSS transitions only.
import { useEffect, useState } from 'react'
import type { SectionId } from '../data/portfolio'
import { onActiveSection, scrollState } from '../lib/scroll'
import './SceneFallback.css'

export default function SceneFallback() {
  const [active, setActive] = useState<SectionId>(() => scrollState.active)
  useEffect(() => onActiveSection(setActive), [])

  return (
    <div className="scene-fallback" data-section={active} aria-hidden="true">
      <div className="scene-fallback__haze" />

      <svg className="scene-fallback__eyes" viewBox="0 0 240 60" focusable="false">
        <defs>
          <filter id="sf-eye-glow" x="-50%" y="-200%" width="200%" height="500%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#sf-eye-glow)" className="scene-fallback__eye">
          <path d="M18 34 Q52 15 96 23 Q62 42 18 34 Z" />
          <path d="M222 34 Q188 15 144 23 Q178 42 222 34 Z" />
        </g>
        <g className="scene-fallback__pupil">
          <ellipse cx="60" cy="29.5" rx="1.6" ry="6.5" />
          <ellipse cx="180" cy="29.5" rx="1.6" ry="6.5" />
        </g>
      </svg>

      <div className="scene-fallback__stage">
        <div className="scene-fallback__float">
          <div className="scene-fallback__book">
            <div className="scene-fallback__block" />
            <div className="scene-fallback__page">
              <span className="scene-fallback__page-head">How to use it</span>
            </div>
            <div className="scene-fallback__cover">
              <div className="scene-fallback__cover-front">
                <span className="scene-fallback__title">Death Note</span>
              </div>
              <div className="scene-fallback__cover-back" />
            </div>
          </div>

          <svg className="scene-fallback__apple" viewBox="0 0 100 112" focusable="false">
            <defs>
              <radialGradient id="sf-apple" cx="38%" cy="38%" r="70%">
                <stop offset="0" style={{ stopColor: 'var(--blood-bright)' }} />
                <stop offset="0.45" style={{ stopColor: 'var(--blood)' }} />
                <stop offset="1" style={{ stopColor: 'var(--blood-deep)' }} />
              </radialGradient>
            </defs>
            <path
              d="M50 30 C38 20 14 22 9 46 C4 72 22 104 38 106 C44 107 47 103 50 103 C53 103 56 107 62 106 C78 104 96 72 91 46 C86 22 62 20 50 30 Z"
              fill="url(#sf-apple)"
            />
            <path d="M50 31 C50 22 52 14 57 7" stroke="#3a2414" strokeWidth="3.2" fill="none" strokeLinecap="round" />
            <path d="M55 14 C64 4 78 4 86 9 C78 18 64 20 55 14 Z" fill="#2c4219" />
            <ellipse cx="32" cy="46" rx="7" ry="12" fill="#fff" opacity="0.22" transform="rotate(20 32 46)" />
          </svg>
        </div>
      </div>
    </div>
  )
}
