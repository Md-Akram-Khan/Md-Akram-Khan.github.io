// The portfolio repo's GitHub star count, for the "star this note" prompts.
// One public API call per visit (cached for the session), made only when a star
// button actually appears. Any failure just hides the count.
import { useEffect, useState } from 'react'

export const REPO_URL = 'https://github.com/Md-Akram-Khan/My-Portfolio'
const API = 'https://api.github.com/repos/Md-Akram-Khan/My-Portfolio'
const KEY = 'dn-stars'

let inflight: Promise<number | null> | null = null

function fetchStars(): Promise<number | null> {
  try {
    const cached = sessionStorage.getItem(KEY)
    if (cached !== null) return Promise.resolve(Number(cached))
  } catch {
    // storage unavailable: just fetch
  }
  inflight ??= fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { stargazers_count?: number } | null) => {
      const n = typeof d?.stargazers_count === 'number' ? d.stargazers_count : null
      try {
        if (n !== null) sessionStorage.setItem(KEY, String(n))
      } catch {
        // ignore
      }
      return n
    })
    .catch(() => null)
  return inflight
}

/** Star count once `enabled` turns true; null until known (or if unavailable). */
export function useStars(enabled: boolean) {
  const [stars, setStars] = useState<number | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    fetchStars().then((n) => alive && setStars(n))
    return () => {
      alive = false
    }
  }, [enabled])
  return stars
}
