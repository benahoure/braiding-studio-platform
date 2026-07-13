import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { PageMeta } from '../components/seo/PageMeta'
import { ServicesCarouselHero } from '../components/services/ServicesCarouselHero'
import { ServiceCard } from '../components/ui/ServiceCard'
import { api } from '../lib/api'
import { SERVICE_CATEGORIES } from '../lib/serviceCategories'
import type { SalonService } from '../types'

// Full service menu — organized by category the way Grace Hair Beauty browses
// (URL-synced category filters + grouped sections), in Braids by Deb's design.

export function Services() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') ?? 'all'
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.getServices(),
  })
  const services: SalonService[] = useMemo(() => data?.services ?? [], [data])

  const setCategory = (value: string) => {
    setSearchParams(value === 'all' ? {} : { category: value }, { replace: true })
  }

  const searched = useMemo(() => {
    if (!searchQuery) return services
    const q = searchQuery.toLowerCase()
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    )
  }, [services, searchQuery])

  // ?category= accepts a main category (braids-protective-styles) or a
  // subcategory (box-braids, knotless-braids, …). Unknown values act as "all".
  const isMainCategory = SERVICE_CATEGORIES.some((c) => c.value === activeCategory)
  const parentOfSub = SERVICE_CATEGORIES.find((c) =>
    c.subcategories.some((s) => s.value === activeCategory),
  )
  const isSubcategory = !isMainCategory && parentOfSub !== undefined

  // Categories that still have services after searching, in menu order.
  const groups = SERVICE_CATEGORIES.map((cat) => ({
    ...cat,
    services: searched.filter((s) => s.category === cat.value),
  })).filter((g) => g.services.length > 0)

  const visibleGroups = isMainCategory
    ? groups.filter((g) => g.value === activeCategory)
    : isSubcategory
      ? groups
          .filter((g) => g.value === parentOfSub.value)
          .map((g) => ({
            ...g,
            services: g.services.filter((s) => s.subcategory === activeCategory),
          }))
          .filter((g) => g.services.length > 0)
      : groups

  // Style-family chips — shown when a single main category with multiple
  // families is in view (e.g. Braids & Protective Styles).
  const activeMain = isSubcategory ? parentOfSub : SERVICE_CATEGORIES.find((c) => c.value === activeCategory)
  const subChips = activeMain
    ? activeMain.subcategories.filter((sub) =>
        searched.some((s) => s.category === activeMain.value && s.subcategory === sub.value),
      )
    : []

  return (
    <>
      <PageMeta
        title="Services & Pricing | Braids by Deb — Dallas, TX"
        description="Box braids, knotless braids, boho braids, twists, cornrows, Fulani braids, and kids styles. Transparent pricing, book online with a $20 deposit."
        canonical="https://braidsbydeb.com/services"
      />

      {/* ── Horizon 3D carousel hero ───────────────── */}
      <ServicesCarouselHero services={services} />

      {/* ── Filters ────────────────────────────────── */}
      <section id="service-menu" className="py-12 md:py-16" style={{ background: 'var(--cream)' }}>
        <div className="max-w-7xl mx-auto px-6">
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-luxury"
              style={{ borderRadius: '50px', paddingLeft: '2.5rem' }}
              aria-label="Search services"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-4 -mx-2 px-2 overflow-x-auto scroll-hide">
            {/* Only show chips for categories that currently have active services.
                (The API returns active services only, so admin-created services in
                Natural/Sew-In will surface those chips automatically.) */}
            {[
              { value: 'all', label: 'All Styles' },
              ...SERVICE_CATEGORIES.filter((cat) =>
                services.some((s) => s.category === cat.value),
              ),
            ].map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                aria-pressed={activeCategory === cat.value}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '50px',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  border: `1.5px solid ${activeCategory === cat.value ? 'var(--onyx)' : 'var(--border)'}`,
                  background: activeCategory === cat.value ? 'var(--onyx)' : 'white',
                  color: activeCategory === cat.value ? 'var(--gold-light)' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* ── Style-family chips (e.g. Box Braids, Knotless…) ── */}
          {subChips.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {subChips.map((sub) => (
                <button
                  key={sub.value}
                  onClick={() =>
                    setCategory(activeCategory === sub.value ? (activeMain?.value ?? 'all') : sub.value)
                  }
                  aria-pressed={activeCategory === sub.value}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '50px',
                    fontSize: '0.66rem',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    border: `1px solid ${activeCategory === sub.value ? 'var(--gold-dark)' : 'var(--border)'}`,
                    background: activeCategory === sub.value ? 'var(--gold-muted)' : 'transparent',
                    color: activeCategory === sub.value ? 'var(--gold-dark)' : 'var(--muted)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Grouped catalog ─────────────────────── */}
          {isLoading ? (
            <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
              <div className="spinner mx-auto mb-4" />
              Loading services…
            </div>
          ) : visibleGroups.length === 0 ? (
            <div className="text-center py-20" style={{ color: 'var(--muted)' }}>
              <p className="font-display text-2xl mb-2">No services found</p>
              <p style={{ fontSize: '0.9rem' }}>Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="space-y-16 mt-10">
              {visibleGroups.map((group) => (
                <div key={group.value}>
                  {/* Category header */}
                  <div className="flex items-end justify-between gap-4 mb-6 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <h2
                        className="font-display"
                        style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 400, color: 'var(--onyx)' }}
                      >
                        {group.label}
                      </h2>
                      <p className="mt-1" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                        {group.description}
                      </p>
                    </div>
                    <span
                      className="hidden sm:block flex-shrink-0"
                      style={{ fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-dark)' }}
                    >
                      {group.services.length} {group.services.length === 1 ? 'style' : 'styles'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {group.services.map((service) => (
                      <ServiceCard key={service.serviceId} service={service} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Deposit + CTA ───────────────────────── */}
          <div
            className="mt-16 max-w-md mx-auto text-center py-4 px-6"
            style={{ background: 'var(--blush)', borderRadius: '14px', fontSize: '0.85rem', color: 'var(--charcoal)' }}
          >
            <strong>$20 deposit</strong> secures all appointments — paid securely online by card and
            applied toward your final balance.
          </div>

        </div>
      </section>
    </>
  )
}
