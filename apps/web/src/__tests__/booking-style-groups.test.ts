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

describe('length pricing helpers', () => {
  const svc = {
    ...mockServices[0],
    serviceId: 'test-lengths',
    startingPrice: 20000,
    lengths: [
      { label: 'Mid-back', price: 20000 },
      { label: 'Waist length', price: 30000 },
      { label: 'Butt length', price: 34000 },
    ],
  }

  it('resolves the exact price for a chosen length', async () => {
    const { resolvedPriceCents, priceIsExact } = await import('../components/booking/bookingConfig')
    expect(resolvedPriceCents(svc, 'Waist length')).toBe(30000)
    expect(priceIsExact(svc, 'Waist length')).toBe(true)
  })

  it('falls back to the from-price when no length chosen', async () => {
    const { resolvedPriceCents, priceIsExact } = await import('../components/booking/bookingConfig')
    expect(resolvedPriceCents(svc, '')).toBe(20000)
    expect(priceIsExact(svc, '')).toBe(false)
  })

  it('services without lengths are always from-price', async () => {
    const { resolvedPriceCents, priceIsExact, remainingBalanceCents } = await import(
      '../components/booking/bookingConfig'
    )
    const plain = mockServices.find((s) => s.serviceId === 'cornrows')!
    expect(resolvedPriceCents(plain, 'Waist length')).toBe(plain.startingPrice)
    expect(priceIsExact(plain, 'Waist length')).toBe(false)
    expect(remainingBalanceCents(svc, 'Butt length')).toBe(34000 - 2000)
  })

  it('hold key changes when the length changes (forces a fresh payment hold)', async () => {
    const { holdKeyFor } = await import('../components/booking/bookingReducer')
    const base = { serviceId: 'x', preferredDate: '2026-08-01', preferredTime: '09:00' }
    expect(holdKeyFor({ ...base, lengthLabel: 'Mid-back' })).not.toBe(
      holdKeyFor({ ...base, lengthLabel: 'Waist length' }),
    )
  })
})

describe('explicit size field', () => {
  it('explicit size wins over the name prefix', async () => {
    const { sizeLabelFor } = await import('../components/booking/bookingConfig')
    const svc = { ...mockServices[0], name: 'Box Braids Deluxe', size: 'Jumbo' }
    expect(sizeLabelFor(svc)).toBe('Jumbo')
  })

  it('falls back to name prefix when size is unset (existing catalog)', async () => {
    const { sizeLabelFor } = await import('../components/booking/bookingConfig')
    const svc = { ...mockServices[0], name: 'Small Box Braids', size: undefined }
    expect(sizeLabelFor(svc)).toBe('Small')
  })

  it('unsized service with explicit-size siblings still shows full name', async () => {
    const { sizeLabelFor } = await import('../components/booking/bookingConfig')
    const svc = { ...mockServices[0], name: 'Bob Boho', size: null }
    expect(sizeLabelFor(svc)).toBe('Bob Boho')
  })

  it('sorts by explicit size Small → Medium → Large → Jumbo regardless of names', async () => {
    const { groupedStylesFor, BOOKING_CATEGORIES, sizeLabelFor } = await import(
      '../components/booking/bookingConfig'
    )
    const braids = BOOKING_CATEGORIES.find((c) => c.id === 'braids-protective-styles')!
    const base = mockServices.find((s) => s.subcategory === 'box-braids')!
    // Names deliberately do NOT start with size words — only the field orders them.
    const custom = [
      { ...base, serviceId: 'x-l', name: 'Box Braids (chunky)', size: 'Large', displayOrder: 1 },
      { ...base, serviceId: 'x-s', name: 'Box Braids (fine)', size: 'Small', displayOrder: 2 },
      { ...base, serviceId: 'x-m', name: 'Box Braids (classic)', size: 'Medium', displayOrder: 3 },
      { ...base, serviceId: 'other', name: 'Cornrows', subcategory: 'cornrows' as const, size: null, displayOrder: 4 },
    ]
    const groups = groupedStylesFor(braids, custom)!
    const box = groups.find((g) => g.id === 'box-braids')!
    expect(box.services.map(sizeLabelFor)).toEqual(['Small', 'Medium', 'Large'])
  })
})
