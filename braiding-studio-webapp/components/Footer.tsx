import Link from 'next/link'
import { Instagram, Phone, Mail, MapPin, Clock } from 'lucide-react'
import { BUSINESS_INFO } from '@/lib/data'

function TikTokIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer style={{ background: 'var(--onyx)' }}>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* Brand */}
        <div className="md:col-span-1">
          <div
            className="font-display text-3xl font-medium mb-1"
            style={{ color: 'var(--cream)' }}
          >
            Braids by Deb
          </div>
          <div
            className="text-[0.58rem] font-medium tracking-[0.24em] uppercase mb-5"
            style={{ color: 'var(--gold)' }}
          >
            Dallas, Texas
          </div>
          <p
            className="leading-relaxed mb-6"
            style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
          >
            {BUSINESS_INFO.tagline}. Protective styles that honor your natural beauty.
          </p>
          {/* Social icons */}
          <div className="flex gap-3">
            {[
              { href: BUSINESS_INFO.instagramUrl, label: 'Instagram', Icon: Instagram },
              { href: BUSINESS_INFO.tiktokUrl,    label: 'TikTok',    Icon: TikTokIcon },
            ].map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-9 h-9 rounded-full border flex items-center justify-center transition-all hover:border-gold"
                style={{ borderColor: 'rgba(191,161,74,0.35)', color: 'var(--gold)' }}
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
        </div>

        {/* Navigate */}
        <div>
          <h4
            className="mb-5"
            style={{
              fontSize: '0.66rem',
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
            }}
          >
            Navigate
          </h4>
          <ul className="space-y-3">
            {[
              { href: '/#services',    label: 'Services & Pricing' },
              { href: '/#gallery',     label: 'Gallery' },
              { href: '/#about',       label: 'About Deb' },
              { href: '/booking',      label: 'Book Appointment' },
              { href: '/appointments', label: 'My Bookings' },
            ].map(l => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="transition-colors hover:text-white"
                  style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Hours */}
        <div>
          <h4
            className="mb-5"
            style={{
              fontSize: '0.66rem',
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
            }}
          >
            Hours
          </h4>
          <ul className="space-y-2">
            {Object.entries(BUSINESS_INFO.hours).map(([day, time]) => (
              <li
                key={day}
                className="flex justify-between gap-4"
                style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
              >
                <span>{day}</span>
                <span style={{ color: 'rgba(251,247,242,0.72)' }}>{time}</span>
              </li>
            ))}
          </ul>
          <div
            className="flex items-start gap-2 mt-5"
            style={{ fontSize: '0.78rem', color: 'rgba(251,247,242,0.32)' }}
          >
            <Clock size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
            <span>Appointments recommended. Walk-ins welcome based on availability.</span>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4
            className="mb-5"
            style={{
              fontSize: '0.66rem',
              fontWeight: 500,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--gold)',
            }}
          >
            Contact
          </h4>
          <ul className="space-y-4">
            <li>
              <a
                href={`tel:${BUSINESS_INFO.phone}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
                style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
              >
                <Phone size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                {BUSINESS_INFO.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${BUSINESS_INFO.email}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
                style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
              >
                <Mail size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                {BUSINESS_INFO.email}
              </a>
            </li>
            <li>
              <div
                className="flex items-start gap-3"
                style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
              >
                <MapPin size={13} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div>{BUSINESS_INFO.address}</div>
                  <div>{BUSINESS_INFO.city}</div>
                </div>
              </div>
            </li>
          </ul>

          {/* Deposit callout */}
          <div
            className="mt-6 p-3 rounded-xl text-xs leading-relaxed"
            style={{
              background: 'rgba(191,161,74,0.08)',
              border: '1px solid rgba(191,161,74,0.18)',
              color: 'rgba(251,247,242,0.5)',
            }}
          >
            $50 non-refundable deposit required for all appointments. Bank Card · Zelle · CashApp
          </div>
        </div>

      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: 'rgba(251,247,242,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p style={{ fontSize: '0.75rem', color: 'rgba(251,247,242,0.28)' }}>
            © {new Date().getFullYear()} Braids by Deb. All rights reserved.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(251,247,242,0.28)' }}>
            Dallas, Texas · Natural Hair Braiding
          </p>
        </div>
      </div>

    </footer>
  )
}
