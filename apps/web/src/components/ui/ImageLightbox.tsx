import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Tap-to-view image overlay for the public site (Gallery + Services).
// Portal to <body>: cards animate with transforms, which would trap
// position:fixed inside the transformed ancestor.

interface ImageLightboxProps {
  src: string
  alt: string
  title?: string
  onClose: () => void
}

export function ImageLightbox({ src, alt, title, onClose }: ImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Ref keeps the mount effect stable: callers pass inline arrows, and a
  // [onClose] dependency would re-run the effect on every parent re-render
  // (e.g. the covered tile's mouseleave), re-stealing focus each time.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      // aria-modal promises focus containment; the close button is the only
      // focusable element inside, so Tab in either direction stays on it.
      if (e.key === 'Tab') {
        e.preventDefault()
        closeRef.current?.focus()
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

  return createPortal(
    <div
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
        style={{
          background: 'rgba(255,255,255,0.08)',
          color: 'var(--gold-light, #D4B86A)',
        }}
      >
        <X size={20} />
      </button>

      {/* stopPropagation: clicking the artwork itself shouldn't dismiss */}
      <figure className="m-0 flex max-h-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt={alt}
          className="max-h-[82vh] max-w-[92vw] object-contain"
          style={{ borderRadius: '10px' }}
        />
        {title && (
          <figcaption
            className="mt-4 text-center"
            style={{
              fontSize: '0.72rem',
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--gold-light, #D4B86A)',
            }}
          >
            {title}
          </figcaption>
        )}
      </figure>
    </div>,
    document.body,
  )
}
