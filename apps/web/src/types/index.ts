// Braids by Deb service taxonomy — four main categories, style families as
// subcategories. Mirrors lambdas/scripts/seed_data.py.
export type ServiceCategory =
  | 'braids-protective-styles'
  | 'natural-ponytails'
  | 'sew-in-wigs'
  | 'kids'

export type ServiceSubcategory =
  | 'box-braids'
  | 'knotless-braids'
  | 'boho-braids'
  | 'twist-braids'
  | 'cornrows'
  | 'fulani-braids'
  | 'natural-styling'
  | 'ponytails'
  | 'sew-in'
  | 'wig-cornrows'
  | 'crochet'
  | 'kids-braids'
  | 'toddler-styles'

export type PortfolioCategory =
  | 'knotless'
  | 'boho'
  | 'box-braids'
  | 'cornrows'
  | 'fulani'
  | 'twists'
  | 'kids'

export type DayName =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface BusinessHours {
  open: string
  close: string
  closed: boolean
}

export interface BusinessSettings {
  businessName: string
  phone: string
  email: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  hours: Record<DayName, BusinessHours>
  socialLinks: {
    instagram: string | null
    facebook: string | null
    tiktok: string | null
  }
  googleMapsUrl: string
  googleReviewUrl: string
  announcementBanner: string | null
  bookingNotice: string
  founderImageUrl?: string | null
  contactImageUrl?: string | null
  /** About page "Her Story" section photo. */
  storyImageUrl?: string | null
  /** Specific dates (YYYY-MM-DD) the salon is closed — days off, vacations. */
  blockedDates?: string[]
  /** Partial-day blocks: the salon is unavailable date start–end (HH:MM). */
  blockedSlots?: BlockedSlot[]
}

export interface BlockedSlot {
  date: string
  start: string
  end: string
}

export interface SalonService {
  serviceId: string
  name: string
  category: ServiceCategory
  subcategory?: ServiceSubcategory
  description: string
  startingPrice: number
  priceUnit: 'cents'
  durationMinutes: number
  imageUrl: string
  imageAlt?: string
  images?: string[]
  imagePosition?: string
  featured: boolean
  active: boolean
  bookingCount?: number
  displayOrder?: number
  /** Explicit size tier (Small/Medium/Large/Jumbo) — drives the booking size pills. */
  size?: string | null
  /** Optional length tiers (e.g. Mid-back / Waist / Butt length) with prices in cents. */
  lengths?: ServiceLengthOption[]
}

export interface ServiceLengthOption {
  label: string
  price: number
}

export interface PortfolioItem {
  styleId: string
  title: string
  category: PortfolioCategory
  imageUrl: string
  thumbnailUrl: string
  featured: boolean
  active: boolean
  createdAt: string
}

export interface Review {
  reviewId: string
  clientName: string
  rating: number
  body: string
  serviceName?: string
  avatarUrl?: string
  createdAt: string
  source: 'website' | 'google'
  status: 'approved' | 'pending' | 'rejected'
  featured: boolean
}

export interface ReviewAggregates {
  averageRating: number
  totalCount: number
}

export interface AppointmentRequest {
  serviceId: string
  portfolioStyleId?: string
  clientName: string
  clientEmail: string
  clientPhone: string
  preferredDate: string
  preferredTime: string
  lengthLabel?: string
  notes?: string
  referralSource?: 'instagram' | 'tiktok' | 'google' | 'yelp' | 'friend' | 'other' | ''
  honeypot: string
}

export interface ContactRequest {
  name: string
  email?: string             // optional — backend /contact endpoint must also be updated to accept missing email
  phone: string              // now required
  message: string
  services: string[]
  inspirationPhotoName?: string  // filename only; backend handles as informational
  honeypot: string
}

export interface ReviewSubmission {
  clientName: string
  rating: number
  body: string
  honeypot: string
}

export type DepositStatus = 'paid' | 'refund_pending' | 'refunded' | 'forfeited' | 'transferred' | 'applied_to_balance'
export type AppointmentStatus = 'pending_payment' | 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export type AvailabilityDateStatus = 'available' | 'fully_booked' | 'closed' | 'past' | 'blocked_24hr' | 'blocked'

export interface AvailabilityDate {
  date: string
  status: AvailabilityDateStatus
  availableSlots: number
}

export interface AvailabilitySlot {
  time: string       // display e.g. "10:00 AM"
  datetime: string   // ISO 8601 e.g. "2026-06-04T10:00:00-05:00"
  available: boolean
}

export interface MonthAvailability {
  month: string
  timezone: string
  dates: AvailabilityDate[]
}

export interface DateAvailability {
  date: string
  timezone: string
  slots: AvailabilitySlot[]
}

export interface AdminAppointment extends AppointmentRequest {
  appointmentId: string
  appointmentToken?: string
  serviceName: string
  servicePrice?: number
  status: AppointmentStatus
  depositStatus?: DepositStatus | null
  depositAmount?: number
  stripePaymentIntentId?: string
  stripeChargeId?: string
  refundStatus?: 'none' | 'pending' | 'completed' | 'failed'
  refundFailureReason?: string | null
  adminNote?: string | null
  adminNotes?: string | null
  adminOverrideReason?: string | null
  rescheduledAt?: string | null
  rescheduledFrom?: string | null
  rescheduledBy?: 'client' | 'admin' | null
  createdAt: string
}

export interface PortalAppointment {
  appointmentId: string
  status: AppointmentStatus
  depositStatus: DepositStatus | null
  depositAmount: number
  remainingBalance: number
  serviceId?: string
  serviceName: string
  lengthLabel?: string | null
  servicePrice: number
  preferredDate: string
  preferredTime: string
  clientName: string
  clientEmail: string
  clientPhone: string
  notes?: string
  adminNote?: string | null
  createdAt: string
  rescheduledAt?: string | null
}

export interface AdminReview {
  reviewId: string
  clientName: string
  rating: number
  body: string
  serviceName?: string
  avatarUrl?: string
  approved: boolean
  featured: boolean
  source: 'website' | 'google'
  createdAt: string
  updatedAt?: string
}

export interface AdminContactMessage {
  messageId: string
  name: string
  email: string
  phone: string
  message: string
  services: string[]
  read: boolean
  createdAt: string
  replied?: boolean
  replyText?: string
  repliedAt?: string
}
