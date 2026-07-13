import { Clock } from 'lucide-react'

import { formatDuration } from '../../lib/format'
import type { SalonService } from '../../types'
import {
  DEPOSIT_AMOUNT_CENTS,
  dollars,
  formatBookingDate,
  formatBookingTime,
  remainingBalanceCents,
} from './bookingConfig'

// Live booking summary — service, duration, total, and deposit due today.
// Compact on mobile, roomier on larger screens; never covers content.

interface BookingPriceSummaryProps {
  service: SalonService | undefined
  preferredDate: string
  preferredTime: string
}

export function BookingPriceSummary({ service, preferredDate, preferredTime }: BookingPriceSummaryProps) {
  if (!service) return null
  const remaining = remainingBalanceCents(service)

  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-gold/25 bg-gold-pale/10 px-4 py-3"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-espresso">{service.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-[0.7rem] text-mocha/60">
          <span className="inline-flex items-center gap-1">
            <Clock size={10} aria-hidden="true" />
            {formatDuration(service.durationMinutes)}
          </span>
          {preferredDate && (
            <span>
              · {formatBookingDate(preferredDate)}
              {preferredTime ? ` at ${formatBookingTime(preferredTime)}` : ''}
            </span>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-espresso">
          From {dollars(service.startingPrice)}
        </p>
        <p className="text-[0.68rem] font-semibold text-gold-dark">
          {dollars(DEPOSIT_AMOUNT_CENTS)} deposit due today
          {remaining !== null && remaining > 0 && (
            <span className="font-normal text-mocha/55"> · ~{dollars(remaining)} at appointment</span>
          )}
        </p>
      </div>
    </div>
  )
}
