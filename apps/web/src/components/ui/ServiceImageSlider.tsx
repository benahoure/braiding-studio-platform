import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useReducedMotion } from '../../hooks/useReducedMotion'

// Crossfade photo slider for a service's gallery (up to 4 angles of a style).
// No autoplay — discoverability comes from quiet affordances instead: a
// "1 / 3" count chip, gold dots, ghost arrows on desktop, and a one-time
// slide-hint nudge when the card first scrolls into view (skipped for
// reduced-motion visitors).

const SWIPE_THRESHOLD_PX = 40

interface ServiceImageSliderProps {
  slides: string[]
  alt: string
  objectPosition?: string
  /** Sizing classes only (e.g. "h-full w-full"). Never pass position classes:
      the root is position:relative for its children, and Tailwind's rule
      order makes a passed `absolute` lose — collapsing the slider to 0 height. */
  className?: string
  /** Fires on tap/Enter on the photo itself (e.g. open the lightbox). */
  onImageActivate?: (index: number) => void
  activateLabel?: string
  /** Cover image failed to load and no other photo is left to show. */
  onAllImagesFailed?: () => void
}

export function ServiceImageSlider({
  slides,
  alt,
  objectPosition = 'top center',
  className = '',
  onImageActivate,
  activateLabel,
  onAllImagesFailed,
}: ServiceImageSliderProps) {
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const [hintPlaying, setHintPlaying] = useState(false)
  const hintDone = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const live = slides.filter((url) => !failed.has(url))
  const count = live.length
  const active = Math.min(index, Math.max(count - 1, 0))

  useEffect(() => {
    if (count === 0) onAllImagesFailed?.()
  }, [count, onAllImagesFailed])

  // One-time "you can slide this" nudge when the card first becomes visible.
  useEffect(() => {
    if (count < 2 || reducedMotion || hintDone.current) return
    const el = rootRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      hintDone.current = true
      setHintPlaying(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hintDone.current) return
        hintDone.current = true
        setHintPlaying(true)
        observer.disconnect()
      },
      { threshold: 0.6 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [count, reducedMotion])

  if (count === 0) return null

  const goTo = (i: number) => {
    setHintPlaying(false) // the visitor got it — never fight their gesture
    setIndex(((i % count) + count) % count)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current
    touchStartX.current = null
    if (startX === null || count < 2) return
    const delta = e.changedTouches[0].clientX - startX
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
    goTo(delta < 0 ? active + 1 : active - 1)
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden ${className}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* The nudge translates this stack wrapper, so it never conflicts
          with the active image's own hover-scale transform. */}
      <div
        className={`absolute inset-0 ${hintPlaying ? 'slide-hint' : ''}`}
        onAnimationEnd={() => setHintPlaying(false)}
      >
        {live.map((url, i) => {
          const isActive = i === active
          return (
            <img
              key={url}
              src={url}
              alt={count > 1 ? `${alt} — photo ${i + 1} of ${count}` : alt}
              loading="lazy"
              onError={() => setFailed((prev) => new Set(prev).add(url))}
              className="absolute inset-0 h-full w-full transition-all duration-700 hover:scale-105"
              style={{
                objectFit: 'cover',
                objectPosition,
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? undefined : 'none',
                cursor: isActive && onImageActivate ? 'zoom-in' : undefined,
              }}
              {...(isActive && onImageActivate
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': activateLabel ?? `View ${alt} photo`,
                    onClick: () => onImageActivate(active),
                    onKeyDown: (e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onImageActivate(active)
                      }
                      if (e.key === 'ArrowRight') goTo(active + 1)
                      if (e.key === 'ArrowLeft') goTo(active - 1)
                    },
                  }
                : { 'aria-hidden': !isActive || undefined })}
            />
          )
        })}
      </div>

      {count > 1 && (
        <>
          {/* Photo count chip — same glass-pill language as the Popular badge */}
          <div
            className="pointer-events-none absolute bottom-2.5 right-2.5 px-2 py-0.5 text-[0.62rem] font-medium tabular-nums"
            style={{
              background: 'rgba(17,17,17,0.72)',
              color: 'var(--gold-light, #D4B86A)',
              backdropFilter: 'blur(6px)',
              borderRadius: '50px',
              letterSpacing: '0.08em',
            }}
          >
            {active + 1} / {count}
          </div>

          {/* Desktop ghost arrows — mobile slides by swipe */}
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              stop(e)
              goTo(active - 1)
            }}
            className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100 md:flex"
            style={{ background: 'rgba(17,17,17,0.38)', color: 'var(--cream, #FBF7F2)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              stop(e)
              goTo(active + 1)
            }}
            className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100 md:flex"
            style={{ background: 'rgba(17,17,17,0.38)', color: 'var(--cream, #FBF7F2)', backdropFilter: 'blur(4px)' }}
          >
            <ChevronRight size={17} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {live.map((url, i) => (
              <button
                key={url}
                type="button"
                aria-label={`Photo ${i + 1} of ${count}`}
                aria-current={i === active || undefined}
                onClick={(e) => {
                  stop(e)
                  goTo(i)
                }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === active ? '14px' : '6px',
                  height: '6px',
                  background: i === active ? 'var(--gold-light, #D4B86A)' : 'rgba(251,247,242,0.65)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                }}
              />
            ))}
          </div>

          {/* Announce slide changes to screen readers without visual noise */}
          <span className="sr-only" aria-live="polite">
            Photo {active + 1} of {count}
          </span>
        </>
      )}
    </div>
  )
}
