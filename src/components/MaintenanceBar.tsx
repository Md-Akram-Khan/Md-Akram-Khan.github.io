// A thin notice fixed just under the nav: the site is under maintenance. The
// message types itself out like a keyboard, pauses, erases, and types again.
// Screen readers get the full sentence once; reduced motion shows it static.
import { useEffect, useState } from 'react'
import { useReducedMotion } from '../lib/env'
import './MaintenanceBar.css'

/** Set to false to remove the notice once maintenance is over. */
export const MAINTENANCE = true

const MESSAGE = 'This portfolio is under maintenance: some pages are still being written.'

export default function MaintenanceBar() {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(reduced ? MESSAGE.length : 0)
  const [erasing, setErasing] = useState(false)

  useEffect(() => {
    if (reduced) return
    const done = count === MESSAGE.length
    const empty = count === 0
    // typing speed varies a little, like a real hand on a keyboard
    const delay = erasing ? 22 : done ? 3200 : empty ? 600 : 45 + ((count * 37) % 50)
    const t = window.setTimeout(() => {
      if (!erasing && done) setErasing(true)
      else if (erasing && empty) setErasing(false)
      else setCount((c) => c + (erasing ? -1 : 1))
    }, delay)
    return () => window.clearTimeout(t)
  }, [count, erasing, reduced])

  if (!MAINTENANCE) return null
  const shown = reduced ? MESSAGE : MESSAGE.slice(0, count)

  return (
    <div className="maintenance" role="status">
      <span className="maintenance__badge mono" aria-hidden="true">
        <span className="maintenance__dot" />
        Maintenance
      </span>
      <span className="visually-hidden">{MESSAGE}</span>
      {/* The invisible full sentence reserves exactly the room the typed one needs. */}
      <span className="maintenance__text mono" aria-hidden="true">
        <span className="maintenance__ghost">
          <span className="maintenance__prompt">&gt;</span> {MESSAGE}
          <span className="maintenance__caret" />
        </span>
        <span className="maintenance__typed">
          <span className="maintenance__prompt">&gt;</span> {shown}
          <span className="maintenance__caret" />
        </span>
      </span>
    </div>
  )
}
