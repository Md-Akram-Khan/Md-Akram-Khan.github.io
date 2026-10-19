import { useEffect, useRef } from 'react'
import { asset, useReducedMotion } from '../lib/env'
import './PenReel.css'

type Props = {
  /** Changes whenever a visitor writes a name; the clip then plays again from the start. */
  replayKey?: number
  className?: string
}

/**
 * A short, silent, looping film clip of a pen writing, framed like a projected reel.
 * Purely decorative: it only loads once it is near the viewport, only plays while
 * visible, and stays on its poster frame when the visitor prefers reduced motion.
 */
export default function PenReel({ replayKey = 0, className = '' }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const visible = useRef(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (reduce) {
      el.pause()
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting
        if (entry.isIntersecting) {
          if (el.preload === 'none') el.preload = 'auto'
          // play() rejects if the browser blocks autoplay; the poster frame stays, which is fine.
          el.play().catch(() => undefined)
        } else {
          el.pause()
        }
      },
      { rootMargin: '200px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduce])

  // Replay from the first frame when a new name is written.
  useEffect(() => {
    const el = video.current
    if (!el || replayKey === 0 || reduce) return
    el.currentTime = 0
    if (visible.current) el.play().catch(() => undefined)
  }, [replayKey, reduce])

  return (
    <figure className={`pen-reel ${className}`} aria-hidden="true">
      <div className="pen-reel__frame">
        <video
          ref={video}
          className="pen-reel__video"
          muted
          loop
          playsInline
          disablePictureInPicture
          preload="none"
          poster={asset('media/pen-poster.jpg')}
          tabIndex={-1}
        >
          <source src={asset('media/pen.webm')} type="video/webm" />
          <source src={asset('media/pen.mp4')} type="video/mp4" />
        </video>
        <span className="pen-reel__tint" />
        <span className="pen-reel__corners" />
      </div>
      <figcaption className="mono pen-reel__caption">
        <span className="pen-reel__rec" />
        The last page, in motion
      </figcaption>
    </figure>
  )
}
