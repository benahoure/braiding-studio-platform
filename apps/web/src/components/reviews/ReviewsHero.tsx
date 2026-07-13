import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import { ringOffset, ringPose } from '../ui/carouselPose'
import type { Review, ReviewAggregates } from '../../types'

// Reviews hero — split layout matching the Services hero: copy + aggregate on
// the left, a horizon-style 3D carousel of client review cards on the right
// (flat-facing center card, neighbours rotated into depth, arrows + dots).

const AUTO_ROTATE_MS = 6000
const CARD_COUNT = 6

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 2)
    .toUpperCase()
}

function Stars({ count, size = 13 }: { count: number; size?: number }) {
  return (
    <div className="flex gap-1" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < count ? 'var(--gold)' : 'transparent'}
          style={{ color: i < count ? 'var(--gold)' : 'rgba(251,247,242,0.25)' }}
        />
      ))}
    </div>
  )
}

function ReviewCard3D({
  review,
  r,
  reducedMotion,
}: {
  review: Review
  r: number
  reducedMotion: boolean
}) {
  const pose = ringPose(r)
  const isFront = r === 0

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        width: 'min(15rem, 62vw)',
        marginLeft: 'calc(min(15rem, 62vw) / -2)',
        pointerEvents: isFront ? 'auto' : 'none',
      }}
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
      <article
        className="overflow-hidden rounded-2xl"
        style={{
          background: '#1A1712',
          border: '1px solid rgba(191,161,74,0.28)',
          boxShadow: isFront
            ? '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(191,161,74,0.15)'
            : '0 12px 30px rgba(0,0,0,0.45)',
        }}
      >
        {/* Quote header — honest, no stock photography */}
        <div
          className="relative overflow-hidden px-4 pb-3 pt-4"
          style={{ background: 'linear-gradient(160deg, #221C11 0%, #17130C 70%)' }}
        >
          <Quote
            size={72}
            aria-hidden="true"
            className="absolute -right-3 -top-4"
            style={{ color: 'rgba(191,161,74,0.1)' }}
          />
          <div className="relative flex items-center justify-between">
            <Stars count={review.rating} />
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.1em]"
              style={{ background: 'rgba(191,161,74,0.12)', border: '1px solid rgba(191,161,74,0.3)', color: 'var(--gold-light)' }}
            >
              Verified Client
            </span>
          </div>
          {review.serviceName && (
            <p className="relative mt-2 font-display text-base" style={{ color: 'var(--cream)' }}>
              {review.serviceName}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="p-4 text-left">
          <p
            className="line-clamp-5 min-h-[7rem]"
            style={{ fontSize: '0.84rem', lineHeight: 1.7, color: 'rgba(251,247,242,0.78)' }}
          >
            {review.body}
          </p>
          <div className="mt-3 flex items-center gap-2.5 border-t pt-3" style={{ borderColor: 'rgba(251,247,242,0.1)' }}>
            {review.avatarUrl ? (
              <img
                src={review.avatarUrl}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-semibold"
                style={{ background: 'var(--gold)', color: 'var(--onyx)' }}
              >
                {initialsOf(review.clientName)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium" style={{ color: 'var(--cream)' }}>
                {review.clientName}
              </span>
              <span className="block truncate text-[0.66rem]" style={{ color: 'rgba(251,247,242,0.45)' }}>
                Braids by Deb client
              </span>
            </span>
          </div>
        </div>
      </article>
    </motion.div>
  )
}

interface ReviewsHeroProps {
  reviews: Review[]
  aggregates: ReviewAggregates | undefined
  googleReviewUrl?: string | null
  onLeaveReview: () => void
}

export function ReviewsHero({ reviews, aggregates, googleReviewUrl, onLeaveReview }: ReviewsHeroProps) {
  const reducedMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const featured = useMemo(() => reviews.slice(0, CARD_COUNT), [reviews])
  const count = featured.length

  const go = useCallback(
    (dir: 1 | -1) => setActive((a) => (count ? (a + dir + count) % count : 0)),
    [count],
  )

  useEffect(() => {
    if (reducedMotion || paused || count < 2) return
    const id = window.setInterval(() => go(1), AUTO_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion, paused, count, go])

  return (
    <section className="relative overflow-hidden pb-12 md:pb-14" style={{ background: 'var(--onyx)' }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-0 h-80 w-80 rounded-full"
        style={{ background: 'var(--gold)', opacity: 0.05, filter: 'blur(100px)' }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pt-10 md:pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-4">
        {/* ── Left: copy + aggregate + CTAs ── */}
        <div className="text-center lg:text-left">
          <p className="section-label mb-2.5">Client Love</p>
          <h1
            className="font-display font-light"
            style={{ fontSize: 'clamp(2.4rem, 5.2vw, 3.9rem)', color: 'var(--cream)', lineHeight: 1.08 }}
          >
            The chair speaks for itself
          </h1>
          <div className="divider-gold !mx-auto !my-4 lg:!mx-0" />

          {aggregates && aggregates.totalCount > 0 && (
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <span
                className="font-display font-light"
                style={{ fontSize: '2.6rem', color: 'var(--gold-light)', lineHeight: 1 }}
              >
                {aggregates.averageRating.toFixed(1)}
              </span>
              <span className="flex flex-col items-start gap-1">
                <Stars count={Math.round(aggregates.averageRating)} />
                <span style={{ fontSize: '0.78rem', color: 'rgba(251,247,242,0.5)' }}>
                  {aggregates.totalCount} client {aggregates.totalCount === 1 ? 'review' : 'reviews'}
                </span>
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <button type="button" onClick={onLeaveReview} className="btn-gold px-8">
              Leave a Review
            </button>
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline px-8"
                style={{ borderColor: 'rgba(251,247,242,0.24)', color: 'rgba(251,247,242,0.82)' }}
              >
                Review on Google
              </a>
            )}
          </div>
        </div>

        {/* ── Right: horizon 3D carousel of reviews ── */}
        {count > 0 && (
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div
              className="relative mx-auto h-[380px] w-full max-w-xl sm:h-[400px]"
              style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
              role="group"
              aria-roledescription="carousel"
              aria-label="Client reviews"
            >
              {featured.map((review, i) => (
                <ReviewCard3D
                  key={review.reviewId}
                  review={review}
                  r={ringOffset(i, active, count)}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>

            {/* Arrows */}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous review"
              className="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-gold/20"
              style={{ border: '1px solid rgba(191,161,74,0.35)', color: 'var(--gold-light)', background: 'rgba(17,17,17,0.6)' }}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next review"
              className="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition-colors hover:bg-gold/20"
              style={{ border: '1px solid rgba(191,161,74,0.35)', color: 'var(--gold-light)', background: 'rgba(17,17,17,0.6)' }}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>

            {/* Dots */}
            <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label="Choose a review">
              {featured.map((review, i) => (
                <button
                  key={review.reviewId}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show review from ${review.clientName}`}
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
