import { Appointment, ContactFormData } from '@/types'
import { PaymentMethodId } from '@/lib/data'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')

type ApiErrorPayload = {
  message?: string
  details?: Record<string, string>
}

export type CreateAppointmentInput = {
  serviceId: string
  serviceLengthId?: string
  clientName: string
  clientEmail: string
  clientPhone: string
  date: string
  time: string
  notes: string
  paymentMethod: PaymentMethodId
}

function getApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error('Booking API is not configured. Set NEXT_PUBLIC_API_BASE_URL before building the web app.')
  }

  return `${API_BASE_URL}${path}`
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const errorBody = (body || {}) as ApiErrorPayload
    throw new Error(errorBody.message || `Request failed with status ${response.status}`)
  }

  return body as T
}

export async function fetchBookedSlots(date: string): Promise<string[]> {
  const response = await fetch(getApiUrl(`/appointments?date=${encodeURIComponent(date)}&status=confirmed`), {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
  })

  const data = await parseResponse<{ appointments: Appointment[] }>(response)
  return data.appointments
    .filter((appointment) => appointment.date === date && appointment.status !== 'cancelled')
    .map((appointment) => appointment.time)
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const response = await fetch(getApiUrl('/appointments'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  const data = await parseResponse<{ appointment: Appointment }>(response)
  return data.appointment
}

export async function fetchAppointmentsByEmail(email: string): Promise<Appointment[]> {
  const response = await fetch(getApiUrl(`/appointments?email=${encodeURIComponent(email)}`), {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
  })

  const data = await parseResponse<{ appointments: Appointment[] }>(response)
  return data.appointments
}

export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  const response = await fetch(getApiUrl(`/appointments/${encodeURIComponent(appointmentId)}`), {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  })

  const data = await parseResponse<{ appointment: Appointment }>(response)
  return data.appointment
}

export async function submitContactMessage(input: ContactFormData): Promise<{ message: string; contactMessageId: string }> {
  const response = await fetch(getApiUrl('/contacts'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  return parseResponse<{ message: string; contactMessageId: string }>(response)
}
