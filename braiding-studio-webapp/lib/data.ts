import { Service, ServiceCategory, Appointment } from '@/types'

export const DEPOSIT_AMOUNT = 50


export const SERVICES: Service[] = [
  // Box Braids
  {
    id: 'bb-small',
    name: 'Small Box Braids',
    category: 'Box Braids',
    price: 220,
    duration: 360,
    description: 'Tiny, intricate box braids for a detailed, elegant look. Long-lasting protective style.',
    popular: true,
    image: '/images/Small Box Braids.png',
  },
  {
    id: 'bb-medium',
    name: 'Medium Box Braids',
    category: 'Box Braids',
    price: 180,
    duration: 300,
    description: 'Classic medium-sized box braids. Versatile and perfect for any occasion.',
    popular: true,
    image: '/images/Medium Box Braids.jpg',
  },
  {
    id: 'bb-large',
    name: 'Large Box Braids',
    category: 'Box Braids',
    price: 140,
    duration: 180,
    description: 'Bold, statement large box braids. Quick install with maximum impact.',
    image: '/images/Large Box Braids.png',
  },
  // Knotless Braids
  {
    id: 'kl-small',
    name: 'Small Knotless Braids',
    category: 'Knotless Braids',
    price: 260,
    duration: 420,
    description: 'Pain-free knotless braids with a natural, seamless look from root to tip.',
    popular: true,
    image: '/images/Small Knotless Braids.jpg',
  },
  {
    id: 'kl-medium',
    name: 'Medium Knotless Braids',
    category: 'Knotless Braids',
    price: 210,
    duration: 360,
    description: 'Our most requested style — medium knotless braids with zero tension at the scalp.',
    popular: true,
    image: '/images/Medium-Knotless-Braids.jpg',
  },
  {
    id: 'kl-large',
    name: 'Large Knotless Braids',
    category: 'Knotless Braids',
    price: 170,
    duration: 240,
    description: 'Chunky knotless braids for a trendy, carefree aesthetic.',
    image: '/images/Meduim-Knotless-Braids.jpg',
  },
  // Cornrows
  {
    id: 'cr-straight',
    name: 'Straight Back Cornrows',
    category: 'Cornrows',
    price: 80,
    duration: 120,
    description: 'Classic straight-back cornrows. Clean, neat, and timeless.',
    image: '/images/Straight Back Cornrows.jpg',
  },
  {
    id: 'cr-goddess',
    name: 'Goddess Cornrows',
    category: 'Cornrows',
    price: 150,
    duration: 240,
    description: 'Elevated cornrow style with curly ends for a glamorous finish.',
    image: '/images/Goddess Conrow.jpg',
  },
  // Boho Braids
  {
    id: 'boho-small',
    name: 'Small Boho Braids',
    category: 'Boho Braids',
    price: 230,
    duration: 360,
    description: 'Small boho knotless braids with flowing curly ends for a free-spirited, romantic look.',
    popular: true,
    image: '/images/Small Boho Braids.jpg',
  },
  {
    id: 'boho-medium',
    name: 'Medium Boho Braids',
    category: 'Boho Braids',
    price: 195,
    duration: 300,
    description: 'Medium boho braids blending protective styling with effortless bohemian flair.',
    image: '/images/Medium boho Braids.jpg',
  },
  {
    id: 'boho-twist',
    name: 'Medium Twist Boho Braids',
    category: 'Boho Braids',
    price: 215,
    duration: 330,
    description: 'Boho-style twist braids with curly accents for a textured, earthy aesthetic.',
    image: '/images/Medium Twist Boho Braids.jpg',
  },
  // Fulani Braids
  {
    id: 'fulani-classic',
    name: 'Fulani Braids',
    category: 'Fulani Braids',
    price: 130,
    duration: 150,
    description: 'Traditional Fulani braiding pattern with a central cornrow, side braids, and beaded accents. A timeless West African style.',
    popular: true,
    image: '/images/Funali braids.jpg',
  },
  {
    id: 'fulani-style',
    name: 'Fulani Hairstyle',
    category: 'Fulani Braids',
    price: 150,
    duration: 180,
    description: 'An elevated Fulani-inspired look with intricate partings, loose braids, and decorative details.',
    image: '/images/Funali Hairstyle.jpg',
  },
  // Kids Braids
  {
    id: 'kids-cornrows',
    name: 'Kids Cornrows',
    category: 'Kids Braids',
    price: 60,
    duration: 90,
    description: 'Gentle, kid-friendly cornrow styling. Patient and caring service for little ones.',
    image: '/images/Kids Cornrows.jpg',
  },
  {
    id: 'kids-box',
    name: 'Kids Box Braids',
    category: 'Kids Braids',
    price: 100,
    duration: 150,
    description: 'Box braids sized perfectly for kids. Protective and adorable.',
    image: '/images/Kid Box Braids.png',
  },
  {
    id: 'kids-ponytails',
    name: 'Kids Braided Ponytails',
    category: 'Kids Braids',
    price: 50,
    duration: 60,
    description: 'Fun braided ponytail styles for children of all ages.',
    image: '/images/Kids Braided Ponytails.jpg',
  },
  // Other
  {
    id: 'other-passion',
    name: 'Passion Twists',
    category: 'Other',
    price: 175,
    duration: 270,
    description: 'Bohemian, free-flowing passion twists for a carefree, romantic aesthetic.',
    popular: true,
    image: '/images/Twist Braids.jpg',
  },
]

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Box Braids',
  'Knotless Braids',
  'Cornrows',
  'Boho Braids',
  'Fulani Braids',
  'Kids Braids',
  'Other',
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
  address: '2847 Oak Lawn Ave, Suite 104',
  city: 'Dallas, TX 75219',
  phone: '(945) 350-5388',
  email: 'hello@braidsbydeb.com',
  instagram: '@braided_bydebs',
  instagramUrl: 'https://www.instagram.com/braided_bydebs/',
  facebook: 'BraidsByDeb',
  tiktok: '@braids_by_debs',
  tiktokUrl: 'https://www.tiktok.com/@braids_by_debs',
  hours: {
    'Mon – Fri': '9:00 AM – 7:00 PM',
    'Saturday': '8:00 AM – 6:00 PM',
    'Sunday': '10:00 AM – 4:00 PM',
  },
}

// localStorage helpers
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

  const headers = ['ID', 'Service', 'Date', 'Time', 'Client Name', 'Email', 'Phone', 'Price', 'Deposit', 'Payment Method', 'Duration (min)', 'Status', 'Notes', 'Booked At']
  const rows = appointments.map(a => [
    a.id,
    a.serviceName,
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

export function getBookedSlots(date: string): string[] {
  const appointments = getAppointments()
  return appointments
    .filter(a => a.date === date && a.status !== 'cancelled')
    .map(a => a.time)
}
