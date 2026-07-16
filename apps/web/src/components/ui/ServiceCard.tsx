import { Clock, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { formatDuration } from '../../lib/format'
import { getCategoryLabel } from '../../lib/serviceCategories'
import { resolveServiceImageAlt, resolveServiceSlides } from '../../lib/serviceImages'
import { ImageLightbox } from './ImageLightbox'
import { ServiceImageSlider } from './ServiceImageSlider'
import type { SalonService } from '../../types'

// Braids by Deb service card — the card-luxury look from the original site,
// shared by the home preview and the full Services page.

function dollars(cents: number): string {
  return `$${Math.round(cents / 100)}`
}

function ServicePlaceholder({ name, category }: { name: string; category: string }) {
  return (
    <div className="service-placeholder" style={{ aspectRatio: '4/5', height: 'auto' }}>
      <p
        style={{
          fontSize: '0.6rem',
          fontWeight: 500,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--blush-dark)',
          zIndex: 1,
        }}
      >
        {category}
      </p>
      <p
        className="font-display text-center px-6"
        style={{ fontSize: '1.35rem', fontWeight: 300, color: 'var(--brown)', lineHeight: 1.2, zIndex: 1 }}
      >
        {name}
      </p>
      <div style={{ width: '28px', height: '1px', background: 'var(--gold)', opacity: 0.55, zIndex: 1 }} />
    </div>
  )
}

export function ServiceCard({ service }: { service: SalonService }) {
  // Track load failures so a broken URL degrades to the styled placeholder
  // instead of the browser's broken-image icon.
  const [imageFailed, setImageFailed] = useState(false)
  const [lightbox, setLightbox] = useState<{ open: boolean; index: number }>({ open: false, index: 0 })
  const slides = resolveServiceSlides(service)
  const familyLabel = getCategoryLabel(service.subcategory ?? service.category)

  return (
    <div className="card-luxury flex flex-col">
      {/* Photo gallery (resolved cover + up to 3 more angles). The slider's
          active image owns the button semantics — a role on this wrapper
          would nest the dot/arrow buttons inside a button. */}
      {!imageFailed ? (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: '4/5', borderRadius: '18px 18px 0 0' }}
        >
          <ServiceImageSlider
            slides={slides}
            alt={resolveServiceImageAlt(service)}
            objectPosition={service.imagePosition ?? 'top center'}
            className="absolute inset-0"
            activateLabel={`View ${service.name} photo`}
            onImageActivate={(index) => setLightbox({ open: true, index })}
            onAllImagesFailed={() => setImageFailed(true)}
          />
          {service.featured && (
            <div
              className="pointer-events-none absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[0.62rem] font-medium"
              style={{
                background: 'rgba(17,17,17,0.72)',
                color: 'var(--gold-light)',
                backdropFilter: 'blur(6px)',
                borderRadius: '50px',
              }}
            >
              <Star size={9} fill="var(--gold-light)" />
              Popular
            </div>
          )}
        </div>
      ) : (
        <div style={{ borderRadius: '18px 18px 0 0', overflow: 'hidden' }}>
          <ServicePlaceholder name={service.name} category={familyLabel} />
        </div>
      )}

      {/* Card body */}
      <div className="p-5 flex flex-col flex-1">
        <span
          className="self-start mb-3 px-2.5 py-1"
          style={{
            fontSize: '0.6rem',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            background: 'var(--blush)',
            color: 'var(--blush-dark)',
            borderRadius: '50px',
          }}
        >
          {familyLabel}
        </span>

        <h3
          className="font-display leading-tight mb-2"
          style={{ fontSize: '1.25rem', fontWeight: 400, color: 'var(--onyx)' }}
        >
          {service.name}
        </h3>

        <p className="flex-1 mb-5 leading-relaxed" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          {service.description}
        </p>

        <div className="flex items-end justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div>
            <div className="font-display font-medium" style={{ fontSize: '1.5rem', color: 'var(--onyx)' }}>
              From {dollars(service.startingPrice)}
            </div>
            <div className="flex items-center gap-1 mt-0.5" style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              <Clock size={11} />
              {formatDuration(service.durationMinutes)}
            </div>
          </div>
          <Link
            to={`/booking?service=${service.serviceId}`}
            className="btn-gold"
            style={{ fontSize: '0.7rem', padding: '0.6rem 1.1rem' }}
          >
            Book
          </Link>
        </div>
      </div>

      {lightbox.open && (
        <ImageLightbox
          images={slides}
          initialIndex={lightbox.index}
          alt={resolveServiceImageAlt(service)}
          title={service.name}
          onClose={() => setLightbox({ open: false, index: 0 })}
        />
      )}
    </div>
  )
}
