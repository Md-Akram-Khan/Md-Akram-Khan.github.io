// Fixed top navigation.
// Wide screens: brand + inline section links with the active one marked.
// Narrow screens (≤1080px): a disclosure button that opens a full-screen menu
// (Escape closes it, focus stays inside while open, page scroll is locked).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { profile, sections } from '../data/portfolio'
import type { SectionId } from '../data/portfolio'
import { onActiveSection, scrollState, scrollToSection } from '../lib/scroll'
import './Nav.css'

const links = sections.filter((s) => s.id !== 'hero')
/** Below this width the inline links collapse into the menu (keep in sync with Nav.css). */
const COLLAPSE_QUERY = '(max-width: 1080px)'
const MENU_ID = 'nav-menu'

/** Smooth-scroll to a section, update the hash without jumping, and move focus there. */
function goTo(id: SectionId) {
  scrollToSection(id)
  try {
    const { pathname, search } = window.location
    history.replaceState(null, '', id === 'hero' ? pathname + search : `#${id}`)
  } catch {
    /* ignore */
  }
  const el = document.getElementById(id)
  if (!el) return
  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1')
    el.setAttribute('data-nav-target', '')
  }
  el.focus({ preventScroll: true })
}

let savedBodyStyle: { overflow: string; paddingRight: string } | null = null
function lockScroll() {
  if (savedBodyStyle) return
  const body = document.body
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  savedBodyStyle = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
  body.style.overflow = 'hidden'
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
}
function unlockScroll() {
  if (!savedBodyStyle) return
  document.body.style.overflow = savedBodyStyle.overflow
  document.body.style.paddingRight = savedBodyStyle.paddingRight
  savedBodyStyle = null
}

/** Plain left-clicks are handled in-page; modified clicks keep browser behaviour. */
const isPlainClick = (e: ReactMouseEvent) =>
  !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

// The intro publishes its state on <html data-intro> (see Intro.tsx).
const readIntro = () => document.documentElement.dataset.intro ?? 'none'
function subscribeIntro(onChange: () => void) {
  window.addEventListener('note:intro-done', onChange)
  return () => window.removeEventListener('note:intro-done', onChange)
}
/** True while the bar's entrance should wait (by CSS delay) for the intro; false once skipped. */
function useBehindIntro() {
  const [startedBehind] = useState(() => readIntro() === 'playing')
  const intro = useSyncExternalStore(subscribeIntro, readIntro, () => 'none')
  return startedBehind && intro !== 'skipped'
}

