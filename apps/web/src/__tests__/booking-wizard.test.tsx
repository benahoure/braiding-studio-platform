import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BookingWizard } from '../components/booking/BookingWizard'
import { ApiRequestError, api } from '../lib/api'
import type { AppointmentRequest } from '../types'

function futureDateString() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  return date.toISOString().slice(0, 10)
}

function renderWizard(route = '/booking') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <BookingWizard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function mockServicesApi() {
  vi.spyOn(api, 'getServices').mockResolvedValue({
    services: [
      {
        serviceId: 'kl-medium',
        name: 'Medium Knotless Braids',
        category: 'braids-protective-styles',
        subcategory: 'knotless-braids',
        description: 'Medium knotless braids',
        startingPrice: 18000,
        priceUnit: 'cents',
        durationMinutes: 360,
        imageUrl: '',
        featured: true,
        active: true,
      },
      {
        serviceId: 'boho-small',
        name: 'Small Boho Braids',
        category: 'braids-protective-styles',
        subcategory: 'boho-braids',
        description: 'Small boho braids',
        startingPrice: 28000,
        priceUnit: 'cents',
        durationMinutes: 360,
        imageUrl: '',
        featured: false,
        active: true,
      },
    ],
  })
}

function mockAvailabilityApi(futureDate: string) {
  vi.spyOn(api, 'getMonthAvailability').mockResolvedValue({
    month: futureDate.slice(0, 7),
    timezone: 'America/Chicago',
    dates: [{ date: futureDate, status: 'available', availableSlots: 5 }],
  })
  vi.spyOn(api, 'getDateSlots').mockResolvedValue({
    date: futureDate,
    timezone: 'America/Chicago',
    slots: [{ time: '10:00 AM', datetime: `${futureDate}T10:00:00-05:00`, available: true }],
  })
}

