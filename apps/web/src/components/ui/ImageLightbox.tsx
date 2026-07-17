import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Tap-to-view image overlay for the public site (Gallery + Services) and the
// admin services list. Supports a single photo (src) or a browsable gallery
// (images + initialIndex). Portal to <body>: cards animate with transforms,
// which would trap position:fixed inside the transformed ancestor.

interface ImageLightboxProps {
  /** Single-photo mode. Ignored when `images` is provided. */
  src?: string
  /** Gallery mode: all photos of the subject, browsable with arrows/keys. */
  images?: string[]
  initialIndex?: number
  alt: string
  title?: string
  onClose: () => void
}

export function ImageLightbox({ src, images, initialIndex = 0, alt, title, onClose }: ImageLightboxProps) {
  const photos = images && images.length > 0 ? images : src ? [src] : []
  const count = photos.length

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0)))

  // Refs keep the mount effect stable: callers pass inline arrows, and a
  // [onClose] dependency would re-run the effect on every parent re-render
  // (e.g. the covered tile's mouseleave), re-stealing focus each time.
  const onCloseRef = useRef(onClose)
  const countRef = useRef(count)
  useEffect(() => {
    onCloseRef.current = onClose
    countRef.current = count
  }, [onClose, count])

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'ArrowRight' && countRef.current > 1) {
        setIndex((i) => (i + 1) % countRef.current)
      }
      if (e.key === 'ArrowLeft' && countRef.current > 1) {
        setIndex((i) => (i - 1 + countRef.current) % countRef.current)
      }
      // aria-modal promises focus containment: cycle Tab through the
      // dialog's own buttons (close + gallery arrows) and nothing else.
      if (e.key === 'Tab') {
        e.preventDefault()
        const buttons = Array.from(dialogRef.current?.querySelectorAll('button') ?? [])
        if (buttons.length === 0) return
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
        const next = e.shiftKey
          ? (at - 1 + buttons.length) % buttons.length
          : (at + 1) % buttons.length
        buttons[next].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      // Return keyboard users to the tile that opened the lightbox.
      if (trigger?.isConnected) trigger.focus()
    }
  }, [])

  if (count === 0) return null
  const active = Math.min(index, count - 1)

  const goTo = (i: number) => setIndex(((i % count) + count) % count)
  const arrowStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--gold-light, #D4B86A)',
  }

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? alt}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 motion-safe:animate-[fadeIn_0.2s_ease]"
      style={{ background: 'rgba(17,17,17,0.94)' }}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close image view"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full transition-colors"
        style={arrowStyle}
      >
        <X size={20} />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation()
              goTo(active - 1)
            }}
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors md:left-6"
            style={arrowStyle}
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation()
              goTo(active + 1)
            }}
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors md:right-6"
            style={arrowStyle}
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* stopPropagation: clicking the artwork itself shouldn't dismiss */}
      <figure className="m-0 flex max-h-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={photos[active]}
          alt={count > 1 ? `${alt} — photo ${active + 1} of ${count}` : alt}
          className="max-h-[82vh] max-w-[92vw] object-contain"
          style={{ borderRadius: '10px' }}
        />
        {(title || count > 1) && (
          <figcaption
            className="mt-4 text-center"
            style={{
              fontSize: '0.72rem',
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--gold-light, #D4B86A)',
            }}
            aria-live="polite"
          >
            {title}
            {count > 1 && <span style={{ opacity: 0.7 }}>{title ? ' · ' : ''}{active + 1} / {count}</span>}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  )
}
