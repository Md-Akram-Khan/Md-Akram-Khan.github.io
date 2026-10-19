// Environment helpers shared by HTML and 3D code.
import { useEffect, useState } from 'react'

/** URL for a file in /public, correct under any Vite `base`. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

/**
 * Font files the 3D notebook draws its canvas text with. The same woff2 files the
 * page's @font-face rules use, so they come straight from the HTTP cache.
 */
export const fonts = {
  gothic: asset('fonts/PirataOne.woff2'),
  hand: asset('fonts/Caveat.woff2'),
  serif: asset('fonts/IMFellEnglish-Regular.woff2'),
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
/** Phone-sized layout (matches the CSS breakpoint `--bp-mobile`). */
export const useIsMobile = () => useMedia('(max-width: 760px)')
/** True on touch-first devices (no hover). */
export const useIsTouch = () => useMedia('(hover: none)')

let webglCache: boolean | null = null
export function hasWebGL() {
  if (webglCache !== null) return webglCache
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    webglCache = !!gl
    // Release the probe context right away: browsers cap live WebGL contexts.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglCache = false
  }
  return webglCache
}
