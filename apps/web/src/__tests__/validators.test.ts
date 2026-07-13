import { describe, expect, it } from 'vitest'

import {
  bookingSchema,
  contactSchema,
  reviewSubmissionSchema,
  tomorrowInSalonTimeZone,
} from '../lib/validators'

describe('client validation', () => {
  it('accepts a valid booking request', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 2)
    const value = bookingSchema.safeParse({
      serviceId: 'svc-knotless-braids',
      portfolioStyleId: 'style-boho-braids',
      clientName: 'Amara Test',
      clientEmail: 'amara@example.com',
      clientPhone: '3175550123',
      preferredDate: tomorrow.toISOString().slice(0, 10),
      preferredTime: '10:00',
      notes: '',
      referralSource: 'instagram',
      honeypot: '',
    })
    expect(value.success).toBe(true)
    expect(value.data).toMatchObject({
      serviceId: 'svc-knotless-braids',
      portfolioStyleId: 'style-boho-braids',
    })
  })

  it('calculates tomorrow in the salon timezone instead of UTC', () => {
    const utcAfterMidnight = new Date('2026-05-28T00:30:00Z')

    expect(tomorrowInSalonTimeZone(utcAfterMidnight)).toBe('2026-05-28')
  })

  it('rejects honeypot values on contact and review forms', () => {
    expect(
      contactSchema.safeParse({
        name: 'Jordan',
        email: 'jordan@example.com',
        phone: '',
        message: 'I have a question about protective styles.',
        honeypot: 'bot text',
      }).success,
    ).toBe(false)
    expect(
      reviewSubmissionSchema.safeParse({
        clientName: 'Jordan T.',
        rating: 5,
        body: 'Deb took great care of my hair.',
        honeypot: 'bot text',
      }).success,
    ).toBe(false)
  })
})
