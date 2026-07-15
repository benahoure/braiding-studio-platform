import { SERVICE_CATEGORIES } from '../../lib/serviceCategories'
import type { AvailabilitySlot, SalonService, ServiceCategory } from '../../types'

// ── Wizard steps ───────────────────────────────────────────────────────────
export const WIZARD_STEPS = [
  'Service',
  'Hair Details',
  'Schedule',
  'Your Info',
  'Review',
] as const

export type WizardStep = 1 | 2 | 3 | 4 | 5

// ── Deposit (cents) — mirrors lambdas/src/appointments/models.py ──────────
export const DEPOSIT_AMOUNT_CENTS = 2000

// ── Booking category picker (step 1) ──────────────────────────────────────
export interface BookingCategoryDef {
  id: string
  name: string
  tagline: string
  serviceCategories: ServiceCategory[]
}

export const BOOKING_CATEGORIES: BookingCategoryDef[] = [
  {
    id: 'braids-protective-styles',
    name: 'Braids & Protective Styles',
    tagline: 'Box braids, knotless, boho, twists, cornrows, and Fulani styles.',
    serviceCategories: ['braids-protective-styles'],
  },
  {
    id: 'natural-ponytails',
    name: 'Natural Hair & Ponytails',
    tagline: 'Natural hair styling and sleek ponytail services.',
    serviceCategories: ['natural-ponytails'],
  },
  {
    id: 'sew-in-wigs',
    name: 'Sew-In, Wigs & Crochet',
    tagline: 'Sew-in installs, wig foundations, and crochet styles.',
    serviceCategories: ['sew-in-wigs'],
  },
  {
    id: 'kids',
    name: 'Kids & Toddlers',
    tagline: 'Gentle, comfortable styles for kids and toddlers.',
    serviceCategories: ['kids'],
  },
]

// ── Style-first browsing (step 1) ─────────────────────────────────────────
// Groups a category's services by subcategory so customers narrow down
// naturally: category → style family (Boho, Box…) → size (Small/Medium/Large).
// Purely a presentation regrouping of the same services — no data changes.

export interface StyleGroup {
  id: string
  label: string
  services: SalonService[]
}

const SIZE_WORDS = ['Small', 'Medium', 'Large', 'Jumbo']

/** "Small Boho Braids" → "Small"; names without a size word stay whole. */
export function sizeLabelFor(service: SalonService): string {
  const first = service.name.trim().split(/\s+/)[0]
  return SIZE_WORDS.includes(first) ? first : service.name
}

function sizeRank(service: SalonService): number {
  const idx = SIZE_WORDS.indexOf(service.name.trim().split(/\s+/)[0])
  return idx === -1 ? SIZE_WORDS.length : idx
}

