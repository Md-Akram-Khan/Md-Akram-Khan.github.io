// Environment helpers shared by HTML and 3D code.
import { useEffect, useState } from 'react'

/** URL for a file in /public, correct under any Vite `base`. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export const fonts = {
  /** TTF files, for drei <Text> (troika cannot read woff2). */
  gothic: asset('fonts/UnifrakturMaguntia.ttf'),
  hand: asset('fonts/Caveat.ttf'),
  serif: asset('fonts/IMFellEnglish-Regular.ttf'),
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
    webglCache = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webglCache = false
  }
  return webglCache
}
