export interface Service {
  id: string
  name: string
  category: ServiceCategory
  duration: number // in minutes
  description: string
  price?: number
  lengthOptions?: ServiceLengthOption[]
  isStartingPrice?: boolean
  popular?: boolean
  image?: string
}

export type ServiceCategory =
  | 'Box Braids'
  | 'Knotless Braids'
  | 'Cornrows'
  | 'Boho Braids'
  | 'Fulani Braids'
  | 'Kids Braids'
  | 'Twist Braids'

export type ServiceLengthId =
  | 'mid-back'
  | 'waist-length'
  | 'butt-length'
  | 'mid'

export interface ServiceLengthOption {
  id: ServiceLengthId
  label: string
  price: number
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface Appointment {
  id: string
  serviceId: string
  serviceName: string
  servicePrice: number
  serviceDuration: number
  serviceLength?: string
  serviceLengthId?: ServiceLengthId
  clientName: string
  clientEmail: string
  clientPhone: string
  date: string // ISO date string
  time: string
  notes?: string
  status: 'confirmed' | 'cancelled' | 'completed'
  paymentMethod?: string
  createdAt: string
}

export interface BookingFormData {
  serviceId: string
  serviceLengthId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  date: Date | undefined
  time: string
  notes: string
}

export interface ContactFormData {
  name: string
  email: string
  phone: string
  message: string
}
