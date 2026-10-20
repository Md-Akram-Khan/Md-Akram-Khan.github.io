// Ornaments for a black "rules page" of the note: a thin frame, a flourish in each
// corner, and a medallion — a skull inside a ring of rays — set on the top edge of
// the frame. Original artwork drawn for this site (inspired by the layout of the
// note's rule pages, not copied from it). Purely decorative.
import './PageOrnaments.css'

/** One corner flourish, drawn for the top-left corner; CSS mirrors it for the others. */
function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  return (
    <svg className={`ornament-corner ornament-corner--${pos}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        {/* the stem, running from the corner towards the page */}
        <path d="M5 5 L38 38" />
        {/* two volutes, mirrored across the stem */}
        <path d="M12 12 C 20 2, 38 3, 37 15 C 36 23, 25 22, 26 15.5 C 26.6 12, 31 12.2, 31 15.4" />
        <path d="M12 12 C 2 20, 3 38, 15 37 C 23 36, 22 25, 15.5 26 C 12 26.6, 12.2 31, 15.4 31" />
        {/* small leaves along the stem */}
        <path d="M21 21 C 26 17, 31 18, 33 21 C 29 23, 25 23.5, 21 21 Z" />
        <path d="M21 21 C 17 26, 18 31, 21 33 C 23 29, 23.5 25, 21 21 Z" />
        {/* the spike at the tip */}
        <path d="M38 38 L 46 46" strokeWidth="1.1" />
        <path d="M43 39.5 L 49 49 L 39.5 43" />
      </g>
      <g fill="currentColor">
        <circle cx="5" cy="5" r="1.8" />
        <circle cx="31" cy="15.4" r="1.4" />
        <circle cx="15.4" cy="31" r="1.4" />
        <circle cx="44" cy="10" r="1" />
        <circle cx="10" cy="44" r="1" />
      </g>
    </svg>
  )
}

/** The medallion: rays, a beaded double ring, and a skull at the centre. */
function Medallion() {
  const rays = Array.from({ length: 56 }, (_, i) => {
    const a = (i / 56) * Math.PI * 2
    const long = i % 2 === 0
    const r0 = 27
    const r1 = long ? 47 : 39
    return `M${(Math.cos(a) * r0).toFixed(2)} ${(Math.sin(a) * r0).toFixed(2)}L${(Math.cos(a) * r1).toFixed(2)} ${(Math.sin(a) * r1).toFixed(2)}`
  }).join('')
  return (
    <svg className="ornament-medallion" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
      <path className="ornament-medallion__rays" d={rays} stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      <circle r="25" fill="var(--ornament-bg, #050505)" stroke="currentColor" strokeWidth="1.8" />
      <circle r="21.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeDasharray="0.1 3.1" strokeLinecap="round" />
      <circle r="18.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
      {/* skull */}
      <g transform="translate(0 -1)">
        <path
          d="M0-12.5C7.6-12.5 11.5-7 11.5-1.2 11.5 3.6 9.2 6 7 7.1L7 11.6-7 11.6-7 7.1C-9.2 6-11.5 3.6-11.5-1.2-11.5-7-7.6-12.5 0-12.5Z"
          fill="currentColor"
        />
        <ellipse cx="-4.6" cy="-0.8" rx="3.2" ry="3.7" fill="var(--ornament-bg, #050505)" />
        <ellipse cx="4.6" cy="-0.8" rx="3.2" ry="3.7" fill="var(--ornament-bg, #050505)" />
        <path d="M0 3.4 L-1.7 6.6 L1.7 6.6 Z" fill="var(--ornament-bg, #050505)" />
        <path d="M-4 8.2V11.6M-1.3 8.2V11.6M1.3 8.2V11.6M4 8.2V11.6" stroke="var(--ornament-bg, #050505)" strokeWidth="0.9" />
      </g>
    </svg>
  )
}

export default function PageOrnaments() {
  return (
    <span className="page-ornaments" aria-hidden="true">
      <span className="page-ornaments__frame" />
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />
      <Medallion />
    </span>
  )
}
