import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

import { api } from '../../lib/api'
import type { BusinessSettings, Review } from '../../types'

// "What They're Saying" — ported from
// braiding-studio-webapp/components/sections/TestimonialsSection.tsx, backed by
// the approved-reviews API instead of hardcoded testimonials.

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 2)
    .toUpperCase()
}

function Stars({ count, size = 12 }: { count: number; size?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={size} fill="var(--gold)" style={{ color: 'var(--gold)' }} />
      ))}
    </div>
  )
}

interface TestimonialsSectionProps {
  settings: BusinessSettings
}

export function TestimonialsSection({ settings }: TestimonialsSectionProps) {
  const { data } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => api.getReviews(),
  })

  const reviews: Review[] = (data?.reviews ?? [])
    .filter((review) => review.status === 'approved')
    .slice(0, 3)
  const aggregates = data?.aggregates

  if (reviews.length === 0) return null

  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden"
      style={{ background: 'var(--blush)' }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'var(--blush-mid)', opacity: 0.25, filter: 'blur(72px)' }}
      />
      <div
        className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'var(--gold)', opacity: 0.08, filter: 'blur(60px)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* ── Header ────────────────────────────────── */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Client Love</p>
          <h2 className="section-title mb-4" style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}>
            What They&rsquo;re Saying
          </h2>
          <div className="divider-gold" />
        </div>

        {/* ── Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <div
              key={review.reviewId}
              className="flex flex-col p-7"
              style={{
                background: 'white',
                borderRadius: '20px',
                border: '1px solid rgba(196,133,110,0.18)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
              }}
            >
              {/* Stars */}
              <Stars count={review.rating} />

              {/* Quote */}
              <p
                className="flex-1 my-5"
                style={{ fontSize: '0.92rem', lineHeight: 1.75, color: 'var(--charcoal)' }}
              >
                {review.body}
              </p>

              {/* Author */}
              <div
                className="flex items-center gap-3 pt-5 border-t"
                style={{ borderColor: 'rgba(196,133,110,0.18)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ background: 'var(--onyx)', color: 'var(--gold-light)' }}
                >
                  {initialsOf(review.clientName)}
                </div>
                <div>
                  <p className="font-medium" style={{ fontSize: '0.88rem', color: 'var(--onyx)' }}>
                    {review.clientName}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    Dallas, TX{review.serviceName ? ` · ${review.serviceName}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Aggregate + all reviews ───────────────── */}
        {aggregates && aggregates.totalCount > 0 && (
          <div className="text-center mt-10">
            <div className="flex justify-center gap-1 mb-2">
              <Stars count={5} size={16} />
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              {settings.googleReviewUrl ? (
                <a
                  href={settings.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {aggregates.averageRating.toFixed(1)} · {aggregates.totalCount} reviews
                </a>
              ) : (
                <>
                  {aggregates.averageRating.toFixed(1)} · {aggregates.totalCount} reviews
                </>
              )}
            </p>
          </div>
        )}
        <div className="text-center mt-8">
          <Link to="/reviews" className="btn-outline inline-flex items-center gap-2">
            Read All Reviews
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
