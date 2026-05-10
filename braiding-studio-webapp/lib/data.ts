import { Appointment, Service, ServiceCategory, ServiceLengthId, ServiceLengthOption } from '@/types'

export const DEPOSIT_AMOUNT = 50

const LENGTH_LABELS: Record<ServiceLengthId, string> = {
  'mid-back': 'Mid Back',
  'waist-length': 'Waist Length',
  'butt-length': 'Butt Length',
  mid: 'Mid',
}

function createLengthOption(id: ServiceLengthId, price: number): ServiceLengthOption {
  return {
    id,
    label: LENGTH_LABELS[id],
    price,
  }
}

function createLengthOptions(prices: Partial<Record<ServiceLengthId, number>>): ServiceLengthOption[] {
  return (Object.entries(prices) as Array<[ServiceLengthId, number]>).map(([id, price]) => createLengthOption(id, price))
}

export const SERVICES: Service[] = [
  {
    id: 'bb-small',
    name: 'Small Box Braids',
    category: 'Box Braids',
    duration: 360,
    description: 'Tiny, intricate box braids for a detailed, elegant look with flexible length options.',
    popular: true,
    image: '/images/Small Box Braids.png',
    lengthOptions: createLengthOptions({
      'mid-back': 200,
      'waist-length': 300,
      'butt-length': 340,
    }),
  },
  {
    id: 'bb-medium',
    name: 'Medium Box Braids',
    category: 'Box Braids',
    duration: 300,
    description: 'Classic medium-sized box braids that balance fullness, comfort, and versatility.',
    popular: true,
    image: '/images/Medium Box Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 180,
      'waist-length': 240,
      'butt-length': 280,
    }),
  },
  {
    id: 'bb-large',
    name: 'Large Box Braids',
    category: 'Box Braids',
    duration: 180,
    description: 'Bold large box braids with quicker install time and strong statement styling.',
    image: '/images/Large Box Braids.png',
    lengthOptions: createLengthOptions({
      'mid-back': 160,
      'waist-length': 200,
      'butt-length': 240,
    }),
  },
  {
    id: 'kl-small',
    name: 'Small Knotless Braids',
    category: 'Knotless Braids',
    duration: 420,
    description: 'Pain-free knotless braids with a seamless finish and premium length flexibility.',
    popular: true,
    image: '/images/Small Knotless Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 200,
      'waist-length': 300,
      'butt-length': 340,
    }),
  },
  {
    id: 'kl-medium',
    name: 'Medium Knotless Braids',
    category: 'Knotless Braids',
    duration: 360,
    description: 'A client favorite for a natural knotless look with easy everyday styling.',
    popular: true,
    image: '/images/Medium-Knotless-Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 180,
      'waist-length': 240,
      'butt-length': 280,
    }),
  },
  {
    id: 'kl-large',
    name: 'Large Knotless Braids',
    category: 'Knotless Braids',
    duration: 240,
    description: 'Chunky knotless braids that deliver a softer install with a bold, modern finish.',
    image: '/images/Meduim-Knotless-Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 160,
      'waist-length': 200,
      'butt-length': 240,
    }),
  },
  {
    id: 'boho-small',
    name: 'Small Boho Braids',
    category: 'Boho Braids',
    duration: 360,
    description: 'Small boho braids with curly accents for a romantic, free-flowing protective style.',
    popular: true,
    image: '/images/Small Boho Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 280,
      'waist-length': 320,
      'butt-length': 360,
    }),
  },
  {
    id: 'boho-medium',
    name: 'Medium Boho Braids',
    category: 'Boho Braids',
    duration: 300,
    description: 'Medium boho braids that blend softness, movement, and a polished bohemian finish.',
    image: '/images/Medium boho Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 240,
      'waist-length': 280,
      'butt-length': 320,
    }),
  },
  {
    id: 'boho-large',
    name: 'Large Boho Braids',
    category: 'Boho Braids',
    duration: 240,
    description: 'Large boho braids for a lighter install with soft texture and standout length options.',
    image: '/images/Medium boho Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 200,
      'waist-length': 240,
      'butt-length': 280,
    }),
  },
  {
    id: 'twist-small',
    name: 'Small Twist Braids',
    category: 'Twist Braids',
    duration: 330,
    description: 'Small twist braids with graceful movement and versatile lengths for a fuller finish.',
    popular: true,
    image: '/images/Twist Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 260,
      'waist-length': 300,
      'butt-length': 340,
    }),
  },
  {
    id: 'twist-medium',
    name: 'Medium Twist Braids',
    category: 'Twist Braids',
    duration: 270,
    description: 'Medium twist braids that keep texture, body, and easy maintenance in balance.',
    image: '/images/Twist Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 220,
      'waist-length': 240,
      'butt-length': 280,
    }),
  },
  {
    id: 'twist-large',
    name: 'Large Twist Braids',
    category: 'Twist Braids',
    duration: 210,
    description: 'Large twist braids with a quicker install and bold protective styling.',
    image: '/images/Twist Braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 200,
      'waist-length': 220,
      'butt-length': 260,
    }),
  },
  {
    id: 'cornrows',
    name: 'Cornrows',
    category: 'Cornrows',
    duration: 180,
    description: 'Book cornrows as a custom style consultation and final pricing starts from this base rate.',
    image: '/images/Straight Back Cornrows.jpg',
    price: 180,
    isStartingPrice: true,
  },
  {
    id: 'fulani-small',
    name: 'Small Fulani Braids',
    category: 'Fulani Braids',
    duration: 180,
    description: 'Detailed Fulani braids with signature parting and decorative styling in longer lengths.',
    popular: true,
    image: '/images/Funali braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 200,
      'waist-length': 300,
      'butt-length': 340,
    }),
  },
  {
    id: 'fulani-medium',
    name: 'Medium Fulani Braids',
    category: 'Fulani Braids',
    duration: 150,
    description: 'A medium Fulani look that keeps the classic pattern with easier day-to-day wear.',
    image: '/images/Funali braids.jpg',
    lengthOptions: createLengthOptions({
      'mid-back': 180,
      'waist-length': 240,
      'butt-length': 280,
    }),
  },
  {
    id: 'fulani-hairstyle',
    name: 'Fulani Hairstyle',
    category: 'Fulani Braids',
    duration: 180,
    description: 'A styled Fulani-inspired look with decorative detail and a fixed service price.',
    image: '/images/Funali Hairstyle.jpg',
    price: 150,
  },
  {
    id: 'kids-cornrows',
    name: 'Kids Cornrows',
    category: 'Kids Braids',
    duration: 90,
    description: 'Gentle cornrow styling for kids with a neat, protective finish.',
    image: '/images/Kids Cornrows.jpg',
    lengthOptions: createLengthOptions({
      mid: 120,
    }),
  },
  {
    id: 'kids-box',
    name: 'Kids Box Braids',
    category: 'Kids Braids',
    duration: 150,
    description: 'Protective kids box braids designed for comfort, neatness, and easy upkeep.',
    image: '/images/Kid Box Braids.png',
    lengthOptions: createLengthOptions({
      mid: 160,
    }),
  },
  {
    id: 'kids-knotless',
    name: 'Kids Knotless',
    category: 'Kids Braids',
    duration: 150,
    description: 'Kids knotless braids with a soft install and natural-looking finish.',
    lengthOptions: createLengthOptions({
      mid: 160,
    }),
  },
  {
    id: 'kids-other',
    name: 'Kids Other Styles',
    category: 'Kids Braids',
    duration: 120,
    description: 'Book a kids custom braid style with one mid length option and pricing starting from this rate.',
    image: '/images/Kids Braided Ponytails.jpg',
    lengthOptions: createLengthOptions({
      mid: 120,
    }),
    isStartingPrice: true,
  },
]

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Box Braids',
  'Knotless Braids',
  'Cornrows',
  'Boho Braids',
  'Fulani Braids',
  'Kids Braids',
  'Twist Braids',
]

