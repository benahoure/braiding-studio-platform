import { z } from 'zod'

const SALON_TIME_ZONE = 'America/Chicago'

function addDaysToDateString(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

export function dateStringInSalonTimeZone(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SALON_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function tomorrowInSalonTimeZone(date = new Date()): string {
  return addDaysToDateString(dateStringInSalonTimeZone(date), 1)
}

function maxBookingDateInSalonTimeZone(date = new Date()): string {
  return addDaysToDateString(dateStringInSalonTimeZone(date), 90)
}

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number is required.')
  .refine(
    (val) => {
      const digits = val.replace(/\D/g, '')
      // 10 digits, or 11 with the +1 US country code (browser autofill)
      return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
    },
    'Enter a complete 10-digit phone number.'
  )
  .refine(
    (val) => !/^(\d)\1{9}$/.test(val.replace(/\D/g, '')),
    'Enter a real phone number.'
  )

const futureDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a preferred date.')
  .refine((value) => {
    return value >= tomorrowInSalonTimeZone() && value <= maxBookingDateInSalonTimeZone()
  }, 'Choose a date within the next 90 days, starting tomorrow.')

export const bookingSchema = z.object({
  serviceId: z.string().min(1, 'Choose a service.'),
  portfolioStyleId: z.string().trim().max(120).optional(),
  clientName: z.string().trim().min(2, 'Enter your name.').max(100),
  clientEmail: z.string().trim().email('Enter a valid email address.'),
  clientPhone: phoneSchema,
  preferredDate: futureDate,
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a preferred time.'),
  notes: z.string().max(500, 'Please keep notes under 500 characters.').optional(),
  referralSource: z
    .enum(['instagram', 'tiktok', 'google', 'yelp', 'friend', 'other', ''])
    .optional(),
  honeypot: z.string().max(0, 'Invalid submission.'),
})

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  // NOTE: backend /contact endpoint must be updated to accept missing email before removing frontend requirement
  email: z.string().trim().email('Enter a valid email address.').optional().or(z.literal('')),
  phone: phoneSchema,  // now required — was optional
  message: z.string().trim().min(10, 'Tell us how we can help.').max(1000),
  services: z.array(z.string().max(60)).max(20).default([]),
  honeypot: z.string().max(0, 'Invalid submission.'),
})

export const reviewSubmissionSchema = z.object({
  clientName: z.string().trim().min(2, 'Enter your name.').max(50),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, 'Tell us a little more — at least 10 characters.').max(1000),
  honeypot: z.string().max(0, 'Invalid submission.'),
})

export type BookingFormData = z.infer<typeof bookingSchema>
export type ContactFormData = z.infer<typeof contactSchema>
export type ReviewSubmissionData = z.infer<typeof reviewSubmissionSchema>
