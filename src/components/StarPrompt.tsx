// "Leave your mark": when the visitor reaches the bottom of the portfolio, a small
// card slides in (bottom-left, clear of Shinigami AI) asking for a GitHub star.
// The button opens the repo, where the Star button is one click away (GitHub
// requires the visitor's own login, so no site can star on their behalf).
// Dismissed or used once, it stays away on that browser.
import { useEffect, useRef, useState } from 'react'
import { REPO_URL, useStars } from '../lib/stars'
import './StarPrompt.css'

const SEEN = 'dn-star-prompt'

function remembered() {
  try {
    return localStorage.getItem(SEEN) === '1'
  } catch {
    return false
  }
}
function remember() {
  try {
    localStorage.setItem(SEEN, '1')
  } catch {
    // ignore
  }
}

export default function StarPrompt() {
  const [show, setShow] = useState(false)
  const [gone, setGone] = useState(remembered)
  const stars = useStars(show)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Appear once the footer scrolls into view.
  useEffect(() => {
    if (gone) return
    const footer = document.querySelector('.footer')
    if (!footer || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(footer)
    return () => io.disconnect()
  }, [gone])

  const dismiss = () => {
    remember()
    setGone(true)
  }

  if (gone || !show) return null

  return (
    <aside className="star-prompt" aria-labelledby="star-prompt-title">
      <button ref={closeRef} type="button" className="star-prompt__close" onClick={dismiss}>
        <span aria-hidden="true">×</span>
        <span className="visually-hidden">Dismiss</span>
      </button>
      <p className="mono star-prompt__kicker">The last page</p>
      <h2 className="gothic star-prompt__title" id="star-prompt-title">
        Did the note leave a mark?
      </h2>
      <p className="star-prompt__text">If you liked this portfolio, leave a star on GitHub. It takes one click and means a lot.</p>
      <a className="star-prompt__btn" href={REPO_URL} target="_blank" rel="noopener noreferrer" onClick={dismiss}>
        <StarIcon />
        <span>Star on GitHub</span>
        {stars !== null && (
          <span className="mono star-prompt__count" aria-label={`${stars} stars so far`}>
            {stars}
          </span>
        )}
        <span className="visually-hidden"> (opens the repository in a new tab)</span>
      </a>
    </aside>
  )
}

export function StarIcon() {
  return (
    <svg className="star-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"
      />
    </svg>
  )
}
