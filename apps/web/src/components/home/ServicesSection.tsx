import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { api } from '../../lib/api'
import { ServiceCard } from '../ui/ServiceCard'
import type { SalonService } from '../../types'

// Home preview — Deb's most-booked signature styles, with a path into the
// full categorized menu at /services.

export function ServicesSection() {
  const { data } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.getServices(),
  })
  const services: SalonService[] = data?.services ?? []

  // Featured styles first, topped up with the most-booked styles, max 8.
  const featured = [
    ...services.filter((s) => s.featured),
    ...services
      .filter((s) => !s.featured)
      .sort((a, b) => (b.bookingCount ?? 0) - (a.bookingCount ?? 0)),
  ].slice(0, 8)

  return (
    <section id="services" className="py-24 md:py-32" style={{ background: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* ── Header ────────────────────────────────── */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Protective Styles</p>
          <h2 className="section-title mb-4" style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}>
            Signature Styles
          </h2>
          <div className="divider-gold" />
          <p
            className="mt-5 max-w-lg mx-auto leading-relaxed"
            style={{ fontSize: '0.95rem', color: 'var(--muted)' }}
          >
            Every style is performed with patience, precision, and deep care for your hair health.
            Your crown is in good hands.
          </p>
        </div>

        {/* ── Featured grid ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {featured.map((service) => (
            <ServiceCard key={service.serviceId} service={service} />
          ))}
        </div>

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
          <strong>$20 deposit</strong> secures all appointments — paid securely online by card.
        </div>

        {/* ── View all ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center text-center mt-8">
          <Link to="/services" className="btn-primary inline-flex items-center gap-2">
            View All Services & Pricing
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
