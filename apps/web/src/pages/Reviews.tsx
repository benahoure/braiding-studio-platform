import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Quote, Star } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageMeta } from '../components/seo/PageMeta'
import { ReviewsHero } from '../components/reviews/ReviewsHero'
import { ApiRequestError, api } from '../lib/api'
import { reviewSubmissionSchema } from '../lib/validators'
import { defaultBusinessSettings } from '../lib/mockData'
import { useBusinessSettings } from '../hooks/useBusinessSettings'
import { shortDate } from '../lib/format'
import type { Review } from '../types'

// Client reviews — a Braids by Deb original design: editorial quote wall with
// a gold aggregate band and an inviting leave-a-review experience.

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 2)
    .toUpperCase()
}

function Stars({ count, size = 13, dim = false }: { count: number; size?: number; dim?: boolean }) {
  return (
    <div className="flex gap-1" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < count ? 'var(--gold)' : 'transparent'}
          style={{ color: i < count ? 'var(--gold)' : dim ? 'rgba(251,247,242,0.25)' : 'var(--sand)' }}
        />
      ))}
    </div>
  )
}

// ── Marquee testimonial card — cursor-reactive glow, natural typography ──
function MarqueeCard({ review }: { review: Review }) {
  const ref = useRef<HTMLElement>(null)

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    el.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }

  return (
    <article
      ref={ref}
      onMouseMove={handleMouseMove}
      className="glow-card flex flex-col flex-shrink-0 p-6"
      style={{
        width: 'min(340px, 78vw)',
        background: 'white',
        borderRadius: '18px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <Stars count={review.rating} />
        <Quote size={18} style={{ color: 'var(--blush-mid)' }} aria-hidden="true" />
      </div>

      <p
        className="flex-1"
        style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--charcoal)' }}
      >
        {review.body}
      </p>

      <div className="flex items-center gap-3 pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
          style={{ background: 'var(--onyx)', color: 'var(--gold-light)' }}
        >
          {initialsOf(review.clientName)}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate" style={{ fontSize: '0.85rem', color: 'var(--onyx)' }}>
            {review.clientName}
          </p>
          <p className="truncate" style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            {review.serviceName ? `${review.serviceName} · ` : ''}
            {shortDate(review.createdAt)}
          </p>
        </div>
        <span
          className="ml-auto flex-shrink-0 px-2 py-0.5 rounded-full"
          style={{
            fontSize: '0.58rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'rgba(191,161,74,0.1)',
            color: 'var(--gold-dark)',
          }}
        >
          Verified
        </span>
      </div>
    </article>
  )
}

// ── Infinite marquee row — sequence rendered twice for a seamless -50% loop ──
function MarqueeRow({
  reviews,
  reverse = false,
  duration = 48,
}: {
  reviews: Review[]
  reverse?: boolean
  duration?: number
}) {
  // Pad short lists so the track is always wider than the viewport.
  const sequence: Review[] = []
  while (sequence.length < Math.max(6, reviews.length)) {
    sequence.push(...reviews)
  }

  return (
    <div className="marquee-row">
      <div
        className={`marquee-track${reverse ? ' reverse' : ''}`}
        style={{ '--marquee-duration': `${duration}s` } as React.CSSProperties}
      >
        {[...sequence, ...sequence].map((review, i) => (
          <MarqueeCard key={`${review.reviewId}-${i}`} review={review} />
        ))}
      </div>
    </div>
  )
}

// ── Star picker for the submission form ──
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [preview, setPreview] = useState(0)
  const shown = preview || value
  return (
    <div
      className="flex gap-1.5"
      role="radiogroup"
      aria-label="Your rating"
      onMouseLeave={() => setPreview(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setPreview(n)}
          className="p-1.5 transition-transform hover:scale-110"
        >
          <Star
            size={30}
            fill={n <= shown ? 'var(--gold)' : 'transparent'}
            style={{ color: n <= shown ? 'var(--gold)' : 'var(--sand)' }}
          />
        </button>
      ))}
    </div>
  )
}

