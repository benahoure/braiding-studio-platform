import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

import { formatPhone, telHref } from '../../lib/format'
import { SocialCircle } from '../ui/SocialIcons'
import type { BusinessSettings, DayName } from '../../types'

// Braids by Deb footer — ported from braiding-studio-webapp/components/Footer.tsx.

const DAYS: Array<{ key: DayName; label: string }> = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

function formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const display = h % 12 || 12
  return m === 0 ? `${display}:00 ${suffix}` : `${display}:${String(m).padStart(2, '0')} ${suffix}`
}

const COL_HEAD_STYLE = {
  fontSize: '0.66rem',
  fontWeight: 500,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--gold)',
} as const

interface FooterProps {
  settings: BusinessSettings
}

export function Footer({ settings }: FooterProps) {
  return (
    <footer style={{ background: 'var(--onyx)' }}>
      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1">
          <Link to="/" aria-label="Braids by Deb — home" className="inline-block mb-4">
            <img
              src="/brand/Braids-by-deb-logo.png"
              alt="Braids by Deb"
              className="h-20 w-20 rounded-2xl object-cover"
              style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(191,161,74,0.32)' }}
            />
          </Link>
          <div
            className="text-[0.58rem] font-medium tracking-[0.24em] uppercase mb-4"
            style={{ color: 'var(--gold)' }}
          >
            Dallas, Texas
          </div>
          <p
            className="font-display italic leading-relaxed mb-3"
            style={{ fontSize: '1rem', color: 'rgba(251,247,242,0.7)' }}
          >
            Braided with precision. Timeless confidence.
          </p>
          <p className="leading-relaxed mb-6" style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}>
            Natural hair braiding in Dallas. Protective styles that honor your natural beauty.
          </p>
          {/* Social icons */}
          <div className="flex gap-3">
            {settings.socialLinks.instagram && (
              <SocialCircle network="instagram" href={settings.socialLinks.instagram} />
            )}
            {settings.socialLinks.tiktok && (
              <SocialCircle network="tiktok" href={settings.socialLinks.tiktok} />
            )}
          </div>
        </div>

        {/* Navigate */}
        <div>
          <h4 className="mb-5" style={COL_HEAD_STYLE}>
            Navigate
          </h4>
          <ul className="space-y-3">
            {[
              { href: '/services', label: 'Services & Pricing' },
              { href: '/gallery', label: 'Gallery' },
              { href: '/about', label: 'About Deb' },
              { href: '/booking', label: 'Book Appointment' },
              { href: '/reviews', label: 'Reviews' },
              { href: '/contact', label: 'Contact' },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
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
          <h4 className="mb-5" style={COL_HEAD_STYLE}>
            Hours
          </h4>
          <ul className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const day = settings.hours[key]
              return (
                <li
                  key={key}
                  className="flex justify-between gap-4"
                  style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
                >
                  <span>{label}</span>
                  <span style={{ color: 'rgba(251,247,242,0.72)' }}>
                    {day.closed ? 'Closed' : `${formatHour(day.open)} – ${formatHour(day.close)}`}
                  </span>
                </li>
              )
            })}
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
          <h4 className="mb-5" style={COL_HEAD_STYLE}>
            Contact
          </h4>
          <ul className="space-y-4">
            <li>
              <a
                href={telHref(settings.phone)}
                className="flex items-center gap-3 transition-colors hover:text-white"
                style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
              >
                <Phone size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                {formatPhone(settings.phone)}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${settings.email}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
                style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
              >
                <Mail size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                {settings.email}
              </a>
            </li>
            <li>
              <div
                className="flex items-start gap-3"
                style={{ fontSize: '0.85rem', color: 'rgba(251,247,242,0.48)' }}
              >
                <MapPin size={13} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div>{settings.address.street}</div>
                  <div>
                    {settings.address.city}, {settings.address.state} {settings.address.zip}
                  </div>
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
            $20 deposit secures all appointments. Paid securely online by card.
          </div>
        </div>
      </div>

      {/* Bottom bar — extra mobile padding keeps the sticky booking bar clear */}
      <div className="border-t pb-24 md:pb-0" style={{ borderColor: 'rgba(251,247,242,0.06)' }}>
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