function subcategoryLabel(value: string): string {
  for (const cat of SERVICE_CATEGORIES) {
    const hit = cat.subcategories.find((s) => s.value === value)
    if (hit) return hit.label
  }
  return value
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Style groups for a booking category, or `null` when grouped browsing adds
 * nothing (e.g. Kids, where every service stands alone) — callers fall back
 * to the flat service-card grid.
 */
export function groupedStylesFor(
  categoryDef: BookingCategoryDef,
  services: SalonService[],
): StyleGroup[] | null {
  const actives = services
    .filter((s) => s.active && categoryDef.serviceCategories.includes(s.category))
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))

  const groups = new Map<string, StyleGroup>()
  for (const s of actives) {
    const key = s.subcategory || `service:${s.serviceId}`
    const existing = groups.get(key)
    if (existing) {
      existing.services.push(s)
    } else {
      groups.set(key, {
        id: key,
        label: s.subcategory ? subcategoryLabel(s.subcategory) : s.name,
        services: [s],
      })
    }
  }
  // Grouping only helps when it actually condenses the list.
  if (groups.size < 2 || groups.size >= actives.length) return null

  const taxonomyOrder = SERVICE_CATEGORIES.flatMap((c) => c.subcategories.map((s) => s.value))
  const ordered = [...groups.values()].sort((a, b) => {
    const ai = taxonomyOrder.indexOf(a.id)
    const bi = taxonomyOrder.indexOf(b.id)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
  for (const group of ordered) {
    group.services.sort((a, b) => sizeRank(a) - sizeRank(b) || (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
  }
  return ordered
}

// Maps gallery/portfolio style ids to the service that best matches the look,
// so "book this style" lands on the right service. Mirrors mockData/seed styles.
export const PORTFOLIO_STYLE_SERVICE_MAP: Record<string, string> = {
  'style-small-knotless': 'kl-small',
  'style-medium-box': 'bb-medium',
  'style-small-boho': 'boho-small',
  'style-fulani-braids': 'fulani-small',
  'style-twist-boho': 'boho-medium',
  'style-goddess-cornrows': 'cornrows',
  'style-passion-twists': 'twist-medium',
  'style-fulani-hairstyle': 'fulani-hairstyle',
  'style-straight-back-cornrows': 'cornrows',
}

export function serviceIdForPortfolioStyle(styleId: string): string {
  return PORTFOLIO_STYLE_SERVICE_MAP[styleId] ?? ''
}

// ── Hair details (step 2) — schema-driven so future service-specific
//    questions can be added without rewriting the step. All fields optional;
//    answers are summarized into the appointment `notes` field (≤500 chars),
//    which is what the backend already stores. ─────────────────────────────
export interface HairDetailFieldDef {
  id: string
  label: string
  noteLabel: string
  type: 'select' | 'text' | 'textarea'
  options?: string[]
  placeholder?: string
  maxLength?: number
  helper?: string
  /** Callout shown when a specific option is selected. */
  optionNotes?: Record<string, { text: string; tone: 'info' | 'warning' }>
}

export const HAIR_DETAIL_FIELDS: HairDetailFieldDef[] = [
  {
    id: 'hairColor',
    label: 'Hair Color',
    noteLabel: 'Color',
    type: 'select',
    options: [
      'Natural Black (1B)',
      'Jet Black (1)',
      'Dark Brown (2/4)',
      'Honey Blonde (27)',
      'Auburn / Copper (30)',
      'Burgundy (99J)',
      'Blonde (613)',
      'Ombré / two-tone',
      'Custom — I’ll describe it in Special Requests',
      'Not sure yet',
    ],
  },
  {
    id: 'hairProvided',
    label: 'Braiding Hair',
    noteLabel: 'Braiding hair',
    type: 'select',
    options: [
      'I will bring my own braiding hair',
      'Not sure yet',
    ],
    helper: 'Braids by Deb does not sell or supply braiding hair — please bring your own to your appointment (available at most beauty supply stores).',
  },
  {
    id: 'takeDown',
    label: 'Take-Down Needed?',
    noteLabel: 'Take-down',
    type: 'select',
    options: ['No — my hair will be ready', 'Yes — my hair is still in a previous style'],
    optionNotes: {
      'Yes — my hair is still in a previous style': {
        tone: 'warning',
        text: 'Please arrive with your hair already taken down and detangled — take-down isn’t offered at the studio, and appointments can’t start until hair is ready.',
      },
    },
  },
  {
    id: 'specialRequests',
    label: 'Special Requests',
    noteLabel: 'Requests',
    type: 'textarea',
    placeholder: 'Anything Deb should know — hair brand, scalp sensitivity, edges, inspiration…',
    maxLength: 200,
  },
]

export type HairDetails = Record<string, string>

// Compose the notes field the backend already accepts (≤500 chars).
export function composeNotes(
  inspiration: string,
  hairDetails: HairDetails,
  firstVisit: boolean,
): string {
  const lines: string[] = []
  if (inspiration) lines.push(inspiration)
  if (firstVisit) lines.push('First visit to Braids by Deb')
  for (const field of HAIR_DETAIL_FIELDS) {
    const value = hairDetails[field.id]?.trim()
    if (value) lines.push(`${field.noteLabel}: ${value}`)
  }
  return lines.join(' | ').slice(0, 500)
}

// ── Formatting helpers ─────────────────────────────────────────────────────
export function formatBookingDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatBookingTime(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// "2026-06-04T10:00:00-05:00" → "10:00" (the HH:mm value the API stores)
export function rawTimeFromSlot(slot: AvailabilitySlot): string {
  const parts = slot.datetime.split('T')[1]?.split(':') ?? []
  return `${parts[0] ?? '00'}:${parts[1] ?? '00'}`
}

export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

export function remainingBalanceCents(service: SalonService | undefined): number | null {
  if (!service) return null
  return Math.max(0, service.startingPrice - DEPOSIT_AMOUNT_CENTS)
}