export const TIME_SLOTS = [
  '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM',
  '5:00 PM',
]

export const PAYMENT_METHODS = [
  {
    id: 'card',
    label: 'Bank Card',
    icon: '💳',
    instruction: 'We will send you a secure payment link via text message after booking.',
  },
  {
    id: 'zelle',
    label: 'Zelle',
    icon: '🟣',
    instruction: 'Send $50 to (214) 555-0192 — use "Deposit" as memo.',
  },
  {
    id: 'cashapp',
    label: 'CashApp',
    icon: '💚',
    instruction: 'Send $50 to $BraidsByDeb — use "Deposit" as memo.',
  },
] as const

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id']

export const BUSINESS_INFO = {
  name: 'Braids by Deb',
  tagline: 'Your Crown. Our Craft.',
  address: '2001 Comming Soon, Patience Please',
  city: 'Garland, TX 75041',
  phone: '(945) 350-5388',
  email: 'bookings@braidsbydeb.com',
  instagram: '@braided_bydebs',
  instagramUrl: 'https://www.instagram.com/braided_bydebs/',
  facebook: 'BraidsByDeb',
  tiktok: '@braids_by_debs',
  tiktokUrl: 'https://www.tiktok.com/@braids_by_debs',
  hours: {
    'Mon – Fri': '9:00 AM – 7:00 PM',
    Saturday: '8:00 AM – 6:00 PM',
    Sunday: '10:00 AM – 4:00 PM',
  },
}

