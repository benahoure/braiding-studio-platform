import { Clock, MapPin, Phone } from 'lucide-react'

import { BookingWizard } from '../components/booking/BookingWizard'
import { PageHero } from '../components/hero/PageHero'
import { PageMeta } from '../components/seo/PageMeta'
import { useBusinessSettings } from '../hooks/useBusinessSettings'
import { formatAddress, formatHours, formatPhone, telHref } from '../lib/format'
import { defaultBusinessSettings } from '../lib/mockData'

export function Book() {
  const { data } = useBusinessSettings()
  const settings = data ?? defaultBusinessSettings

  return (
    <>
      <PageMeta
        title="Book a Hair Appointment | Braids by Deb"
        description="Book your box braids, knotless braids, boho braids, twists, cornrows, or Fulani braids appointment at Braids by Deb in Dallas, TX."
        canonical="https://braidsbydeb.com/booking"
      />

      <PageHero
        eyebrow="Book Appointment"
        title="Reserve Your"
        italicTitle="Chair Today."
        description="Choose your service, select your preferred date and time, and secure your appointment with a $20 deposit. Instant confirmation."
        tone="dark"
      />

      {/* Form + Sidebar */}
      <section className="section-pad bg-cream">
        <div className="container-page grid gap-8 lg:grid-cols-[1fr_320px]">
          <BookingWizard />

          <aside className="grid h-fit gap-5">
            {/* Visit the Studio — matches the site's onyx + gold panel language */}
            <div className="p-7" style={{ background: 'var(--onyx)', borderRadius: '18px' }}>
              <p className="section-label mb-5">Visit the Studio</p>

              <ul className="space-y-5">
                <li>
                  <a href={telHref(settings.phone)} className="group flex items-start gap-4">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'rgba(191,161,74,0.12)', border: '1px solid rgba(191,161,74,0.25)' }}
                    >
                      <Phone size={15} style={{ color: 'var(--gold)' }} aria-hidden="true" />
                    </span>
                    <span>
                      <span
                        className="block text-[0.62rem] font-medium uppercase tracking-[0.16em]"
                        style={{ color: 'rgba(251,247,242,0.4)' }}
                      >
                        Phone
                      </span>
                      <span
                        className="mt-0.5 block text-sm font-medium transition-colors group-hover:text-white"
                        style={{ color: 'rgba(251,247,242,0.8)' }}
                      >
                        {formatPhone(settings.phone)}
                      </span>
                    </span>
                  </a>
                </li>

                <li>
                  <a
                    href={settings.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-4"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: 'rgba(191,161,74,0.12)', border: '1px solid rgba(191,161,74,0.25)' }}
                    >
                      <MapPin size={15} style={{ color: 'var(--gold)' }} aria-hidden="true" />
                    </span>
                    <span>
                      <span
                        className="block text-[0.62rem] font-medium uppercase tracking-[0.16em]"
                        style={{ color: 'rgba(251,247,242,0.4)' }}
                      >
                        Address
                      </span>
                      <span
                        className="mt-0.5 block text-sm font-medium leading-relaxed transition-colors group-hover:text-white"
                        style={{ color: 'rgba(251,247,242,0.8)' }}
                      >
                        {formatAddress(settings)}
                      </span>
                    </span>
                  </a>
                </li>

                <li className="flex items-start gap-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'rgba(191,161,74,0.12)', border: '1px solid rgba(191,161,74,0.25)' }}
                  >
                    <Clock size={15} style={{ color: 'var(--gold)' }} aria-hidden="true" />
                  </span>
                  <span>
                    <span
                      className="block text-[0.62rem] font-medium uppercase tracking-[0.16em]"
                      style={{ color: 'rgba(251,247,242,0.4)' }}
                    >
                      Hours
                    </span>
                    <span className="mt-0.5 block text-sm font-medium" style={{ color: 'rgba(251,247,242,0.8)' }}>
                      {formatHours(settings)}
                    </span>
                  </span>
                </li>
              </ul>

              {/* Status */}
              <div
                className="mt-6 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                style={{ background: 'rgba(191,161,74,0.08)', border: '1px solid rgba(191,161,74,0.18)' }}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ background: '#4ade80' }}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#22c55e' }} />
                </span>
                <p className="text-xs font-medium" style={{ color: 'rgba(251,247,242,0.72)' }}>
                  Accepting appointments
                </p>
              </div>
            </div>

            {/* Deposit note — cream card to match the site's luxury cards */}
            <div className="card-luxury p-5" style={{ transform: 'none' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--charcoal)' }}>
                Your <strong>$20 deposit</strong> confirms your appointment instantly, and a
                confirmation email with your appointment link is sent right away.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}
