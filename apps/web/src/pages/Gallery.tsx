import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { ArcGalleryHero } from '../components/gallery/ArcGalleryHero'
import { ImageLightbox } from '../components/ui/ImageLightbox'
import { ServiceImageSlider } from '../components/ui/ServiceImageSlider'
import { SocialPill } from '../components/ui/SocialIcons'
import { PageMeta } from '../components/seo/PageMeta'
import { resolveSlides } from '../lib/serviceImages'
import { api } from '../lib/api'
import { mockPortfolio } from '../lib/mockData'
import { defaultBusinessSettings } from '../lib/mockData'
import { useBusinessSettings } from '../hooks/useBusinessSettings'
import type { PortfolioItem } from '../types'

// Full gallery — every look from Deb's chair, filterable by style family,
// each one bookable directly.

const GALLERY_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Looks' },
  { value: 'knotless', label: 'Knotless' },
  { value: 'box-braids', label: 'Box Braids' },
  { value: 'boho', label: 'Boho' },
  { value: 'twists', label: 'Twists' },
  { value: 'cornrows', label: 'Cornrows' },
  { value: 'fulani', label: 'Fulani' },
  { value: 'kids', label: 'Kids' },
]

export function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('category') ?? 'all'
  const [hovered, setHovered] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<{ item: PortfolioItem; index: number } | null>(null)
  const { data: settingsData } = useBusinessSettings()
  const settings = settingsData ?? defaultBusinessSettings

  const { data } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => api.getPortfolio(),
  })
  const allItems: PortfolioItem[] =
    data?.items && data.items.length > 0 ? data.items : mockPortfolio

  const setFilter = (value: string) => {
    setSearchParams(value === 'all' ? {} : { category: value }, { replace: true })
  }

  const items = useMemo(
    () => (activeFilter === 'all' ? allItems : allItems.filter((i) => i.category === activeFilter)),
    [allItems, activeFilter],
  )

  return (
    <>
      <PageMeta
        title="Gallery | Braids by Deb — Fresh Out the Chair"
        description="Real results on real clients — knotless braids, box braids, boho braids, twists, cornrows, and Fulani styles by Deb in Dallas, TX."
        canonical="https://braidsbydeb.com/gallery"
      />

      {/* ── Arc hero — Deb's work fanned into an interactive arch ── */}
      <ArcGalleryHero items={allItems} />

      <section id="gallery-grid" className="py-12 md:py-16 pattern-bg">
        <div className="max-w-7xl mx-auto px-6">
          {/* ── Filters ─────────────────────────────── */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {GALLERY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={activeFilter === f.value}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '50px',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  border: `1.5px solid ${activeFilter === f.value ? 'var(--onyx)' : 'var(--border)'}`,
                  background: activeFilter === f.value ? 'var(--onyx)' : 'white',
                  color: activeFilter === f.value ? 'var(--gold-light)' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Grid ────────────────────────────────── */}
          {items.length === 0 ? (
            <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-2xl mb-2">No looks in this category yet</p>
              <p style={{ fontSize: '0.9rem' }}>Check back soon — Deb posts new work regularly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {items.map((item) => (
                <div key={item.styleId}>
                  {/* The slider's active img owns the button semantics (no
                      focusable children — valid). The overlay is click-through
                      (pointer-events none) so photo taps reach the slider at
                      the right index; only its Book link stays clickable. */}
                  <div
                    className="gallery-item"
                    style={{ aspectRatio: '4/5' }}
                    onMouseEnter={() => setHovered(item.styleId)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <ServiceImageSlider
                      slides={resolveSlides(item.imageUrl, item.images)}
                      alt={item.title}
                      className="h-full w-full rounded-[14px]"
                      activateLabel={`View ${item.title} photo`}
                      onImageActivate={(index) => setLightbox({ item, index })}
                    />
                    {/* Desktop hover overlay with book CTA */}
                    <div
                      className="gallery-overlay hidden md:flex flex-col !items-start justify-end gap-2"
                      style={{ opacity: hovered === item.styleId ? 1 : undefined, pointerEvents: 'none' }}
                    >
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
                      <Link
                        to={`/booking?style=${item.styleId}`}
                        className="btn-gold"
                        style={{ fontSize: '0.62rem', padding: '0.45rem 0.9rem', pointerEvents: 'auto' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Book This Style
                      </Link>
                    </div>
                  </div>
                  {/* Persistent caption + book link (primary path on touch devices) */}
                  <div className="mt-2 flex items-center justify-between gap-2 px-1">
                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--charcoal)' }}>
                      {item.title}
                    </span>
                    <Link
                      to={`/booking?style=${item.styleId}`}
                      className="py-1"
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: 'var(--gold-dark)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Book →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Social CTA ──────────────────────────── */}
          <div className="text-center mt-14">
            <p className="mb-5" style={{ fontSize: '0.82rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>
              Follow for daily inspo &amp; fresh styles
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {settings.socialLinks.instagram && (
                <SocialPill network="instagram" href={settings.socialLinks.instagram}>
                  @braided_bydebs on Instagram
                </SocialPill>
              )}
              {settings.socialLinks.tiktok && (
                <SocialPill network="tiktok" href={settings.socialLinks.tiktok}>
                  @braids_by_debs on TikTok
                </SocialPill>
              )}
            </div>
          </div>
        </div>
      </section>

      {lightbox && (
        <ImageLightbox
          images={resolveSlides(lightbox.item.imageUrl, lightbox.item.images)}
          initialIndex={lightbox.index}
          alt={lightbox.item.title}
          title={lightbox.item.title}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}
