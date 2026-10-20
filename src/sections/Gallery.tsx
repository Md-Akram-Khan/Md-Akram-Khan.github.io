// RULE VII · "The Evidence Room" — photo gallery of award photos, certificates and
// event moments, pinned up like evidence on an investigation board. Clicking a print
// opens a lightbox (native modal <dialog>) with previous/next and keyboard arrows.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gallery, sections, type GalleryItem, type GalleryKind } from '../data/portfolio'
import { asset, useReducedMotion } from '../lib/env'
import RuleEyebrow from '../components/RuleEyebrow'
import './Gallery.css'

const meta = sections.find((s) => s.id === 'gallery')

const KIND_LABEL: Record<GalleryKind, string> = {
  certificate: 'Certificates',
  award: 'Awards',
  event: 'Events',
}
const KIND_ONE: Record<GalleryKind, string> = { certificate: 'Certificate', award: 'Award', event: 'Event' }

type Filter = 'all' | GalleryKind
// Only offer filters for kinds that have photos.
const kinds = (Object.keys(KIND_LABEL) as GalleryKind[]).filter((k) => gallery.some((g) => g.kind === k))
const pad = (n: number) => String(n).padStart(2, '0')

function Print({ item, n, onOpen }: { item: GalleryItem; n: number; onOpen: () => void }) {
  return (
    <li className={`gallery__item gallery__item--${item.kind}`} data-reveal style={{ '--tilt': `${((n * 37) % 7) - 3}deg` } as React.CSSProperties}>
      <button type="button" className="gallery__print" onClick={onOpen}>
        <span className="gallery__pin" aria-hidden="true" />
        <span className="gallery__frame">
          <picture>
            <source type="image/webp" srcSet={asset(item.webp)} />
            <img src={asset(item.jpg)} alt={item.alt} width={item.width} height={item.height} loading="lazy" decoding="async" />
          </picture>
          <span className="mono gallery__tag" aria-hidden="true">
            Exhibit {pad(n + 1)}
          </span>
        </span>
        <span className="gallery__label">
          <span className="mono gallery__kind">
            {KIND_ONE[item.kind]}
            {item.date ? ` · ${item.date}` : ''}
          </span>
          <span className="hand gallery__title">{item.title}</span>
        </span>
        <span className="visually-hidden">, open larger</span>
      </button>
    </li>
  )
}

export default function Gallery() {
  const ref = useRef<HTMLElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const reduced = useReducedMotion()
  const instant = reduced || typeof IntersectionObserver === 'undefined'
  const [filter, setFilter] = useState<Filter>('all')
  const [index, setIndex] = useState<number | null>(null)

  const shown = filter === 'all' ? gallery : gallery.filter((g) => g.kind === filter)
  const current = index === null ? null : shown[index]

  useLayoutEffect(() => {
    if (!instant) ref.current?.classList.add('gallery--armed')
  }, [instant])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)'))
    if (instant) {
      items.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    items.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [instant, filter])

  const open = (i: number) => {
    setIndex(i)
    dialogRef.current?.showModal()
  }
  const close = () => dialogRef.current?.close()
  const step = (d: number) => setIndex((i) => (i === null ? i : (i + d + shown.length) % shown.length))

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (shown.length < 2) return
    if (e.key === 'ArrowRight') step(1)
    if (e.key === 'ArrowLeft') step(-1)
  }

  return (
    <section id="gallery" className="section gallery" aria-labelledby="gallery-title" ref={ref}>
      <div className="container">
        <header className="gallery__intro" data-reveal>
          <div>
            <RuleEyebrow numeral={meta?.numeral ?? 'VII'} subtitle="Gallery" className="gallery__eyebrow" />
            <h2 className="gothic gallery__title-main" id="gallery-title">
              {meta?.label ?? 'Evidence Room'}
            </h2>
            <p className="hand gallery__lede">Certificates, awards and moments, pinned to the board as proof.</p>
          </div>
          {kinds.length > 1 && (
            <div className="gallery__filters" role="group" aria-label="Filter the gallery">
              {(['all', ...kinds] as Filter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`mono gallery__filter${filter === f ? ' is-on' : ''}`}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : KIND_LABEL[f]}
                </button>
              ))}
            </div>
          )}
        </header>

        <ul className={`gallery__board${shown.length === 1 ? ' gallery__board--single' : ''}`} role="list">
          {shown.map((item, i) => (
            <Print key={item.id} item={item} n={gallery.indexOf(item)} onOpen={() => open(i)} />
          ))}
        </ul>
      </div>

      <dialog
        ref={dialogRef}
        className="gallery__viewer"
        aria-labelledby="gallery-viewer-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) close() // backdrop
        }}
        onKeyDown={onKeyDown}
        onClose={() => setIndex(null)}
      >
        {current && (
          <div className="gallery__viewer-inner">
            <header className="gallery__viewer-head">
              <div>
                <p className="mono gallery__viewer-kicker">
                  Exhibit {pad(gallery.indexOf(current) + 1)} · {KIND_ONE[current.kind]}
                  {current.date ? ` · ${current.date}` : ''}
                </p>
                <h3 className="gothic gallery__viewer-title" id="gallery-viewer-title">
                  {current.title}
                </h3>
              </div>
              <button type="button" className="gallery__viewer-close" onClick={close}>
                <span aria-hidden="true">×</span>
                <span className="visually-hidden">Close</span>
              </button>
            </header>
            <div className="gallery__viewer-stage">
              <picture>
                <source type="image/webp" srcSet={asset(current.webp)} />
                <img className="gallery__viewer-img" src={asset(current.jpg)} alt={current.alt} width={current.width} height={current.height} />
              </picture>
              {shown.length > 1 && (
                <>
                  <button type="button" className="gallery__nav gallery__nav--prev" onClick={() => step(-1)}>
                    <span aria-hidden="true">‹</span>
                    <span className="visually-hidden">Previous photo</span>
                  </button>
                  <button type="button" className="gallery__nav gallery__nav--next" onClick={() => step(1)}>
                    <span aria-hidden="true">›</span>
                    <span className="visually-hidden">Next photo</span>
                  </button>
                </>
              )}
            </div>
            <footer className="gallery__viewer-foot">
              {current.caption && <p className="gallery__viewer-caption">{current.caption}</p>}
              <div className="gallery__viewer-actions">
                {shown.length > 1 && (
                  <span className="mono gallery__count" aria-live="polite">
                    {index! + 1} / {shown.length}
                  </span>
                )}
                {current.pdf && (
                  <a className="mono gallery__pdf" href={asset(current.pdf)} target="_blank" rel="noopener noreferrer">
                    Open the PDF ↗<span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  )
}
