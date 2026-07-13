import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { BookingCalendar } from './BookingCalendar'
import { TimeSlotPicker } from './TimeSlotPicker'
import { formatBookingDate } from './bookingConfig'

// Step 3 — schedule. Month availability and time slots come from the real
// /availability API (service-aware); nothing is generated client-side.

interface ScheduleStepProps {
  serviceId: string
  calendarMonth: { year: number; month: number }
  preferredDate: string
  preferredTime: string
  onMonthChange: (dir: -1 | 1) => void
  onDateSelect: (date: string) => void
  onTimeSelect: (rawTime: string) => void
  errors: Partial<Record<string, string>>
}

export function ScheduleStep({
  serviceId,
  calendarMonth,
  preferredDate,
  preferredTime,
  onMonthChange,
  onDateSelect,
  onTimeSelect,
  errors,
}: ScheduleStepProps) {
  const monthKey = `${calendarMonth.year}-${String(calendarMonth.month).padStart(2, '0')}`

  const monthAvailabilityQuery = useQuery({
    queryKey: ['availability', 'month', monthKey, serviceId],
    queryFn: () => api.getMonthAvailability({ month: monthKey, serviceId: serviceId || undefined }),
  })

  const slotsQuery = useQuery({
    queryKey: ['availability', 'slots', preferredDate, serviceId],
    queryFn: () => api.getDateSlots({ date: preferredDate, serviceId: serviceId || undefined }),
    enabled: Boolean(preferredDate),
  })

  const handleMonthChange = (dir: -1 | 1) => {
    let { year, month } = calendarMonth
    month += dir
    if (month > 12) {
      month = 1
      year++
    }
    if (month < 1) {
      month = 12
      year--
    }
    onMonthChange(dir === 1 ? 1 : -1)
    // The wizard reducer clears date/time on month change via SET_MONTH.
    void year
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">Select a Date</p>
        <div className="mt-3">
          {monthAvailabilityQuery.isError ? (
            <div className="rounded-xl border border-error/30 bg-error/5 p-6 text-center">
              <p className="text-sm text-mocha/70">We couldn&rsquo;t load availability.</p>
              <button
                type="button"
                onClick={() => monthAvailabilityQuery.refetch()}
                className="mt-2 text-xs font-semibold text-gold-dark underline-offset-2 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <BookingCalendar
              year={calendarMonth.year}
              month={calendarMonth.month}
              selectedDate={preferredDate}
              onDateSelect={onDateSelect}
              dates={monthAvailabilityQuery.data?.dates}
              isLoading={monthAvailabilityQuery.isPending}
              onMonthChange={handleMonthChange}
            />
          )}
        </div>
        {errors.preferredDate && (
          <p className="mt-2 text-sm text-error" role="alert">
            {errors.preferredDate}
          </p>
        )}
      </div>

      {preferredDate && (
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">
            Choose a Time
            <span className="ml-2 font-normal normal-case tracking-normal text-mocha/55">
              {formatBookingDate(preferredDate)}
            </span>
          </p>
          <div className="mt-3">
            <TimeSlotPicker
              slots={slotsQuery.data?.slots}
              selectedRawTime={preferredTime}
              onSelect={onTimeSelect}
              isLoading={slotsQuery.isPending}
              isError={slotsQuery.isError}
              onRetry={() => slotsQuery.refetch()}
            />
          </div>
          {errors.preferredTime && (
            <p className="mt-2 text-sm text-error" role="alert">
              {errors.preferredTime}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
