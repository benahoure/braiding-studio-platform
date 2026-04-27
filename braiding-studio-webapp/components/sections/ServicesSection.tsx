'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Star, Search } from 'lucide-react'
import { SERVICES, SERVICE_CATEGORIES, formatDuration } from '@/lib/data'
import { ServiceCategory } from '@/types'

function ServicePlaceholder({ name, category }: { name: string; category: string }) {
  return (
    <div className="service-placeholder" style={{ aspectRatio: '4/5', height: 'auto' }}>
      <p
        style={{
          fontSize: '0.6rem',
          fontWeight: 500,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--blush-dark)',
          zIndex: 1,
        }}
      >
        {category}
      </p>
      <p
        className="font-display text-center px-6"
        style={{
          fontSize: '1.35rem',
          fontWeight: 300,
          color: 'var(--brown)',
          lineHeight: 1.2,
          zIndex: 1,
        }}
      >
        {name}
      </p>
      <div
        style={{
          width: '28px',
          height: '1px',
          background: 'var(--gold)',
          opacity: 0.55,
          zIndex: 1,
        }}
      />
    </div>
  )
}

export default function ServicesSection() {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | 'All'>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = SERVICES.filter(service => {
    const matchesCategory = activeCategory === 'All' || service.category === activeCategory
    const matchesSearch =
      searchQuery === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <section id="services" className="py-24 md:py-32" style={{ background: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Header ────────────────────────────────── */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Protective Styles</p>
          <h2 className="section-title mb-4" style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}>
            Our Services
          </h2>
          <div className="divider-gold" />
          <p
            className="mt-5 max-w-lg mx-auto leading-relaxed"
            style={{ fontSize: '0.95rem', color: 'var(--muted)' }}
          >
            Every style is performed with patience, precision, and deep care for your
            hair health. Your crown is in good hands.
          </p>
        </div>

        {/* ── Search ────────────────────────────────── */}
        <div className="relative max-w-sm mx-auto mb-7">
          <Search
            size={14}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted)' }}
          />
          <input
            type="text"
            placeholder="Search styles…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-luxury pl-10"
            style={{ borderRadius: '50px', paddingLeft: '2.5rem' }}
          />
        </div>

        {/* ── Category filters ───────────────────────── */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {(['All', ...SERVICE_CATEGORIES] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0.45rem 1.1rem',
                borderRadius: '50px',
                fontSize: '0.72rem',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border: `1.5px solid ${activeCategory === cat ? 'var(--onyx)' : 'var(--border)'}`,
                background: activeCategory === cat ? 'var(--onyx)' : 'white',
                color: activeCategory === cat ? 'var(--gold-light)' : 'var(--muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Grid ──────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
            <p className="font-display text-2xl mb-2">No services found</p>
            <p style={{ fontSize: '0.9rem' }}>Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(service => (
              <div key={service.id} className="card-luxury flex flex-col">

                {/* Image or placeholder */}
                {service.image ? (
                  <div
                    className="relative w-full overflow-hidden"
                    style={{ aspectRatio: '4/5', borderRadius: '18px 18px 0 0' }}
                  >
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="transition-transform duration-500 hover:scale-105"
                      style={{ objectFit: 'cover', objectPosition: 'top center' }}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {service.popular && (
                      <div
                        className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[0.62rem] font-medium"
                        style={{
                          background: 'rgba(17,17,17,0.72)',
                          color: 'var(--gold-light)',
                          backdropFilter: 'blur(6px)',
                          borderRadius: '50px',
                        }}
                      >
                        <Star size={9} fill="var(--gold-light)" />
                        Popular
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ borderRadius: '18px 18px 0 0', overflow: 'hidden' }}>
                    <ServicePlaceholder name={service.name} category={service.category} />
                    {service.popular && (
                      <div
                        className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[0.62rem] font-medium"
                        style={{
                          background: 'rgba(17,17,17,0.62)',
                          color: 'var(--gold-light)',
                          backdropFilter: 'blur(6px)',
                          borderRadius: '50px',
                          zIndex: 2,
                        }}
                      >
                        <Star size={9} fill="var(--gold-light)" />
                        Popular
                      </div>
                    )}
                  </div>
                )}

                {/* Card body */}
                <div className="p-5 flex flex-col flex-1">
                  {/* Category tag */}
                  <span
                    className="self-start mb-3 px-2.5 py-1"
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      background: 'var(--blush)',
                      color: 'var(--blush-dark)',
                      borderRadius: '50px',
                    }}
                  >
                    {service.category}
                  </span>

                  {/* Name */}
                  <h3
                    className="font-display leading-tight mb-2"
                    style={{ fontSize: '1.25rem', fontWeight: 400, color: 'var(--onyx)' }}
                  >
                    {service.name}
                  </h3>

                  {/* Description */}
                  <p
                    className="flex-1 mb-5 leading-relaxed"
                    style={{ fontSize: '0.85rem', color: 'var(--muted)' }}
                  >
                    {service.description}
                  </p>

                  {/* Price + CTA */}
                  <div className="flex items-end justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <div
                        className="font-display font-medium"
                        style={{ fontSize: '1.5rem', color: 'var(--onyx)' }}
                      >
                        ${service.price}
                      </div>
                      <div
                        className="flex items-center gap-1 mt-0.5"
                        style={{ fontSize: '0.75rem', color: 'var(--muted)' }}
                      >
                        <Clock size={11} />
                        {formatDuration(service.duration)}
                      </div>
                    </div>
                    <Link
                      href={`/booking?service=${service.id}`}
                      className="btn-gold py-2 px-4"
                      style={{ fontSize: '0.7rem', padding: '0.5rem 1rem' }}
                    >
                      Book
                    </Link>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

        {/* ── Deposit notice ─────────────────────────── */}
        <div
          className="mt-12 max-w-md mx-auto text-center py-4 px-6"
          style={{
            background: 'var(--blush)',
            borderRadius: '14px',
            fontSize: '0.85rem',
            color: 'var(--charcoal)',
          }}
        >
          <strong>$50 non-refundable deposit</strong> secures all appointments.
          &nbsp;Bank Card · Zelle · CashApp
        </div>

        <div className="text-center mt-7">
          <Link href="/booking" className="btn-primary">
            Book Any Service
          </Link>
        </div>

      </div>
    </section>
  )
}
