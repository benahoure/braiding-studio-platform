import { Check, Clock, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { formatDuration } from '../../lib/format'
import { resolveServiceImage, resolveServiceImageAlt } from '../../lib/serviceImages'
import type { SalonService } from '../../types'
import {
  BOOKING_CATEGORIES,
  dollars,
  groupedStylesFor,
  priceIsExact,
  resolvedPriceCents,
  sizeLabelFor,
  type StyleGroup,
} from './bookingConfig'

// Step 1 — choose one service. Real services from the services API; category
// groups with no bookable services are hidden automatically.
//
// Categories with style families (e.g. Braids & Protective Styles) browse in
// three tiers: category → style (Boho, Box…) → size (Small/Medium/Large),
// with a photo preview of the exact selected style before continuing.
// Categories without meaningful families (e.g. Kids) keep the flat card grid.

interface ServiceSelectionStepProps {
  services: SalonService[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  categoryId: string
  serviceId: string
  lengthLabel: string
  onCategorySelect: (categoryId: string) => void
  onServiceSelect: (serviceId: string, opts?: { advance?: boolean }) => void
  onLengthSelect: (lengthLabel: string) => void
  error?: string
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">{children}</p>
}

/** Flat service card — used by categories without style families. */
function ServiceCard({
  service,
  isSelected,
  onSelect,
}: {
  service: SalonService
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`relative flex min-h-[10rem] overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
        isSelected
          ? 'border-gold shadow-[0_8px_32px_rgba(191,161,74,0.22)]'
          : 'border-cream-border bg-paper hover:border-gold/50 hover:shadow-soft'
      }`}
    >
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
      <div className={`flex flex-1 flex-col p-4 ${isSelected ? 'bg-gold-pale/15' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-lg font-semibold leading-tight text-espresso">{service.name}</p>
          {service.featured && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[0.6rem] font-semibold text-gold-dark">
              <Star size={8} fill="currentColor" aria-hidden="true" />
              Popular
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-mocha/70">{service.description}</p>
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
}

/** Length tier pills — shown when the selected service prices by length. */
function LengthPills({
  service,
  lengthLabel,
  onLengthSelect,
}: {
  service: SalonService
  lengthLabel: string
  onLengthSelect: (label: string) => void
}) {
  if (!service.lengths?.length) return null
  return (
    <div>
      <SectionLabel>Choose Your Length</SectionLabel>
      <div className="mt-3 flex flex-wrap gap-2.5" role="group" aria-label={`${service.name} lengths`}>
        {service.lengths.map((option) => {
          const isSelected = option.label === lengthLabel
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onLengthSelect(option.label)}
              className={`rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                isSelected
                  ? 'border-gold bg-gold text-espresso shadow-[0_4px_16px_rgba(191,161,74,0.35)]'
                  : 'border-cream-border bg-paper text-mocha hover:border-gold/50'
              }`}
            >
              {option.label}
              <span className={`ml-2 text-[0.7rem] font-medium ${isSelected ? 'text-espresso/70' : 'text-mocha/50'}`}>
                {dollars(option.price)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Photo preview of the exact selected service — the "be sure" moment. */
function SelectedPreview({ service, lengthLabel }: { service: SalonService; lengthLabel: string }) {
  const price = resolvedPriceCents(service, lengthLabel) ?? service.startingPrice
  const exact = priceIsExact(service, lengthLabel)
  const needsLength = Boolean(service.lengths?.length) && !exact
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-gold shadow-[0_8px_32px_rgba(191,161,74,0.22)]">
      <div className="grid sm:grid-cols-[240px_1fr]">
        {/* Fixed height on mobile, grid-stretched on desktop — deliberately no
            aspect-ratio: Safari resolves aspect-ratio + max-height by shrinking
            the width, which left a white band beside the photo. */}
        <div className="relative h-72 w-full overflow-hidden bg-cream-deep sm:h-auto">
          <img
            src={resolveServiceImage(service)}
            alt={resolveServiceImageAlt(service)}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: service.imagePosition ?? 'top center' }}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
        <div className="flex flex-col justify-center gap-2 bg-gold-pale/15 p-5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gold px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-espresso">
            <Check size={10} strokeWidth={3} aria-hidden="true" />
            Your Style
          </span>
          <p className="font-display text-2xl font-semibold leading-tight text-espresso">
            {service.name}
            {exact && lengthLabel && (
              <span className="mt-1 block text-sm font-medium text-gold-dark">{lengthLabel}</span>
            )}
          </p>
          <p className="line-clamp-3 text-xs leading-relaxed text-mocha/70">{service.description}</p>
          <div className="mt-1 flex items-center gap-4">
            <span className="text-base font-bold text-espresso">
              {exact ? dollars(price) : `From ${dollars(price)}`}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-mocha/60">
              <Clock size={12} aria-hidden="true" />
              ~{formatDuration(service.durationMinutes)}
            </span>
          </div>
          <p className="text-[0.68rem] leading-relaxed text-mocha/55">
            {exact
              ? 'Final quote can vary slightly with pattern and hair density — Deb confirms everything with you before your appointment.'
              : 'Starting price — the final quote depends on your pattern, length, and hair density. Deb confirms everything with you before your appointment.'}
          </p>
          {needsLength ? (
            <p className="mt-1 text-[0.7rem] font-semibold text-gold-dark">
              Choose a length above to see your exact price.
            </p>
          ) : (
            <p className="mt-1 text-[0.7rem] text-mocha/55">
              Looks right? Press <span className="font-semibold text-gold-dark">Continue</span> below.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function ServiceSelectionStep({
  services,
  isLoading,
  isError,
  onRetry,
  categoryId,
  serviceId,
  lengthLabel,
  onCategorySelect,
  onServiceSelect,
  onLengthSelect,
  error,
}: ServiceSelectionStepProps) {
  // Which style family (subcategory) is open — local UI state only; the
  // selected service remains the single source of truth in the wizard.
  const [activeStyle, setActiveStyle] = useState<string>('')

  const activeServices = (services ?? []).filter((s) => s.active)
  const selectedService = activeServices.find((s) => s.serviceId === serviceId)

  // A service preselected via URL (gallery / services page) opens its family.
  useEffect(() => {
    if (!activeStyle && selectedService) {
      setActiveStyle(selectedService.subcategory || `service:${selectedService.serviceId}`)
    }
  }, [activeStyle, selectedService])

  // Reset the open family when the category changes away from it.
  useEffect(() => {
    setActiveStyle((prev) => {
      if (!prev) return prev
      const cat = BOOKING_CATEGORIES.find((c) => c.id === categoryId)
      const stillValid =
        cat &&
        activeServices.some(
          (s) =>
            cat.serviceCategories.includes(s.category) &&
            (s.subcategory || `service:${s.serviceId}`) === prev,
        )
      return stillValid ? prev : ''
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId])

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

  const visibleCategories = BOOKING_CATEGORIES.filter((cat) =>
    activeServices.some((s) => cat.serviceCategories.includes(s.category)),
  )
  const categoryDef = BOOKING_CATEGORIES.find((c) => c.id === categoryId)
  const categoryServices = activeServices.filter((s) =>
    categoryDef ? categoryDef.serviceCategories.includes(s.category) : false,
  )
  const styleGroups: StyleGroup[] | null = categoryDef
    ? groupedStylesFor(categoryDef, activeServices)
    : null
  const activeGroup = styleGroups?.find((g) => g.id === activeStyle)

  const pickStyle = (group: StyleGroup) => {
    setActiveStyle(group.id)
    if (group.services.length === 1) {
      // Single style (e.g. Cornrows) — it IS the selection; preview + Continue.
      onServiceSelect(group.services[0].serviceId)
    } else if (selectedService && !group.services.some((s) => s.serviceId === serviceId)) {
      // Switching families invalidates the previous size choice.
      onServiceSelect('')
    }
  }

  return (
    <div className="grid gap-6">
      {/* ── Category picker ── */}
      <div>
        <SectionLabel>Choose a Category</SectionLabel>
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

      {/* ── Tiered browsing: style family → size ── */}
      {categoryId && styleGroups && (
        <>
          <div>
            <SectionLabel>Choose Your Style</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {styleGroups.map((group) => {
                const cover = group.services[0]
                const fromPrice = Math.min(...group.services.map((s) => s.startingPrice))
                const isActive = activeStyle === group.id
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => pickStyle(group)}
                    className={`relative overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-gold shadow-[0_8px_32px_rgba(191,161,74,0.22)]'
                        : 'border-cream-border bg-paper hover:border-gold/50 hover:shadow-soft'
                    }`}
                  >
                    <div className="relative aspect-[5/4] overflow-hidden bg-cream-deep">
                      <img
                        src={resolveServiceImage(cover)}
                        alt={group.label}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ objectPosition: cover.imagePosition ?? 'top center' }}
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      {isActive && (
                        <span
                          className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-espresso shadow-sm"
                          aria-hidden="true"
                        >
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className={`p-3 ${isActive ? 'bg-gold-pale/15' : ''}`}>
                      <p className="font-display text-base font-semibold leading-tight text-espresso">
                        {group.label}
                      </p>
                      <p className="mt-0.5 text-[0.68rem] text-mocha/60">
                        {group.services.length > 1
                          ? `${group.services.length} sizes · from ${dollars(fromPrice)}`
                          : `From ${dollars(fromPrice)}`}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Size pills + photo preview ── */}
          {activeGroup && activeGroup.services.length > 1 && (
            <div>
              <SectionLabel>Choose Your Size</SectionLabel>
              <div className="mt-3 flex flex-wrap gap-2.5" role="group" aria-label={`${activeGroup.label} sizes`}>
                {activeGroup.services.map((service) => {
                  const isSelected = service.serviceId === serviceId
                  return (
                    <button
                      key={service.serviceId}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onServiceSelect(service.serviceId)}
                      className={`rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                        isSelected
                          ? 'border-gold bg-gold text-espresso shadow-[0_4px_16px_rgba(191,161,74,0.35)]'
                          : 'border-cream-border bg-paper text-mocha hover:border-gold/50'
                      }`}
                    >
                      {sizeLabelFor(service)}
                      <span className={`ml-2 text-[0.7rem] font-medium ${isSelected ? 'text-espresso/70' : 'text-mocha/50'}`}>
                        {dollars(service.startingPrice)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedService && (
            <>
              <LengthPills service={selectedService} lengthLabel={lengthLabel} onLengthSelect={onLengthSelect} />
              <SelectedPreview service={selectedService} lengthLabel={lengthLabel} />
            </>
          )}
        </>
      )}

      {/* ── Flat grid for categories without style families (e.g. Kids) ── */}
      {categoryId && !styleGroups && (
        <>
          <div>
            <SectionLabel>Choose Your Style</SectionLabel>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {categoryServices.map((service) => (
                <ServiceCard
                  key={service.serviceId}
                  service={service}
                  isSelected={service.serviceId === serviceId}
                  // Cards with length pricing must stay on this step to pick a
                  // length; simple services keep the quick auto-advance.
                  onSelect={() =>
                    onServiceSelect(service.serviceId, { advance: !service.lengths?.length })
                  }
                />
              ))}
            </div>
          </div>
          {selectedService && selectedService.lengths?.length ? (
            <>
              <LengthPills service={selectedService} lengthLabel={lengthLabel} onLengthSelect={onLengthSelect} />
              <SelectedPreview service={selectedService} lengthLabel={lengthLabel} />
            </>
          ) : null}
        </>
      )}

      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