describe('BookingWizard', () => {
  beforeEach(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  // Walks the wizard up to and including the "Review Booking" click.
  async function walkToReview(route: string, options?: { fillHairDetails?: boolean }) {
    const user = userEvent.setup()
    const futureDate = futureDateString()

    mockServicesApi()
    mockAvailabilityApi(futureDate)

    const createPaymentIntent = vi.spyOn(api, 'createPaymentIntent').mockResolvedValue({
      appointmentId: 'appt-test',
      clientSecret: 'pi_test_secret_fake',
    })

    renderWizard(route)

    // Step 1 — service preselected via URL: card shows selected state
    await screen.findByText('Choose Your Style')
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    // Step 2 — hair details (optional)
    await screen.findByLabelText(/hair color/i)
    if (options?.fillHairDetails) {
      await user.selectOptions(screen.getByLabelText(/hair color/i), 'Burgundy (99J)')
      await user.type(screen.getByLabelText(/special requests/i), 'Gentle on my edges please')
    }
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    // Step 3 — schedule from real (mocked) availability
    await screen.findByText('Select a Date')
    const futureDay = String(parseInt(futureDate.split('-')[2], 10))
    const dayButton = await screen.findByRole('button', { name: futureDay })
    await waitFor(() => expect(dayButton).toBeEnabled())
    await user.click(dayButton)
    await screen.findByText(/choose a time/i)
    const timeButton = await screen.findByRole('button', { name: /10:00/i }, { timeout: 3000 })
    await user.click(timeButton)
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    // Step 4 — client info
    await screen.findByLabelText(/full name/i)
    await user.type(screen.getByLabelText(/full name/i), 'Amara Test')
    await user.type(screen.getByLabelText(/email address/i), 'amara@example.com')
    await user.type(screen.getByLabelText(/phone number/i), '2145550123')
    await user.click(screen.getByRole('button', { name: /review booking/i }))

    return { user, createPaymentIntent, futureDate }
  }

  it('completes the full flow and only shows success after backend confirmation', async () => {
    const confirm = vi.spyOn(api, 'confirmAppointment').mockResolvedValue({
      appointmentId: 'appt-test',
      status: 'confirmed',
      message: 'ok',
      portalUrl: '/appointment/tok-123',
    })

    const { user, createPaymentIntent } = await walkToReview(
      '/booking?service=kl-medium&style=style-small-boho',
      { fillHairDetails: true },
    )

    // Review step reached — payment hold created exactly once
    await screen.findByText(/pay \$20 deposit & confirm/i)
    expect(createPaymentIntent).toHaveBeenCalledTimes(1)

    const payload = createPaymentIntent.mock.calls[0][0] as AppointmentRequest & { policyAccepted: boolean }
    expect(payload.serviceId).toBe('kl-medium')
    expect(payload.portfolioStyleId).toBe('style-small-boho')
    expect(payload.notes).toContain('Portfolio inspiration: Small Boho Braids')
    expect(payload.notes).toContain('Color: Burgundy (99J)')
    expect(payload.notes).toContain('Requests: Gentle on my edges please')

    // Review shows the summary
    expect(screen.getByText('Amara Test')).toBeInTheDocument()
    expect(screen.getAllByText('Medium Knotless Braids').length).toBeGreaterThan(0)

    // Cannot pay before accepting the policy
    const payButton = screen.getByRole('button', { name: /pay \$20 deposit & confirm/i })
    expect(payButton).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /i understand and agree/i }))
    expect(payButton).toBeEnabled()

    // No success screen before backend confirms
    expect(screen.queryByText(/your appointment is confirmed/i)).not.toBeInTheDocument()

    await user.click(payButton)
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('appt-test', 'pi_mock'))
    await screen.findByText(/your appointment is confirmed/i)
    expect(screen.getByText('appt-test')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view my appointment/i })).toHaveAttribute(
      'href',
      '/appointment/tok-123',
    )
  })

  it('prevents duplicate confirmation submissions', async () => {
    let resolveConfirm: (value: { appointmentId: string; status: string; message: string; portalUrl: string }) => void
    const confirm = vi.spyOn(api, 'confirmAppointment').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfirm = resolve
        }),
    )

    const { user } = await walkToReview('/booking?service=kl-medium')
    const payButton = await screen.findByRole('button', { name: /pay \$20 deposit & confirm/i })
    await user.click(screen.getByRole('checkbox', { name: /i understand and agree/i }))

    await user.click(payButton)
    await user.click(payButton) // second click while confirm is pending
    await user.click(payButton)

    resolveConfirm!({ appointmentId: 'appt-test', status: 'confirmed', message: 'ok', portalUrl: '' })
    await screen.findByText(/your appointment is confirmed/i)
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('blocks the info step on an invalid email and preserves values when navigating back', async () => {
    const user = userEvent.setup()
    const futureDate = futureDateString()
    mockServicesApi()
    mockAvailabilityApi(futureDate)

    renderWizard('/booking?service=kl-medium')

    await screen.findByText('Choose Your Style')
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    await screen.findByLabelText(/hair color/i)
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    await screen.findByText('Select a Date')
    const futureDay = String(parseInt(futureDate.split('-')[2], 10))
    const dayButton = await screen.findByRole('button', { name: futureDay })
    await waitFor(() => expect(dayButton).toBeEnabled())
    await user.click(dayButton)
    await screen.findByText(/choose a time/i)
    await user.click(await screen.findByRole('button', { name: /10:00/i }, { timeout: 3000 }))
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    // Invalid email blocks progress with an inline error
    await screen.findByLabelText(/full name/i)
    await user.type(screen.getByLabelText(/full name/i), 'Amara Test')
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.type(screen.getByLabelText(/phone number/i), '2145550123')
    await user.click(screen.getByRole('button', { name: /review booking/i }))
    await screen.findByText(/enter a valid email address/i)

    // Back through Schedule to Hair Details, then forward again — values preserved
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    await screen.findByText('Select a Date')
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    await screen.findByLabelText(/hair color/i)
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    await screen.findByText('Select a Date') // date+time still selected
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    expect(await screen.findByLabelText(/full name/i)).toHaveValue('Amara Test')
    expect(screen.getByLabelText(/phone number/i)).toHaveValue('(214) 555-0123')
  })

  it('recovers when the slot is taken at reserve time (409) by returning to the schedule step', async () => {
    vi.spyOn(api, 'confirmAppointment').mockResolvedValue({
      appointmentId: 'x',
      status: 'confirmed',
      message: 'ok',
      portalUrl: '',
    })
    const user = userEvent.setup()
    const futureDate = futureDateString()
    mockServicesApi()
    mockAvailabilityApi(futureDate)
    vi.spyOn(api, 'createPaymentIntent').mockRejectedValue(
      new ApiRequestError(409, { error: 'Selected appointment slot is already booked' }),
    )

    renderWizard('/booking?service=kl-medium')

    await screen.findByText('Choose Your Style')
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    await screen.findByLabelText(/hair color/i)
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    await screen.findByText('Select a Date')
    const futureDay = String(parseInt(futureDate.split('-')[2], 10))
    const dayButton = await screen.findByRole('button', { name: futureDay })
    await waitFor(() => expect(dayButton).toBeEnabled())
    await user.click(dayButton)
    await screen.findByText(/choose a time/i)
    await user.click(await screen.findByRole('button', { name: /10:00/i }, { timeout: 3000 }))
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    await screen.findByLabelText(/full name/i)
    await user.type(screen.getByLabelText(/full name/i), 'Amara Test')
    await user.type(screen.getByLabelText(/email address/i), 'amara@example.com')
    await user.type(screen.getByLabelText(/phone number/i), '2145550123')
    await user.click(screen.getByRole('button', { name: /review booking/i }))

    // Bounced back to Schedule with a clear message; the customer's info is kept
    await screen.findByText(/that time was just booked/i)
    expect(screen.getByText('Select a Date')).toBeInTheDocument()
  })

  it('requires a service before continuing from step 1', async () => {
    mockServicesApi()
    renderWizard('/booking')

    await screen.findByText('Choose a Category')
    const continueButton = screen.getByRole('button', { name: /^continue$/i })
    expect(continueButton).toBeDisabled()
  })

  it('size → length journey: pills appear in order, price updates live, Continue gates on length', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getServices').mockResolvedValue({
      services: [
        {
          serviceId: 'kl-small',
          name: 'Small Knotless Braids',
          category: 'braids-protective-styles',
          subcategory: 'knotless-braids',
          size: 'Small',
          description: 'Small knotless braids',
          startingPrice: 20000,
          priceUnit: 'cents',
          durationMinutes: 360,
          imageUrl: '',
          featured: false,
          active: true,
          lengths: [
            { label: 'Mid-back', price: 20000 },
            { label: 'Waist length', price: 30000 },
            { label: 'Butt length', price: 34000 },
          ],
        },
        {
          serviceId: 'kl-medium',
          name: 'Medium Knotless Braids',
          category: 'braids-protective-styles',
          subcategory: 'knotless-braids',
          size: 'Medium',
          description: 'Medium knotless braids',
          startingPrice: 18000,
          priceUnit: 'cents',
          durationMinutes: 300,
          imageUrl: '',
          featured: false,
          active: true,
          lengths: [
            { label: 'Mid-back', price: 18000 },
            { label: 'Waist length', price: 24000 },
          ],
        },
        {
          serviceId: 'cornrows',
          name: 'Cornrows',
          category: 'braids-protective-styles',
          subcategory: 'cornrows',
          description: 'Neat cornrows',
          startingPrice: 16000,
          priceUnit: 'cents',
          durationMinutes: 180,
          imageUrl: '',
          featured: false,
          active: true,
        },
      ],
    })

    renderWizard('/booking')

    // 1. Category
    await user.click(await screen.findByRole('button', { name: /braids & protective styles/i }))

    // 2. Style family
    await screen.findByText('Choose Your Style')
    await user.click(screen.getByRole('button', { name: /knotless braids/i }))

    // 3. Size pills — pick Small
    await screen.findByText('Choose Your Size')
    const sizeGroup = screen.getByRole('group', { name: /knotless braids sizes/i })
    await user.click(within(sizeGroup).getByRole('button', { name: /small/i }))

    // Preview shows the from-price; Continue is gated until a length is chosen
    // BOTH price surfaces (sticky summary bar + preview card) show the from-price
    await waitFor(() => expect(screen.getAllByText('From $200').length).toBeGreaterThanOrEqual(2))
    expect(screen.getByText(/choose a length above/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled()

    // 4. Length pills — pick Waist length → price updates to the exact $300
    const lengthGroup = screen.getByRole('group', { name: /small knotless braids lengths/i })
    await user.click(within(lengthGroup).getByRole('button', { name: /waist length/i }))
    await waitFor(() => expect(screen.getAllByText('$300').length).toBeGreaterThan(0))
    expect(screen.queryAllByText('From $200')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeEnabled()

    // 5. Switch length → price updates live to $200 exact
    await user.click(within(lengthGroup).getByRole('button', { name: /mid-back/i }))
    await waitFor(() => expect(screen.getAllByText('$200').length).toBeGreaterThan(0))
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeEnabled()

    // 6. Continue → Hair Details
    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    await screen.findByText(/optional step/i)
  })
})
