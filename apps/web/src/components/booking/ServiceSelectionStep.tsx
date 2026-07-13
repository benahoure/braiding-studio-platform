import { Check, Clock, Star } from 'lucide-react'

import { formatDuration } from '../../lib/format'
import { resolveServiceImage, resolveServiceImageAlt } from '../../lib/serviceImages'
import type { SalonService } from '../../types'
import { BOOKING_CATEGORIES, dollars } from './bookingConfig'

// Step 1 — choose one service. Real services from the services API; category
// groups with no bookable services are hidden automatically.

interface ServiceSelectionStepProps {
  services: SalonService[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  categoryId: string
  serviceId: string
  onCategorySelect: (categoryId: string) => void
  onServiceSelect: (serviceId: string) => void
  error?: string
}

export function ServiceSelectionStep({
  services,
  isLoading,
  isError,
  onRetry,
  categoryId,
  serviceId,
  onCategorySelect,
  onServiceSelect,
  error,
}: ServiceSelectionStepProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-40 animate-pulse rounded-2xl bg-cream-deep" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 p-8 text-center">
        <p className="text-sm font-semibold text-espresso">We couldn&rsquo;t load the service menu.</p>
        <p className="mt-1 text-xs text-mocha/60">Please check your connection and try again.</p>
        <button type="button" onClick={onRetry} className="btn btn-outline mt-4">
          Try Again
        </button>
      </div>
    )
  }

  const activeServices = (services ?? []).filter((s) => s.active)
  const visibleCategories = BOOKING_CATEGORIES.filter((cat) =>
    activeServices.some((s) => cat.serviceCategories.includes(s.category)),
  )
  const categoryServices = activeServices.filter((s) => {
    const cat = BOOKING_CATEGORIES.find((c) => c.id === categoryId)
    return cat ? cat.serviceCategories.includes(s.category) : false
  })

  return (
    <div className="grid gap-6">
      {/* ── Category picker ── */}
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">Choose a Category</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {visibleCategories.map((cat) => {
            const count = activeServices.filter((s) => cat.serviceCategories.includes(s.category)).length
            const isActive = categoryId === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onCategorySelect(cat.id)}
                className={`rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-gold bg-gold-pale/20 shadow-[0_4px_20px_rgba(191,161,74,0.16)]'
                    : 'border-cream-border bg-paper hover:border-gold/50'
                }`}
              >
                <p className="font-display text-lg font-semibold text-espresso">{cat.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-mocha/70">{cat.tagline}</p>
                <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-gold-dark">
                  {count} {count === 1 ? 'style' : 'styles'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Service cards ── */}
      {categoryId && (
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">Choose Your Style</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {categoryServices.map((service) => {
              const isSelected = service.serviceId === serviceId
              return (
                <button
                  key={service.serviceId}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onServiceSelect(service.serviceId)}
                  className={`relative flex min-h-[10rem] overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-gold shadow-[0_8px_32px_rgba(191,161,74,0.22)]'
                      : 'border-cream-border bg-paper hover:border-gold/50 hover:shadow-soft'
                  }`}
                >
                  {/* Image — compact card with a portrait side-slot: the slot's
                      shape matches the braid photos, so they fill it perfectly
                      without bands and with minimal cropping. */}
                  <div className="relative w-28 shrink-0 self-stretch overflow-hidden bg-cream-deep sm:w-32">
                    <img
                      src={resolveServiceImage(service)}
                      alt={resolveServiceImageAlt(service)}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: service.imagePosition ?? 'top center' }}
                      onError={(e) => {
                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    {isSelected && (
                      <span
                        className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-espresso shadow-sm"
                        aria-hidden="true"
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className={`flex flex-1 flex-col p-4 ${isSelected ? 'bg-gold-pale/15' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-lg font-semibold leading-tight text-espresso">
                        {service.name}
                      </p>
                      {service.featured && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[0.6rem] font-semibold text-gold-dark">
                          <Star size={8} fill="currentColor" aria-hidden="true" />
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-mocha/70">
                      {service.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-cream-border pt-2.5">
                      <span className="text-sm font-bold text-espresso">From {dollars(service.startingPrice)}</span>
                      <span className="inline-flex items-center gap-1 text-[0.7rem] text-mocha/60">
                        <Clock size={11} aria-hidden="true" />
                        {formatDuration(service.durationMinutes)}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
