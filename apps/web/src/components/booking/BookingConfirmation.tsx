import { Check, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import type { SalonService } from '../../types'
import {
  DEPOSIT_AMOUNT_CENTS,
  HAIR_DETAIL_FIELDS,
  dollars,
  formatBookingDate,
  formatBookingTime,
  remainingBalanceCents,
  type HairDetails,
} from './bookingConfig'

// Step 6 — shown only after the backend has confirmed the booking.

interface BookingConfirmationProps {
  clientName: string
  clientEmail: string
  service: SalonService | undefined
  preferredDate: string
  preferredTime: string
  appointmentId: string
  portalUrl: string | null
  hairDetails: HairDetails
  firstVisit: boolean
  inspiration: string
  lengthLabel: string
}

export const BookingConfirmation = forwardRef<HTMLElement, BookingConfirmationProps>(
  function BookingConfirmation(
    {
      clientName,
      clientEmail,
      service,
      preferredDate,
      preferredTime,
      appointmentId,
      portalUrl,
      hairDetails,
      firstVisit,
      inspiration,
      lengthLabel,
    },
    ref,
  ) {
    const reducedMotion = useReducedMotion()
    const remaining = remainingBalanceCents(service, lengthLabel)

    const summaryRows = [
      { label: 'Name', value: clientName },
      { label: 'Service', value: service?.name ?? '' },
      ...(lengthLabel ? [{ label: 'Length', value: lengthLabel }] : []),
      { label: 'Date', value: formatBookingDate(preferredDate) },
      { label: 'Time', value: formatBookingTime(preferredTime) },
      { label: 'Deposit paid', value: dollars(DEPOSIT_AMOUNT_CENTS) },
      ...(remaining !== null && remaining > 0
        ? [{ label: 'Estimated balance', value: `~${dollars(remaining)} at your appointment` }]
        : []),
      ...(appointmentId ? [{ label: 'Confirmation #', value: appointmentId }] : []),
    ].filter((row) => row.value)

    // What the client told us — same info Deb sees, shown back for their own
    // record so there's no doubt about what was submitted.
    const noteRows = [
      ...(inspiration ? [{ label: 'Inspiration', value: inspiration.replace('Portfolio inspiration: ', '') }] : []),
      ...HAIR_DETAIL_FIELDS.filter((f) => hairDetails[f.id]?.trim()).map((f) => ({
        label: f.label,
        value: hairDetails[f.id].trim(),
      })),
      ...(firstVisit ? [{ label: 'First visit', value: 'Yes' }] : []),
    ]

    return (
      <motion.section
        ref={ref}
        initial={reducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ scrollMarginTop: '88px' }}
        className="overflow-hidden rounded-2xl border border-cream-border shadow-soft"
        aria-live="assertive"
      >
        <div className="bg-cocoa px-8 py-12 text-center">
          <motion.div
            initial={reducedMotion ? false : { scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold"
          >
            <Check size={30} strokeWidth={3} className="text-espresso" aria-hidden="true" />
          </motion.div>
          <h2 className="mt-5 font-display text-3xl font-semibold text-cream">
            Your Appointment Is Confirmed
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-cream/60">
            Thank you{clientName ? `, ${clientName.split(' ')[0]}` : ''} — your chair is reserved. A
            confirmation email with your appointment details is on its way to{' '}
            <span className="text-gold-light">{clientEmail}</span>.
          </p>
        </div>

        <div className="bg-paper p-6 sm:p-8">
          <dl className="grid gap-2.5">
            {summaryRows.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 border-b border-cream-border pb-2.5 text-sm last:border-b-0 last:pb-0"
              >
                <dt className="shrink-0 text-mocha/55">{label}</dt>
                <dd className="break-all text-right font-medium text-espresso">{value}</dd>
              </div>
            ))}
          </dl>

          {noteRows.length > 0 && (
            <div className="mt-5 rounded-xl border border-cream-border bg-cream p-4">
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">
                What You Told Us
              </p>
              <dl className="grid gap-1.5">
                {noteRows.map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4 text-sm">
                    <dt className="shrink-0 text-mocha/55">{label}</dt>
                    <dd className="text-right font-medium text-espresso">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {portalUrl && (
              <a href={portalUrl} className="btn btn-gold inline-flex items-center justify-center gap-2">
                View My Appointment
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
            <Link to="/" className="btn btn-outline inline-flex items-center justify-center">
              Return Home
            </Link>
          </div>

          <p className="mt-5 text-center text-[0.7rem] leading-relaxed text-mocha/50">
            Need to reschedule or cancel? Use the link in your confirmation email — changes are free
            more than 24 hours before your appointment.
          </p>
        </div>
      </motion.section>
    )
  },
)