export function Reviews() {
  const { data: settingsData } = useBusinessSettings()
  const settings = settingsData ?? defaultBusinessSettings
  const formRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => api.getReviews(),
  })

  const reviews: Review[] = useMemo(
    () => (data?.reviews ?? []).filter((r) => r.status === 'approved'),
    [data],
  )
  const aggregates = data?.aggregates

  // Form state
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    const parsed = reviewSubmissionSchema.safeParse({ clientName: name, rating, body, honeypot: '' })
    if (!parsed.success) {
      setFormError(
        rating === 0
          ? 'Tap the stars to choose a rating.'
          : parsed.error.issues[0]?.message ?? 'Please check your review.',
      )
      return
    }
    setSubmitting(true)
    try {
      await api.submitReview(parsed.data)
      setSubmitted(true)
    } catch (error) {
      setFormError(
        error instanceof ApiRequestError || error instanceof Error
          ? error.message
          : 'Unable to submit your review right now.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageMeta
        title="Client Reviews | Braids by Deb — Dallas, TX"
        description="Kind words from clients who trust Braids by Deb with their box braids, knotless braids, boho braids, and protective styles in Dallas."
        canonical="https://braidsbydeb.com/reviews"
      />

      {/* ── Split hero with rotating featured quote ── */}
      <ReviewsHero
        reviews={reviews}
        aggregates={aggregates}
        googleReviewUrl={settings.googleReviewUrl}
        onLeaveReview={scrollToForm}
      />

      {/* ── Marquee testimonial rows ───────────────── */}
      <section className="py-16 md:py-20 pattern-bg overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
            <div className="spinner mx-auto mb-4" />
            Loading reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto px-6">
            <p className="font-display text-3xl mb-3" style={{ color: 'var(--onyx)' }}>
              Be the first
            </p>
            <p style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>
              Reviews from Deb&rsquo;s clients will appear here. Sat in the chair recently? Share
              your experience below.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <MarqueeRow
              reviews={reviews.filter((_, i) => i % 2 === 0)}
              duration={52}
            />
            {reviews.length > 1 && (
              <MarqueeRow
                reviews={reviews.filter((_, i) => i % 2 === 1)}
                reverse
                duration={64}
              />
            )}
          </div>
        )}
      </section>

      {/* ── Leave a review ─────────────────────────── */}
      <section className="py-16 md:py-24" style={{ background: 'var(--cream)' }} id="leave-a-review">
        <div className="max-w-5xl mx-auto px-6" ref={formRef}>
          <div
            className="grid grid-cols-1 lg:grid-cols-[380px_1fr] overflow-hidden"
            style={{ borderRadius: '24px', boxShadow: '0 18px 60px rgba(0,0,0,0.1)' }}
          >
            {/* Left panel */}
            <div className="p-8 sm:p-10 flex flex-col justify-center" style={{ background: 'var(--onyx)' }}>
              <p className="section-label mb-3">Share Your Experience</p>
              <h2
                className="font-display font-light mb-4"
                style={{ fontSize: 'clamp(1.8rem, 3.4vw, 2.5rem)', color: 'var(--cream)', lineHeight: 1.15 }}
              >
                Fresh out the chair?
              </h2>
              <p className="mb-6" style={{ fontSize: '0.9rem', color: 'rgba(251,247,242,0.55)', lineHeight: 1.7 }}>
                Your words help other women trust their crown to Deb. Reviews are published after a
                quick approval.
              </p>
              <p className="font-display italic" style={{ fontSize: '1rem', color: 'var(--gold-light)' }}>
                Braided with precision. Timeless confidence.
              </p>
            </div>

            {/* Form panel */}
            <div className="p-8 sm:p-10" style={{ background: 'white' }}>
              {submitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <CheckCircle size={44} style={{ color: 'var(--gold)' }} className="mb-4" />
                  <h3 className="font-display text-2xl mb-2" style={{ color: 'var(--onyx)' }}>
                    Thank you!
                  </h3>
                  <p className="max-w-xs" style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
                    Your review has been received and will appear once approved.
                  </p>
                  <Link to="/booking" className="btn-gold mt-8">
                    Book Your Next Style
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                  <div>
                    <p
                      className="mb-2"
                      style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brown)' }}
                    >
                      Your Rating *
                    </p>
                    <StarPicker value={rating} onChange={setRating} />
                  </div>

                  <div>
                    <label
                      htmlFor="review-name"
                      className="block mb-1.5"
                      style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brown)' }}
                    >
                      Your Name *
                    </label>
                    <input
                      id="review-name"
                      type="text"
                      autoComplete="name"
                      className="input-luxury"
                      placeholder="First name & last initial — e.g. Amara T."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="review-body"
                      className="block mb-1.5"
                      style={{ fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--brown)' }}
                    >
                      Your Review *
                    </label>
                    <textarea
                      id="review-body"
                      rows={5}
                      className="input-luxury resize-none"
                      placeholder="How was your style, your experience, your crown?"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={1000}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-gold w-full sm:w-auto px-10 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="spinner" />
                        Submitting…
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </button>

                  {formError && (
                    <p className="text-sm" style={{ color: '#C0392B' }} role="alert">
                      {formError}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
