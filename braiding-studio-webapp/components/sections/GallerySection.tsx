'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Instagram } from 'lucide-react'
import { BUSINESS_INFO } from '@/lib/data'

function TikTokIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z" />
    </svg>
  )
}

const GALLERY_ITEMS = [
  {
    id: 1,
    src: '/images/Small Knotless Braids.jpg',
    alt: 'Small knotless braids',
    label: 'Small Knotless Braids',
    tall: true,
  },
  {
    id: 2,
    src: '/images/Medium Box Braids.jpg',
    alt: 'Medium box braids',
    label: 'Medium Box Braids',
    tall: false,
  },
  {
    id: 3,
    src: '/images/Small Boho Braids.jpg',
    alt: 'Small boho braids',
    label: 'Small Boho Braids',
    tall: false,
  },
  {
    id: 4,
    src: '/images/Funali braids.jpg',
    alt: 'Fulani braids',
    label: 'Fulani Braids',
    tall: false,
  },
  {
    id: 5,
    src: '/images/Medium Twist Boho Braids.jpg',
    alt: 'Medium twist boho braids',
    label: 'Twist Boho Braids',
    tall: true,
  },
  {
    id: 6,
    src: '/images/Goddess Conrow.jpg',
    alt: 'Goddess cornrows',
    label: 'Goddess Cornrows',
    tall: false,
  },
  {
    id: 7,
    src: '/images/Twist Braids.jpg',
    alt: 'Passion twists',
    label: 'Passion Twists',
    tall: false,
  },
  {
    id: 8,
    src: '/images/Funali Hairstyle.jpg',
    alt: 'Fulani hairstyle',
    label: 'Fulani Hairstyle',
    tall: false,
  },
  {
    id: 9,
    src: '/images/Straight Back Cornrows.jpg',
    alt: 'Straight back cornrows',
    label: 'Straight Back Cornrows',
    tall: false,
  },
]

export default function GallerySection() {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section id="gallery" className="py-24 md:py-32 pattern-bg">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Header ─────────────────────────────────── */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Our Work</p>
          <h2
            className="section-title mb-4"
            style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}
          >
            Fresh Out the Chair
          </h2>
          <div className="divider-gold" />
          <p
            className="mt-5 max-w-md mx-auto leading-relaxed"
            style={{ fontSize: '0.92rem', color: 'var(--muted)' }}
          >
            Real results, real clients. Every style reflects your personality and Deb's craft.
          </p>
        </div>

        {/* ── Masonry grid ───────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {GALLERY_ITEMS.map((item, i) => {
            const isTall = item.tall && (i === 0 || i === 4)
            return (
              <div
                key={item.id}
                className={`gallery-item cursor-pointer${isTall ? ' row-span-2' : ''}`}
                style={{
                  aspectRatio: isTall ? 'auto' : '4/5',
                  minHeight: isTall ? '440px' : '220px',
                }}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={700}
                  height={isTall ? 950 : 560}
                  className="w-full h-full transition-transform duration-500"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'top center',
                    transform: hovered === item.id ? 'scale(1.06)' : 'scale(1)',
                    borderRadius: '14px',
                  }}
                />
                <div
                  className="gallery-overlay"
                  style={{ opacity: hovered === item.id ? 1 : 0 }}
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
                    {item.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Social CTA ─────────────────────────────── */}
        <div className="text-center mt-14">
          <p
            className="mb-5"
            style={{ fontSize: '0.82rem', color: 'var(--muted)', letterSpacing: '0.04em' }}
          >
            Follow for daily inspo &amp; fresh styles
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={BUSINESS_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline flex items-center justify-center gap-2"
            >
              <Instagram size={15} />
              {BUSINESS_INFO.instagram} on Instagram
            </a>
            <a
              href={BUSINESS_INFO.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline flex items-center justify-center gap-2"
            >
              <TikTokIcon size={15} />
              {BUSINESS_INFO.tiktok} on TikTok
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
