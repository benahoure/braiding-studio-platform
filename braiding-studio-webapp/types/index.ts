export interface Service {
  id: string
  name: string
  category: ServiceCategory
  price: number
  duration: number // in minutes
  description: string
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
  | 'Other'

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
