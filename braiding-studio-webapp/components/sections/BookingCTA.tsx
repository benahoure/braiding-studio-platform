import Link from 'next/link'
import { BUSINESS_INFO, DEPOSIT_AMOUNT } from '@/lib/data'

export default function BookingCTA() {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: 'var(--onyx)' }}
    >
      {/* Decorative warm glows */}
      <div
        className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: 'var(--gold)', opacity: 0.04, filter: 'blur(90px)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'var(--blush-mid)', opacity: 0.06, filter: 'blur(70px)' }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center px-6">

        <p className="section-label mb-4" style={{ color: 'var(--gold)' }}>
          Ready to Glow Up Your Crown?
        </p>

        <h2
          className="font-display font-light mb-6"
          style={{
            color: 'var(--cream)',
            fontSize: 'clamp(2.6rem, 6vw, 4.2rem)',
            lineHeight: 1.1,
          }}
        >
          Book Your Appointment
          <br />
          <em
            style={{
              fontStyle: 'italic',
              color: 'var(--gold-light)',
              fontSize: '0.78em',
            }}
          >
            Today
          </em>
        </h2>

        <div className="divider-gold mb-6" />

        <p
          className="leading-relaxed mb-3 max-w-md mx-auto"
          style={{ fontSize: '0.95rem', color: 'rgba(251,247,242,0.58)' }}
        >
          Choose your style, pick a time that works for you, and let Deb take
          care of the rest. Quick, easy, confirmed instantly.
        </p>

        <p
          className="mb-10"
          style={{ fontSize: '0.82rem', color: 'rgba(191,161,74,0.65)' }}
        >
          A ${DEPOSIT_AMOUNT} non-refundable deposit secures your spot.
          Bank Card · Zelle · CashApp
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/booking" className="btn-gold px-10 py-4">
            Book Online Now
          </Link>
          <a
            href={`tel:${BUSINESS_INFO.phone}`}
            className="btn-outline px-8 py-4"
            style={{
              borderColor: 'rgba(251,247,242,0.18)',
              color: 'rgba(251,247,242,0.72)',
            }}
          >
            Call {BUSINESS_INFO.phone}
          </a>
        </div>

      </div>
    </section>
  )
}
