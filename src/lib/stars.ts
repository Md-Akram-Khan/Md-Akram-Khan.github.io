// The portfolio repo's live GitHub star count, for the "star this note" buttons.
// Fetched when a star button first appears, and again whenever the visitor comes
// back to the tab (e.g. after starring on GitHub), so the count stays current.
// A 60-second cache matches GitHub's own and keeps us well inside the public
// API's limit (60 requests per hour per visitor). Any failure just hides the count.
import { useEffect, useState } from 'react'

export const REPO_URL = 'https://github.com/Md-Akram-Khan/My-Portfolio'
const API = 'https://api.github.com/repos/Md-Akram-Khan/My-Portfolio'
const TTL = 60_000

let cache: { n: number; at: number } | null = null
let inflight: Promise<number | null> | null = null
const listeners = new Set<(n: number) => void>()

function fetchStars(force = false): Promise<number | null> {
  if (!force && cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.n)
  inflight ??= fetch(API, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { stargazers_count?: number } | null) => {
      const n = typeof d?.stargazers_count === 'number' ? d.stargazers_count : null
      if (n !== null) {
        cache = { n, at: Date.now() }
        listeners.forEach((fn) => fn(n))
      }
      return n ?? cache?.n ?? null
    })
    .catch(() => cache?.n ?? null)
    .finally(() => {
      inflight = null
    })
  return inflight
}

let clicked = false
/**
 * Call when a star button is clicked. When the visitor comes back, the count is
 * fetched fresh, and once more a minute later (GitHub's API itself caches for 60s).
 */
export function markStarClicked() {
  clicked = true
}

/** Live star count once `enabled` turns true; null until known (or if unavailable). */
export function useStars(enabled: boolean) {
  const [stars, setStars] = useState<number | null>(cache?.n ?? null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    const set = (n: number | null) => alive && n !== null && setStars(n)
    listeners.add(set)
    fetchStars().then(set)
    // Coming back to the tab (after starring on GitHub): refresh once the cache is stale.
    let later = 0
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return
      if (clicked) {
        clicked = false
        fetchStars(true).then(set)
        window.clearTimeout(later)
        later = window.setTimeout(() => fetchStars(true).then(set), 65_000)
      } else {
        fetchStars().then(set)
      }
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      alive = false
      window.clearTimeout(later)
      listeners.delete(set)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [enabled])
  return stars
}
