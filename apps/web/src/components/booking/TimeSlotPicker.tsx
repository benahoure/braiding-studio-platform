import type { AvailabilitySlot } from '../../types'
import { rawTimeFromSlot } from './bookingConfig'

// Real time slots from the /availability API — never generated on the client.

interface TimeSlotPickerProps {
  slots: AvailabilitySlot[] | undefined
  selectedRawTime: string
  onSelect: (rawTime: string) => void
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
}

export function TimeSlotPicker({
  slots,
  selectedRawTime,
  onSelect,
  isLoading,
  isError,
  onRetry,
}: TimeSlotPickerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="h-10 animate-pulse rounded-lg bg-cream-deep" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-error/30 bg-error/5 p-4 text-center">
        <p className="text-sm text-mocha/70">We couldn&rsquo;t load times for this date.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 text-xs font-semibold text-gold-dark underline-offset-2 hover:underline"
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (!slots || slots.length === 0) {
    return (
      <p className="rounded-xl border border-cream-border bg-cream-deep/30 p-4 text-center text-sm text-mocha/60">
        No available times for this date. Please choose a different day.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Available appointment times">
      {slots.map((slot) => {
        const raw = rawTimeFromSlot(slot)
        const isSelected = raw === selectedRawTime
        return (
          <button
            key={slot.datetime}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(raw)}
            className={`flex min-h-[44px] items-center justify-center rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all ${
              isSelected
                ? 'border-gold bg-gold text-espresso shadow-sm'
                : 'border-cream-border bg-paper text-espresso hover:border-gold/60 hover:bg-gold-pale/20'
            }`}
          >
            {slot.time}
          </button>
        )
      })}
    </div>
  )
}
