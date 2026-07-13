import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../../lib/api'
import { SocialPill } from '../ui/SocialIcons'
import { mockPortfolio } from '../../lib/mockData'
import type { BusinessSettings, PortfolioItem } from '../../types'

// "Fresh Out the Chair" gallery — ported from
// braiding-studio-webapp/components/sections/GallerySection.tsx. Items come from
// the portfolio API (admin-managed); falls back to the built-in nine looks until
// the portfolio has content.

interface GallerySectionProps {
  settings: BusinessSettings
}

export function GallerySection({ settings }: GallerySectionProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.getPortfolio(),
  })
  const items: PortfolioItem[] =
    data?.items && data.items.length > 0 ? data.items.slice(0, 9) : mockPortfolio

  const instagramUrl = settings.socialLinks.instagram
  const tiktokUrl = settings.socialLinks.tiktok

  return (
    <section id="gallery" className="py-24 md:py-32 pattern-bg">
      <div className="max-w-7xl mx-auto px-6">
        {/* ── Header ─────────────────────────────────── */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Our Work</p>
          <h2 className="section-title mb-4" style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}>
            Fresh Out the Chair
          </h2>
          <div className="divider-gold" />
          <p
            className="mt-5 max-w-md mx-auto leading-relaxed"
            style={{ fontSize: '0.92rem', color: 'var(--muted)' }}
          >
            Real results, real clients. Every style reflects your personality and Deb&rsquo;s craft.
          </p>
        </div>

        {/* ── Masonry grid ───────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, i) => {
            const isTall = i === 0 || i === 4
            return (
              <div
                key={item.styleId}
                className={`gallery-item cursor-pointer${isTall ? ' row-span-2' : ''}`}
                style={{
                  aspectRatio: isTall ? 'auto' : '4/5',
                  minHeight: isTall ? '440px' : '220px',
                }}
                onMouseEnter={() => setHovered(item.styleId)}
                onMouseLeave={() => setHovered(null)}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full transition-transform duration-500"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'top center',
                    transform: hovered === item.styleId ? 'scale(1.06)' : 'scale(1)',
                    borderRadius: '14px',
                  }}
                />
                <div className="gallery-overlay" style={{ opacity: hovered === item.styleId ? 1 : 0 }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 500,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--gold-light)',
                    }}
                  >
                    {item.title}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── View all + social CTA ──────────────────── */}
        <div className="text-center mt-12">
          <Link to="/gallery" className="btn-primary inline-flex items-center gap-2">
            View Full Gallery
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="text-center mt-10">
          <p
            className="mb-5"
            style={{ fontSize: '0.82rem', color: 'var(--muted)', letterSpacing: '0.04em' }}
          >
            Follow for daily inspo &amp; fresh styles
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {instagramUrl && (
              <SocialPill network="instagram" href={instagramUrl}>
                @braided_bydebs on Instagram
              </SocialPill>
            )}
            {tiktokUrl && (
              <SocialPill network="tiktok" href={tiktokUrl}>
                @braids_by_debs on TikTok
              </SocialPill>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
