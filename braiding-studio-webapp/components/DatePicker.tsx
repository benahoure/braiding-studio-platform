'use client'

import { DayPicker } from 'react-day-picker'
import { addDays, isBefore, startOfToday, isWeekend } from 'date-fns'
import 'react-day-picker/dist/style.css'

interface DatePickerProps {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
}

export default function DatePicker({ selected, onSelect }: DatePickerProps) {
  const today = startOfToday()
  const minDate = addDays(today, 1) // Minimum 1 day ahead

  return (
    <div
      className="rounded p-4 inline-block"
      style={{ background: 'white', border: '1px solid #E8DDD0', borderRadius: '4px' }}
    >
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        fromDate={minDate}
        toDate={addDays(today, 90)}
        disabled={[
          { before: minDate },
          // Uncomment to disable Sundays:
          // { dayOfWeek: [0] }
        ]}
        modifiersClassNames={{
          selected: 'rdp-day_selected',
          today: 'rdp-day_today',
        }}
        styles={{
          caption: { fontFamily: 'var(--font-body)' },
          head_cell: {
            fontFamily: 'var(--font-body)',
            fontSize: '0.72rem',
            color: 'var(--muted)',
            fontWeight: '500',
          },
          day: {
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            borderRadius: '4px',
          },
          nav_button: {
            color: 'var(--onyx)',
          },
        }}
      />
    </div>
  )
}
