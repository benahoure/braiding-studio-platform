import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'

import type { AvailabilityDate } from '../../types'

// Availability calendar — driven entirely by the real /availability API.
// Past dates are disabled; closed/blocked/full statuses come from the backend.

const CAL_DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function calDayClass(status: AvailabilityDate['status'] | 'loading' | 'selected'): string {
  const base =
    'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors '
  switch (status) {
    case 'selected':
      return base + 'bg-gold text-espresso font-bold cursor-pointer shadow-sm'
    case 'available':
      return base + 'text-espresso hover:bg-gold/20 cursor-pointer'
    case 'fully_booked':
      return base + 'text-mocha/30 cursor-not-allowed'
    case 'blocked_24hr':
      return base + 'text-amber-700/50 cursor-not-allowed'
    case 'blocked':
      return base + 'text-mocha/20 cursor-not-allowed'
    case 'closed':
      return base + 'text-mocha/20 cursor-default'
    case 'past':
      return base + 'text-mocha/15 cursor-default'
    case 'loading':
      return base + 'text-mocha/25 cursor-default'
    default:
      return base + 'text-mocha/20 cursor-default'
  }
}

interface BookingCalendarProps {
  year: number
  month: number
  selectedDate: string
  onDateSelect: (date: string) => void
  dates: AvailabilityDate[] | undefined
  isLoading: boolean
  onMonthChange: (dir: -1 | 1) => void
}

export function BookingCalendar({
  year,
  month,
  selectedDate,
  onDateSelect,
  dates,
  isLoading,
  onMonthChange,
}: BookingCalendarProps) {
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const offset = (firstDay.getDay() + 6) % 7
  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const nowYear = today.getFullYear()
  const nowMonth = today.getMonth() + 1
  const canGoPrev = year > nowYear || (year === nowYear && month > nowMonth)
  let maxYear = nowYear
  let maxMonth = nowMonth + 2
  if (maxMonth > 12) {
    maxMonth -= 12
    maxYear++
  }
  const canGoNext = year < maxYear || (year === maxYear && month < maxMonth)

  const byDate = useMemo(() => {
    const map: Record<string, AvailabilityDate> = {}
    for (const d of dates ?? []) map[d.date] = d
    return map
  }, [dates])

  const hasAvailableInMonth = (dates ?? []).some((d) => d.status === 'available')

  const cells: (number | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-xl border border-cream-border bg-paper p-4">
      {/* Month navigation */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => onMonthChange(-1)}
          className="rounded-lg p-1.5 text-mocha/50 transition-colors hover:text-cocoa disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="text-sm font-semibold text-espresso">{monthLabel}</p>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onMonthChange(1)}
          className="rounded-lg p-1.5 text-mocha/50 transition-colors hover:text-cocoa disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next month"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7">
        {CAL_DAY_HEADERS.map((d) => (
          <div key={d} className="py-1 text-center text-[0.6rem] font-bold uppercase tracking-wider text-mocha/40">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isSelected = dateStr === selectedDate
          const info = byDate[dateStr]
          const status = dateStr <= todayStr ? 'past' : isLoading ? 'loading' : (info?.status ?? 'loading')
          const cellStatus = isSelected ? 'selected' : status
          const isClickable = status === 'available' || isSelected

          return (
            <button
              key={dateStr}
              type="button"
              disabled={!isClickable}
              onClick={() => (isClickable ? onDateSelect(dateStr) : undefined)}
              className={calDayClass(cellStatus)}
              aria-pressed={isSelected}
              title={
                status === 'fully_booked'
                  ? 'Fully booked'
                  : status === 'blocked_24hr'
                    ? 'Call salon — within 24 hrs'
                    : status === 'blocked'
                      ? 'Unavailable'
                      : status === 'closed'
                        ? 'Closed'
                        : undefined
              }
            >
              {day}
              {status === 'available' && !isSelected && (
                <span
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold-dark/60"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <span className="flex items-center gap-1.5 text-[0.6rem] text-mocha/50">
          <span className="h-2 w-2 rounded-full bg-gold/70" aria-hidden="true" />
          Available
        </span>
        <span className="flex items-center gap-1.5 text-[0.6rem] text-mocha/50">
          <span className="h-2 w-2 rounded-full bg-mocha/20" aria-hidden="true" />
          Fully booked
        </span>
        <span className="flex items-center gap-1.5 text-[0.6rem] text-mocha/50">
          <span className="h-2 w-2 rounded-full bg-cream-border" aria-hidden="true" />
          Closed
        </span>
      </div>

      {isLoading && <p className="mt-2 text-center text-[0.65rem] text-mocha/40">Loading availability…</p>}

      {!isLoading && dates && !hasAvailableInMonth && (
        <div className="mt-3 rounded-lg border border-gold/20 bg-gold-pale/10 p-3 text-center">
          <p className="text-xs text-mocha/70">No available dates this month.</p>
          {canGoNext && (
            <button
              type="button"
              onClick={() => onMonthChange(1)}
              className="mt-1 text-xs font-semibold text-gold-dark underline-offset-2 hover:underline"
            >
              Check next month →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
