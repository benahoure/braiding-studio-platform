import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ServiceCard } from '../components/ui/ServiceCard'
import { resolveServiceSlides } from '../lib/serviceImages'
import type { SalonService } from '../types'

const COVER = 'https://assets.braidsbydeb.com/services/front.jpg'
const BACK = 'https://assets.braidsbydeb.com/services/back.jpg'
const SIDE = 'https://assets.braidsbydeb.com/services/side.jpg'

function makeService(images?: string[]): SalonService {
  return {
    serviceId: 'kl-small',
    name: 'Small Knotless Braids',
    category: 'braids-protective-styles',
    subcategory: 'knotless-braids',
    description: 'Small knotless braids',
    startingPrice: 20000,
    priceUnit: 'cents',
    durationMinutes: 360,
    imageUrl: COVER,
    images,
    featured: false,
    active: true,
  }
}

function renderCard(service: SalonService) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ServiceCard service={service} />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

/** The slider's visible photo — the only img with button semantics. */
function activePhoto(): HTMLImageElement {
  return screen.getByRole('button', { name: /view small knotless braids photo/i }) as HTMLImageElement
}

function allowMotion() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

const originalMatchMedia = window.matchMedia

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  // allowMotion() redefines matchMedia; restore the setup.ts shim so later
  // tests get the reduced-motion default back.
  Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia })
})

describe('resolveServiceSlides', () => {
  it('puts the cover first and dedupes it from the gallery', () => {
    const service = makeService([COVER, BACK, SIDE])
    expect(resolveServiceSlides(service)).toEqual([COVER, BACK, SIDE])
  })

  it('always returns at least the resolved cover', () => {
    expect(resolveServiceSlides(makeService(undefined))).toEqual([COVER])
  })

  it('hard-caps public slides at 4 even when legacy data holds more', () => {
    const extras = [BACK, SIDE, 'https://x.com/4.jpg', 'https://x.com/5.jpg', 'https://x.com/6.jpg']
    const slides = resolveServiceSlides(makeService([COVER, ...extras]))
    expect(slides).toHaveLength(4)
    expect(slides[0]).toBe(COVER)
  })
})

describe('ServiceCard photo slider', () => {
  it('renders a single photo with no dots or arrows', () => {
    renderCard(makeService([COVER]))
    expect(activePhoto().src).toBe(COVER)
    expect(screen.queryByRole('button', { name: /photo 1 of/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /next photo/i })).not.toBeInTheDocument()
  })

  it('shows dots for a multi-photo gallery and switches photos without opening the lightbox', async () => {
    const user = userEvent.setup()
    renderCard(makeService([COVER, BACK, SIDE]))

    expect(activePhoto().src).toBe(COVER)
    await user.click(screen.getByRole('button', { name: 'Photo 2 of 3' }))

    expect(activePhoto().src).toBe(BACK)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Arrows work and also stay out of the lightbox
    await user.click(screen.getByRole('button', { name: /next photo/i }))
    expect(activePhoto().src).toBe(SIDE)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the lightbox at the photo currently shown, with browsing arrows and counter', async () => {
    const user = userEvent.setup()
    renderCard(makeService([COVER, BACK, SIDE]))

    await user.click(screen.getByRole('button', { name: 'Photo 2 of 3' }))
    await user.click(activePhoto())

    const dialog = screen.getByRole('dialog', { name: 'Small Knotless Braids' })
    const lightboxImg = within(dialog).getByRole('img', { name: /photo 2 of 3/i }) as HTMLImageElement
    expect(lightboxImg.src).toBe(BACK)

    // Browse inside the lightbox: arrow button, then keyboard
    await user.click(within(dialog).getByRole('button', { name: /next photo/i }))
    expect((within(dialog).getByRole('img', { name: /photo 3 of 3/i }) as HTMLImageElement).src).toBe(SIDE)
    await user.keyboard('{ArrowRight}')
    expect((within(dialog).getByRole('img', { name: /photo 1 of 3/i }) as HTMLImageElement).src).toBe(COVER)

    // Focus trap cycles through the dialog's own buttons only. Focus sits on
    // the Next arrow (last DOM button) after the click, so Tab wraps to Close.
    await user.tab()
    expect(within(dialog).getByRole('button', { name: /close image view/i })).toHaveFocus()
    await user.tab()
    expect(within(dialog).getByRole('button', { name: /previous photo/i })).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('never auto-advances — photos change only when the visitor acts', () => {
    allowMotion()
    vi.useFakeTimers()
    renderCard(makeService([COVER, BACK]))
    act(() => vi.advanceTimersByTime(30_000))
    expect(activePhoto().src).toBe(COVER)
  })

  it('shows a photo-count chip that tracks the current photo', async () => {
    const user = userEvent.setup()
    renderCard(makeService([COVER, BACK, SIDE]))

    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Photo 3 of 3' }))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
  })

  it('plays the one-time slide-hint nudge only when motion is allowed', () => {
    // Default shim = prefers-reduced-motion → no nudge.
    const { container, unmount } = renderCard(makeService([COVER, BACK]))
    expect(container.querySelector('.slide-hint')).toBeNull()
    unmount()

    // Motion allowed (no IntersectionObserver in jsdom → treated as in view).
    allowMotion()
    const { container: c2 } = renderCard(makeService([COVER, BACK]))
    expect(c2.querySelector('.slide-hint')).not.toBeNull()
  })

  it('single-photo services get no chip and no nudge', () => {
    allowMotion()
    const { container } = renderCard(makeService([COVER]))
    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument()
    expect(container.querySelector('.slide-hint')).toBeNull()
  })
})

describe('Gallery page multi-photo tiles', () => {
  it('slides a portfolio item and opens the lightbox at the shown picture; Book link untouched', async () => {
    const user = userEvent.setup()
    const { api } = await import('../lib/api')
    const { Gallery } = await import('../pages/Gallery')
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')

    vi.spyOn(api, 'getPortfolio').mockResolvedValue({
      items: [
        {
          styleId: 'style-1',
          title: 'Boho Look',
          category: 'boho',
          imageUrl: COVER,
          thumbnailUrl: COVER,
          images: [COVER, BACK],
          featured: true,
          active: true,
          createdAt: '2026-07-01T00:00:00Z',
        },
      ],
      nextCursor: null,
    })
    vi.spyOn(api, 'getBusinessSettings').mockRejectedValue(new Error('offline'))

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Gallery />
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>,
    )

    // Grid tile shows the count chip and switches on dot tap
    const tiles = await screen.findAllByRole('button', { name: /view boho look photo/i })
    const grid = tiles[tiles.length - 1].closest('.gallery-item') as HTMLElement
    await user.click(within(grid).getByRole('button', { name: 'Photo 2 of 2' }))

    // Tap the visible photo → lightbox opens at photo 2 with the title
    await user.click(within(grid).getByRole('button', { name: /view boho look photo/i }))
    const dialog = screen.getByRole('dialog', { name: 'Boho Look' })
    expect((within(dialog).getByRole('img', { name: /photo 2 of 2/i }) as HTMLImageElement).src).toBe(BACK)
    await user.keyboard('{Escape}')

    // Book This Style link still navigates (present + correct href)
    const bookLink = screen.getAllByRole('link', { name: /book this style/i })[0]
    expect(bookLink).toHaveAttribute('href', '/booking?style=style-1')
  })
})
