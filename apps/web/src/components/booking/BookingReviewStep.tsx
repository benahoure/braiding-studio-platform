import { Elements } from '@stripe/react-stripe-js'
import type { Stripe } from '@stripe/stripe-js'
import { Pencil } from 'lucide-react'

import { formatDuration } from '../../lib/format'
import { resolveServiceImage, resolveServiceImageAlt } from '../../lib/serviceImages'
import type { SalonService } from '../../types'
import {
  DEPOSIT_AMOUNT_CENTS,
  HAIR_DETAIL_FIELDS,
  dollars,
  formatBookingDate,
  formatBookingTime,
  remainingBalanceCents,
  type HairDetails,
  type WizardStep,
} from './bookingConfig'
import { StripePaymentForm } from './StripePaymentForm'

// Step 5 — full review with edit shortcuts, then the real deposit payment.
// The Stripe hold (payment intent) was created when entering this step, which
// is also the server-side availability recheck.

interface ReviewSection {
  title: string
  step: WizardStep
  rows: Array<{ label: string; value: string }>
}

interface BookingReviewStepProps {
  service: SalonService | undefined
  hairDetails: HairDetails
  firstVisit: boolean
  preferredDate: string
  preferredTime: string
  clientName: string
  clientEmail: string
  clientPhone: string
  inspiration: string
  hold: { appointmentId: string; clientSecret: string } | null
  stripePromise: Promise<Stripe | null> | null
  isMock: boolean
  policyAccepted: boolean
  onPolicyChange: (v: boolean) => void
  onEdit: (step: WizardStep) => void
  onPaymentSuccess: (paymentIntentId: string) => void
  isConfirming: boolean
  confirmError?: string
}

function SummaryCard({ section, onEdit }: { section: ReviewSection; onEdit: (step: WizardStep) => void }) {
  return (
    <div className="rounded-xl border border-cream-border bg-paper p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-gold-dark">{section.title}</p>
        <button
          type="button"
          onClick={() => onEdit(section.step)}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 py-1 text-[0.68rem] font-semibold text-mocha/60 transition-colors hover:bg-gold-pale/20 hover:text-gold-dark"
          aria-label={`Edit ${section.title}`}
        >
          <Pencil size={11} aria-hidden="true" />
          Edit
        </button>
      </div>
      <dl className="grid gap-1.5">
        {section.rows.map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between gap-4 text-sm">
            <dt className="shrink-0 text-mocha/55">{label}</dt>
            <dd className="text-right font-medium text-espresso">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function BookingReviewStep({
  service,
  hairDetails,
  firstVisit,
  preferredDate,
  preferredTime,
  clientName,
  clientEmail,
  clientPhone,
  inspiration,
  hold,
  stripePromise,
  isMock,
  policyAccepted,
  onPolicyChange,
  onEdit,
  onPaymentSuccess,
  isConfirming,
  confirmError,
}: BookingReviewStepProps) {
  const hairRows = HAIR_DETAIL_FIELDS.filter((f) => hairDetails[f.id]?.trim()).map((f) => ({
    label: f.label,
    value: hairDetails[f.id].trim(),
  }))
  const remaining = remainingBalanceCents(service)

  const sections: ReviewSection[] = [
    {
      title: 'Service',
      step: 1,
      rows: [
        { label: 'Style', value: service?.name ?? '' },
        { label: 'Price', value: service ? `From ${dollars(service.startingPrice)}` : '' },
        { label: 'Duration', value: service ? `~${formatDuration(service.durationMinutes)}` : '' },
      ],
    },
    {
      title: 'Hair Details',
      step: 2,
      rows: [
        ...(inspiration ? [{ label: 'Inspiration', value: inspiration.replace('Portfolio inspiration: ', '') }] : []),
        ...(hairRows.length > 0 ? hairRows : [{ label: 'Details', value: 'None added' }]),
      ],
    },
    {
      title: 'Schedule',
      step: 3,
      rows: [
        { label: 'Date', value: formatBookingDate(preferredDate) },
        { label: 'Time', value: formatBookingTime(preferredTime) },
      ],
    },
    {
      title: 'Your Information',
      step: 4,
      rows: [
        { label: 'Name', value: clientName },
        { label: 'Email', value: clientEmail },
        { label: 'Phone', value: clientPhone },
        ...(firstVisit ? [{ label: 'First visit', value: 'Yes' }] : []),
      ],
    },
  ]

  return (
    <div className="grid gap-6">
      {/* Service thumbnail banner */}
      {service && (
        <div className="flex items-center gap-4 overflow-hidden rounded-xl border border-gold/25 bg-gold-pale/10 p-3">
          <img
            src={resolveServiceImage(service)}
            alt={resolveServiceImageAlt(service)}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
            style={{ objectPosition: service.imagePosition ?? 'top center' }}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-espresso">{service.name}</p>
            <p className="text-xs text-mocha/60">
              {formatBookingDate(preferredDate)} at {formatBookingTime(preferredTime)}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <SummaryCard key={section.title} section={section} onEdit={onEdit} />
        ))}
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-gold/30 bg-gold-pale/15 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-mocha/70">Service price</span>
          <span className="font-semibold text-espresso">{service ? `From ${dollars(service.startingPrice)}` : '—'}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-sm">
          <span className="text-mocha/70">Deposit due today</span>
          <span className="font-bold text-gold-dark">{dollars(DEPOSIT_AMOUNT_CENTS)}</span>
        </div>
        {remaining !== null && remaining > 0 && (
          <div className="mt-1.5 flex items-center justify-between border-t border-gold/20 pt-1.5 text-xs">
            <span className="text-mocha/55">Estimated balance at appointment</span>
            <span className="font-medium text-mocha/70">~{dollars(remaining)}</span>
          </div>
        )}
        <p className="mt-2 text-[0.65rem] leading-snug text-mocha/50">
          Final pricing depends on length and hair density — Deb confirms everything before your visit.
          Your deposit is applied toward the final balance.
        </p>
      </div>

      {confirmError && (
        <p className="rounded-lg border border-error/30 bg-error/8 p-3 text-sm text-error" role="alert">
          {confirmError}
        </p>
      )}

      {/* Payment — the hold was created for this exact slot */}
      {hold && (
        <Elements stripe={stripePromise} options={!isMock ? { clientSecret: hold.clientSecret } : undefined}>
          <StripePaymentForm
            appointmentId={hold.appointmentId}
            policyAccepted={policyAccepted}
            onPolicyChange={onPolicyChange}
            onSuccess={onPaymentSuccess}
            isConfirming={isConfirming}
            isMock={isMock}
          />
        </Elements>
      )}
    </div>
  )
}
