import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import { formatDuration } from '../../lib/format'
import { resolveServiceImage, resolveServiceImageAlt } from '../../lib/serviceImages'
import { ringOffset, ringPose } from '../ui/carouselPose'
import type { SalonService } from '../../types'

// Services hero — split layout: editorial copy + CTAs on the left, a
// horizon-style 3D rotating carousel of real service cards on the right.
// Spring-driven rotateY/translateZ depth, arrows + dots, gentle auto-rotate
// (paused on hover, off under prefers-reduced-motion).

const AUTO_ROTATE_MS = 4500
const CARD_COUNT = 6

function dollars(cents: number): string {
  return `$${Math.round(cents / 100)}`
}

function CarouselCard({ service, r, reducedMotion }: { service: SalonService; r: number; reducedMotion: boolean }) {
  const pose = ringPose(r)
  const isFront = r === 0

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ width: 'min(15rem, 62vw)', marginLeft: 'calc(min(15rem, 62vw) / -2)', pointerEvents: isFront ? 'auto' : 'none' }}
      initial={false}
      animate={{
        x: pose.x,
        z: pose.z,
        rotateY: pose.rotateY,
        scale: pose.scale,
        opacity: pose.opacity,
        y: '-50%',
      }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 24 }}
      aria-hidden={!isFront}
    >
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: '#1A1712',
          border: '1px solid rgba(191,161,74,0.28)',
          boxShadow: isFront
            ? '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(191,161,74,0.15)'
            : '0 12px 30px rgba(0,0,0,0.45)',
        }}
      >
        {/* Portrait image slot — braid photos fill it edge-to-edge */}
        <div className="relative aspect-[4/5] overflow-hidden">
          <img
            src={resolveServiceImage(service)}
            alt={isFront ? resolveServiceImageAlt(service) : ''}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: service.imagePosition ?? 'top center' }}
          />
          {service.featured && (
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-cocoa/80 px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-wide text-gold-light backdrop-blur-sm">
              <Star size={8} fill="currentColor" aria-hidden="true" />
              Popular
            </span>
          )}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-16"
            style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.85), transparent)' }}
          />
        </div>

        {/* Body */}
        <div className="p-4 text-left">
          <p className="font-display text-lg font-semibold leading-tight" style={{ color: 'var(--cream)' }}>
            {service.name}
          </p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: 'var(--gold-light)' }}>
              From {dollars(service.startingPrice)}
            </span>
            <span className="inline-flex items-center gap-1 text-[0.68rem]" style={{ color: 'rgba(251,247,242,0.5)' }}>
              <Clock size={10} aria-hidden="true" />
              {formatDuration(service.durationMinutes)}
            </span>
          </div>
          <Link
            to={`/booking?service=${service.serviceId}`}
            className="mt-3 inline-block text-[0.7rem] font-bold uppercase tracking-[0.1em]"
            style={{ color: 'var(--gold)' }}
            tabIndex={isFront ? 0 : -1}
          >
            Book This Style →
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export function ServicesCarouselHero({ services }: { services: SalonService[] }) {
  const reducedMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const featured = useMemo(() => {
    const actives = services.filter((s) => s.active)
    return [
      ...actives.filter((s) => s.featured),
      ...actives.filter((s) => !s.featured).sort((a, b) => (b.bookingCount ?? 0) - (a.bookingCount ?? 0)),
    ].slice(0, CARD_COUNT)
  }, [services])

  const count = featured.length

  const go = useCallback(
    (dir: 1 | -1) => setActive((a) => (count ? (a + dir + count) % count : 0)),
    [count],
  )

  // Gentle auto-rotate — hands-off display, paused on hover/focus.
  useEffect(() => {
    if (reducedMotion || paused || count < 2) return
    const id = window.setInterval(() => go(1), AUTO_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion, paused, count, go])

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--onyx)' }}>
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full"
        style={{ background: 'var(--gold)', opacity: 0.05, filter: 'blur(100px)' }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-12 pt-10 md:pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-4">
        {/* ── Left: copy + CTAs ── */}
        <div className="text-center lg:text-left">
          <p className="section-label mb-2.5">Service Menu</p>
          <h1
            className="font-display font-light"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', color: 'var(--cream)', lineHeight: 1.08 }}
          >
            Services &{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>Pricing</em>
          </h1>
          <div className="divider-gold !mx-auto !my-4 lg:!mx-0" />
          <p
            className="mx-auto max-w-md leading-relaxed lg:mx-0"
            style={{ fontSize: '0.92rem', color: 'rgba(251,247,242,0.6)' }}
          >
            Every price includes the artistry, the care, and a style built to last. Hair length and
            density can affect final pricing — Deb confirms everything before your appointment.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link to="/booking" className="btn-gold px-8">
              Book an Appointment
            </Link>
            <a
              href="#service-menu"
              className="btn-outline px-8"
              style={{ borderColor: 'rgba(251,247,242,0.24)', color: 'rgba(251,247,242,0.82)' }}
            >
              Explore Styles
            </a>
          </div>
        </div>

        {/* ── Right: horizon 3D carousel ── */}
        {count > 0 && (
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div
              className="relative mx-auto h-[380px] w-full max-w-xl sm:h-[420px]"
              style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
              role="group"
              aria-roledescription="carousel"
              aria-label="Signature styles"
            >
              {featured.map((service, i) => (
                <CarouselCard
                  key={service.serviceId}
                  service={service}
                  r={ringOffset(i, active, count)}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>

            {/* Arrows */}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous style"
              className="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-gold/20"
              style={{ border: '1px solid rgba(191,161,74,0.35)', color: 'var(--gold-light)', background: 'rgba(17,17,17,0.6)' }}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next style"
              className="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-gold/20"
              style={{ border: '1px solid rgba(191,161,74,0.35)', color: 'var(--gold-light)', background: 'rgba(17,17,17,0.6)' }}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>

            {/* Dots */}
            <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label="Choose a style to preview">
              {featured.map((service, i) => (
                <button
                  key={service.serviceId}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show ${service.name}`}
                  aria-pressed={i === active}
                  className="flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className="block rounded-full transition-all duration-300"
                    style={{
                      width: i === active ? 22 : 7,
                      height: 7,
                      background: i === active ? 'var(--gold)' : 'rgba(251,247,242,0.25)',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
