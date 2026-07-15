import { describe, expect, it } from 'vitest'

import { BOOKING_CATEGORIES, groupedStylesFor, sizeLabelFor } from '../components/booking/bookingConfig'
import { mockServices } from '../lib/mockData'

// Style-first booking browsing: category → style family → size.
// Mirrors the real seeded catalog via mockData.

const braids = BOOKING_CATEGORIES.find((c) => c.id === 'braids-protective-styles')!
const kids = BOOKING_CATEGORIES.find((c) => c.id === 'kids')!

describe('groupedStylesFor', () => {
  it('groups the braids category into style families ordered by taxonomy', () => {
    const groups = groupedStylesFor(braids, mockServices)!
    expect(groups).not.toBeNull()
    const labels = groups.map((g) => g.label)
    expect(labels).toContain('Boho Braids')
    expect(labels).toContain('Box Braids')
    expect(labels).toContain('Knotless Braids')
    // Taxonomy order: Box before Boho before Fulani
    expect(labels.indexOf('Box Braids')).toBeLessThan(labels.indexOf('Boho Braids'))
  })

  it('sorts sizes Small → Medium → Large within a family', () => {
    const groups = groupedStylesFor(braids, mockServices)!
    const boho = groups.find((g) => g.label === 'Boho Braids')!
    const names = boho.services.map((s) => s.name)
    expect(names[0]).toMatch(/^Small/)
    expect(names[names.length - 1]).toMatch(/^Large/)
  })

  it('keeps single-service families (Cornrows) as one-tap selections', () => {
    const groups = groupedStylesFor(braids, mockServices)!
    const cornrows = groups.find((g) => g.label === 'Cornrows')
    expect(cornrows).toBeDefined()
    expect(cornrows!.services).toHaveLength(1)
  })

  it('returns null for categories where grouping adds nothing (Kids)', () => {
    expect(groupedStylesFor(kids, mockServices)).toBeNull()
  })

  it('only includes active services', () => {
    const withInactive = mockServices.map((s) =>
      s.subcategory === 'boho-braids' ? { ...s, active: false } : s,
    )
    const groups = groupedStylesFor(braids, withInactive)!
    expect(groups.find((g) => g.label === 'Boho Braids')).toBeUndefined()
  })
})

describe('sizeLabelFor', () => {
  it('extracts the size word from sized names', () => {
    const small = mockServices.find((s) => s.name === 'Small Boho Braids')!
    expect(sizeLabelFor(small)).toBe('Small')
  })

  it('falls back to the full name for unsized services', () => {
    const hairstyle = mockServices.find((s) => s.name === 'Fulani Hairstyle')!
    expect(sizeLabelFor(hairstyle)).toBe('Fulani Hairstyle')
  })
})
