import { motion } from 'framer-motion'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import type { PortfolioItem } from '../../types'

// Gallery hero — Deb's work fanned into a bottom arc of photo cards with
// spring entrances, subtle mouse parallax, and a 3D flip-to-book interaction.
// Inspired by scroll-morph arc heroes, adapted to the site's restrained
// luxury language: static-friendly, touch-friendly, reduced-motion-safe.

const DESKTOP_CARDS = 9
const MOBILE_CARDS = 5

interface ArcCard {
  item: PortfolioItem
  /** 0..1 position along the arc */
  t: number
}

function ArcFlipCard({
  card,
  index,
  parallaxX,
  reducedMotion,
}: {
  card: ArcCard
  index: number
  parallaxX: number
  reducedMotion: boolean
}) {
  const [flipped, setFlipped] = useState(false)
  const { item, t } = card

  // Rainbow arch: middle cards rise, edge cards sit lower and fan outward.
  const centered = 2 * t - 1 // -1..1
  const lift = 1 - centered * centered // 0 at edges, 1 at center
  const rotation = centered * 16
  const depth = (index % 3) + 1

  return (
    <div
      className="absolute bottom-0"
      style={{
        left: `calc(${6 + t * 88}% - 44px)`,
        transform: `translateY(${-14 - lift * 58}px) rotate(${rotation}deg)`,
      }}
    >
      <motion.div
        initial={reducedMotion ? false : { y: 140, opacity: 0, rotate: rotation * 2 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 90, damping: 14, delay: 0.15 + index * 0.07 }
        }
        style={{
          transform: reducedMotion ? undefined : `translateX(${parallaxX * depth}px)`,
        }}
      >
        <button
          type="button"
          aria-label={`${item.title} — flip to book this style`}
          aria-pressed={flipped}
          onClick={() => setFlipped((f) => !f)}
          onMouseEnter={() => setFlipped(true)}
          onMouseLeave={() => setFlipped(false)}
          onFocus={() => setFlipped(true)}
          onBlur={() => setFlipped(false)}
          className="block"
          style={{ perspective: '600px' }}
        >
          <div
            className="relative h-24 w-[4.5rem] sm:h-32 sm:w-24 transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped && !reducedMotion ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front — the photo */}
            <div
              className="absolute inset-0 overflow-hidden rounded-xl"
              style={{
                backfaceVisibility: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(191,161,74,0.35)',
              }}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover"
                style={{ objectPosition: 'top center' }}
              />
            </div>
            {/* Back — book this style */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 text-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(160deg, #1A160E 0%, #111111 60%)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(191,161,74,0.55)',
                ...(reducedMotion && flipped ? { transform: 'none', zIndex: 1 } : {}),
              }}
            >
              <span
                className="line-clamp-2 text-[0.55rem] font-semibold uppercase tracking-[0.1em]"
                style={{ color: 'var(--gold-light)' }}
              >
                {item.title}
              </span>
              <Link
                to={`/booking?style=${item.styleId}`}
                className="rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.08em]"
                style={{ background: 'var(--gold)', color: 'var(--onyx)' }}
                onClick={(e) => e.stopPropagation()}
              >
                Book →
              </Link>
            </div>
          </div>
        </button>
      </motion.div>
    </div>
  )
}

interface ArcGalleryHeroProps {
  items: PortfolioItem[]
}

export function ArcGalleryHero({ items }: ArcGalleryHeroProps) {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const [parallaxX, setParallaxX] = useState(0)

  const cards: ArcCard[] = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const count = Math.min(items.length, isMobile ? MOBILE_CARDS : DESKTOP_CARDS)
    const chosen = items.slice(0, count)
    return chosen.map((item, i) => ({ item, t: count === 1 ? 0.5 : i / (count - 1) }))
  }, [items])

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (reducedMotion) return
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const normalized = ((event.clientX - rect.left) / rect.width) * 2 - 1 // -1..1
      setParallaxX(normalized * 5)
    },
    [reducedMotion],
  )

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden"
      style={{ background: 'var(--onyx)' }}
    >
      {/* Ambient gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full"
        style={{ background: 'var(--gold)', opacity: 0.06, filter: 'blur(90px)' }}
      />

      <div className="relative mx-auto max-w-3xl px-6 pb-56 pt-10 text-center sm:pb-64 md:pt-14">
        <p className="section-label mb-2.5">Our Work</p>
        <h1
          className="font-display font-light"
          style={{ fontSize: 'clamp(2.4rem, 5.2vw, 3.8rem)', color: 'var(--cream)', lineHeight: 1.08 }}
        >
          Fresh Out <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>the Chair</em>
        </h1>
        <div className="divider-gold !my-4" />
        <p
          className="mx-auto max-w-md leading-relaxed"
          style={{ fontSize: '0.92rem', color: 'rgba(251,247,242,0.6)' }}
        >
          Real results, real clients. Tap a look to book it directly.
        </p>

        <div className="mt-6 flex justify-center">
          <a href="#gallery-grid" className="btn-gold px-8">
            Browse the Gallery
          </a>
        </div>
      </div>

      {/* Bottom arc of flip cards */}
      <div aria-label="Featured looks" className="pointer-events-auto absolute inset-x-0 bottom-6 mx-auto h-40 w-full max-w-4xl sm:h-44">
        {cards.map((card, i) => (
          <ArcFlipCard key={card.item.styleId} card={card} index={i} parallaxX={parallaxX} reducedMotion={reducedMotion} />
        ))}
      </div>
    </section>
  )
}
