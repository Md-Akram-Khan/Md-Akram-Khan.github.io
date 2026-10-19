import type { MouseEvent } from 'react'
import { profile } from '../data/portfolio'
import { scrollToSection } from '../lib/scroll'
import './Footer.css'

const YEAR = 2026

function backToTop(e: MouseEvent<HTMLAnchorElement>) {
  // Let modified clicks (new tab, etc.) behave like a normal link.
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const hero = document.getElementById('hero')
  if (!hero) return
  e.preventDefault()
  scrollToSection('hero')
  // Move keyboard focus to the top too, without fighting the smooth scroll.
  if (!hero.hasAttribute('tabindex')) hero.setAttribute('tabindex', '-1')
  hero.focus({ preventScroll: true })
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__mark" aria-hidden="true">
          <span className="footer__mark-line" />
          <AppleIcon />
          <span className="footer__mark-line" />
        </div>

        <p className="footer__copy">
          <span className="mono footer__year">© {YEAR}</span> {profile.name}
        </p>
        <p className="footer__built">Built with React, Three.js and too many apples.</p>

        <a className="footer__top" href="#hero" onClick={backToTop}>
          <span className="footer__top-arrow" aria-hidden="true">
            ↑
          </span>
          Back to top
        </a>

        <p className="footer__disclaimer">
          A fan-made tribute. Death Note belongs to Tsugumi Ohba, Takeshi Obata and Shueisha; this site is not
          affiliated with them.
        </p>
      </div>
    </footer>
  )
}

function AppleIcon() {
  return (
    <svg className="footer__apple" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 7.6c-1.6-1.1-3.9-1.3-5.5.1-2.3 2-2.4 5.9-.8 9.1 1.3 2.7 3.2 4.6 4.9 4.1.5-.1.9-.4 1.4-.4s.9.3 1.4.4c1.7.5 3.6-1.4 4.9-4.1 1.6-3.2 1.5-7.1-.8-9.1-1.6-1.4-3.9-1.2-5.5-.1z"
      />
      <path d="M12 7.6c-.1-1.9.4-3.5 1.7-4.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path fill="currentColor" d="M13.2 5.4c1-1.9 3-2.6 4.7-2.1-.7 1.9-2.8 2.8-4.7 2.1z" opacity="0.75" />
    </svg>
  )
}
