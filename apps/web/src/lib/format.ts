import type { BusinessSettings, DayName } from '../types'

const days: DayName[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (local.length !== 10) return phone
  return `+1 (${local.slice(0, 3)})-${local.slice(3, 6)}-${local.slice(6)}`
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export function formatAddress(settings: BusinessSettings): string {
  const { street, city, state, zip } = settings.address
  return `${street}, ${city}, ${state} ${zip}`
}

function _formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const display = h % 12 || 12
  return m === 0 ? `${display}:00 ${suffix}` : `${display}:${String(m).padStart(2, '0')} ${suffix}`
}

const _DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function formatHours(settings: BusinessSettings): string {
  type Seg = { from: number; to: number; closed: boolean; open: string; close: string }
  const segments: Seg[] = []

  days.forEach((day, i) => {
    const h = settings.hours[day]
    const last = segments[segments.length - 1]
    const sameAsPrev =
      last &&
      last.closed === h.closed &&
      (h.closed || (last.open === h.open && last.close === h.close))
    if (sameAsPrev) {
      last.to = i
    } else {
      segments.push({ from: i, to: i, closed: h.closed, open: h.open, close: h.close })
    }
  })

  return segments
    .map(({ from, to, closed, open, close }) => {
      const label = from === to ? _DAY_ABBR[from] : `${_DAY_ABBR[from]}–${_DAY_ABBR[to]}`
      return closed ? `${label}: Closed` : `${label}: ${_formatHour(open)} – ${_formatHour(close)}`
    })
    .join(' · ')
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