// localStorage helpers retained for admin/test tooling until that page is moved to the API.
const STORAGE_KEY = 'braidsbydeb_appointments'

export function getAppointments(): Appointment[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveAppointment(appointment: Appointment): void {
  if (typeof window === 'undefined') return
  const appointments = getAppointments()
  appointments.push(appointment)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments))
}

export function updateAppointment(id: string, updates: Partial<Appointment>): void {
  if (typeof window === 'undefined') return
  const appointments = getAppointments()
  const idx = appointments.findIndex(a => a.id === id)
  if (idx !== -1) {
    appointments[idx] = { ...appointments[idx], ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments))
  }
}

export function deleteAppointment(id: string): void {
  if (typeof window === 'undefined') return
  const appointments = getAppointments().filter(a => a.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments))
}

export function exportAppointmentsCSV(): void {
  const appointments = getAppointments()
  if (appointments.length === 0) return

  const headers = ['ID', 'Service', 'Length', 'Date', 'Time', 'Client Name', 'Email', 'Phone', 'Price', 'Deposit', 'Payment Method', 'Duration (min)', 'Status', 'Notes', 'Booked At']
  const rows = appointments.map(a => [
    a.id,
    a.serviceName,
    a.serviceLength || '',
    a.date,
    a.time,
    a.clientName,
    a.clientEmail,
    a.clientPhone,
    `$${a.servicePrice}`,
    `$${DEPOSIT_AMOUNT}`,
    a.paymentMethod || '',
    a.serviceDuration,
    a.status,
    a.notes || '',
    new Date(a.createdAt).toLocaleString(),
  ])

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function generateId(): string {
  return `apt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

export function getServiceById(id: string): Service | undefined {
  return SERVICES.find(s => s.id === id)
}

export function getServiceLengthOption(service: Service, lengthId?: string): ServiceLengthOption | undefined {
  if (!service.lengthOptions || !lengthId) return undefined
  return service.lengthOptions.find(option => option.id === lengthId)
}

export function getServiceDefaultLengthOption(service: Service): ServiceLengthOption | undefined {
  if (!service.lengthOptions || service.lengthOptions.length !== 1) return undefined
  return service.lengthOptions[0]
}

export function serviceRequiresLengthSelection(service: Service): boolean {
  return (service.lengthOptions?.length || 0) > 1
}

export function getServicePrice(service: Service, lengthId?: string): number {
  const selectedLength = getServiceLengthOption(service, lengthId)
  if (selectedLength) return selectedLength.price

  const defaultLength = getServiceDefaultLengthOption(service)
  if (defaultLength) return defaultLength.price

  if (typeof service.price === 'number') return service.price

  const firstLength = service.lengthOptions?.[0]
  return firstLength?.price || 0
}

export function getServiceStartingPrice(service: Service): number {
  if (service.lengthOptions?.length) {
    return Math.min(...service.lengthOptions.map(option => option.price))
  }
  return service.price || 0
}

export function formatServicePriceLabel(service: Service, lengthId?: string): string {
  const price = getServicePrice(service, lengthId)

  if (service.isStartingPrice && !lengthId && !service.lengthOptions?.length) {
    return `Starting at $${price}`
  }

  if (service.isStartingPrice && service.lengthOptions?.length === 1) {
    return `${service.lengthOptions[0].label} • Starting at $${price}`
  }

  return `$${price}`
}

export function getBookedSlots(date: string): string[] {
  const appointments = getAppointments()
  return appointments
    .filter(a => a.date === date && a.status !== 'cancelled')
    .map(a => a.time)
}