export default function Nav() {
  const [active, setActive] = useState<SectionId>(scrollState.active)
  const [scrolled, setScrolled] = useState(() => window.scrollY > 24)
  const [open, setOpen] = useState(false)
  const late = useBehindIntro()

  const headerRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)

  // Active section: re-renders only when it changes.
  useEffect(() => onActiveSection(setActive), [])

  // Solid bar after the first scroll + reading-progress hairline (no React state per frame).
  useEffect(() => {
    let raf = 0
    const drawProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`
    }
    const update = () => {
      raf = 0
      setScrolled(window.scrollY > 24) // React bails out when unchanged
      drawProgress()
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    drawProgress()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    unlockScroll()
    if (restoreFocus) toggleRef.current?.focus()
  }, [])

  // While the menu is open: lock scroll, focus the first link, trap Tab, Escape closes,
  // and make everything behind the full-screen menu inert, so screen-reader cursors
  // and swipes stay in the menu just as keyboard focus does.
  useEffect(() => {
    if (!open) return
    lockScroll()
    const behind = Array.from(document.querySelectorAll<HTMLElement>('main, footer, .skip-link'))
    behind.forEach((el) => {
      el.inert = true
    })
    const first = menuRef.current?.querySelector<HTMLElement>('a[href]')
    first?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu(true)
        return
      }
      if (e.key !== 'Tab' || !headerRef.current) return
      const focusables = Array.from(
        headerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')
      if (!focusables.length) return
      const firstEl = focusables[0]
      const lastEl = focusables[focusables.length - 1]
      const current = document.activeElement
      if (e.shiftKey && (current === firstEl || !headerRef.current.contains(current))) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && (current === lastEl || !headerRef.current.contains(current))) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      behind.forEach((el) => {
        el.inert = false
      })
      unlockScroll()
    }
  }, [open, closeMenu])

  // Leaving the collapsed layout (e.g. rotating a tablet) closes the menu.
  useEffect(() => {
    const mq = window.matchMedia(COLLAPSE_QUERY)
    const onChange = () => {
      if (!mq.matches) closeMenu(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [closeMenu])

  const onLink = (e: ReactMouseEvent<HTMLAnchorElement>, id: SectionId) => {
    if (!isPlainClick(e)) return
    e.preventDefault()
    if (open) closeMenu(false)
    goTo(id)
  }

  const cls = ['nav', late && 'nav--late', scrolled && 'nav--scrolled', open && 'nav--open'].filter(Boolean).join(' ')

  return (
    <header ref={headerRef} className={cls}>
      <div className="nav__bar">
        <a className="nav__brand" href="#hero" onClick={(e) => onLink(e, 'hero')}>
          <span className="nav__seal" aria-hidden="true">
            {profile.shortName.charAt(0)}
          </span>
          {/* The name is set in a legible serif (Fraktur's "k" reads as an "f"); "Note" stays gothic. */}
          <span className="nav__brand-text">
            <span className="nav__brand-name">{profile.shortName}’s</span>{' '}
            <span className="nav__brand-note gothic">Note</span>
          </span>
          <span className="visually-hidden">, back to the top</span>
        </a>

        <nav className="nav__inline" aria-label="Sections">
          <ol className="nav__list">
            {links.map((s) => {
              const isActive = active === s.id
              return (
                <li key={s.id}>
                  <a
                    className={`nav__link${isActive ? ' is-active' : ''}`}
                    href={`#${s.id}`}
                    aria-current={isActive ? 'location' : undefined}
                    onClick={(e) => onLink(e, s.id)}
                  >
                    <span className="nav__num" aria-hidden="true">
                      {s.numeral}
                    </span>
                    <span className="nav__dot" aria-hidden="true">
                      ·
                    </span>
                    <span className="nav__label">{s.label}</span>
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => (open ? closeMenu(false) : setOpen(true))}
        >
          <span className="nav__toggle-label mono">Menu</span>
          <span className="nav__toggle-icon" aria-hidden="true">
            <span />
            <span />
          </span>
        </button>

        <span className="nav__progress" ref={progressRef} aria-hidden="true" />
      </div>

      <div ref={menuRef} id={MENU_ID} className={`nav__menu${open ? ' is-open' : ''}`}>
        <div className="nav__menu-inner">
          <p className="nav__menu-eyebrow eyebrow">Choose a page</p>
          <nav aria-label="Sections">
            <ol className="nav__menu-list">
              {links.map((s, i) => {
                const isActive = active === s.id
                return (
                  <li key={s.id} className="nav__menu-item" style={{ transitionDelay: open ? `${120 + i * 60}ms` : '0ms' }}>
                    <a
                      className={`nav__menu-link${isActive ? ' is-active' : ''}`}
                      href={`#${s.id}`}
                      aria-current={isActive ? 'location' : undefined}
                      onClick={(e) => onLink(e, s.id)}
                    >
                      <span className="nav__menu-num mono" aria-hidden="true">
                        {s.numeral}
                      </span>
                      <span className="nav__menu-label gothic">{s.label}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </nav>
          <div className="nav__menu-foot">
            <p className="nav__menu-note hand">No names are written here. Yet.</p>
            <ul className="nav__menu-social mono">
              <li>
                <a href={profile.links.github} target="_blank" rel="noopener noreferrer">
                  GitHub<span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a href={profile.links.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn<span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}
