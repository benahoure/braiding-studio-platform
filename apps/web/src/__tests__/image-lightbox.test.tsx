import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ImageLightbox } from '../components/ui/ImageLightbox'
import { ServiceCard } from '../components/ui/ServiceCard'
import { api } from '../lib/api'
import { Gallery } from '../pages/Gallery'
import type { PortfolioItem, SalonService } from '../types'

const service: SalonService = {
  serviceId: 'kl-small',
  name: 'Small Knotless Braids',
  category: 'braids-protective-styles',
  subcategory: 'knotless-braids',
  description: 'Small knotless braids',
  startingPrice: 20000,
  priceUnit: 'cents',
  durationMinutes: 360,
  imageUrl: 'https://example.com/knotless.jpg',
  featured: false,
  active: true,
}

const portfolioItem: PortfolioItem = {
  styleId: 'style-1',
  title: 'Boho Knotless',
  category: 'knotless',
  imageUrl: 'https://example.com/boho.jpg',
  thumbnailUrl: 'https://example.com/boho-thumb.jpg',
  featured: true,
  active: true,
  createdAt: '2026-07-01T00:00:00Z',
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.style.overflow = ''
})

describe('ImageLightbox', () => {
  it('shows the image with caption, locks scroll, and closes on Escape / backdrop / X', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ImageLightbox src="https://example.com/x.jpg" alt="A braid style" title="Boho Knotless" onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: 'Boho Knotless' })
    expect(screen.getByRole('img', { name: 'A braid style' })).toBeInTheDocument()
    expect(screen.getByText('Boho Knotless')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(dialog) // backdrop
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: /close image view/i }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('does not close when clicking the image itself', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ImageLightbox src="https://example.com/x.jpg" alt="A braid style" onClose={onClose} />)

    await user.click(screen.getByRole('img', { name: 'A braid style' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('ServiceCard image tap-to-view', () => {
  it('opens the lightbox from the card image and closes it again', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ServiceCard service={service} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view small knotless braids photo/i }))

    const dialog = screen.getByRole('dialog', { name: 'Small Knotless Braids' })
    expect(dialog).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Booking CTA untouched
    expect(screen.getByRole('link', { name: /book/i })).toHaveAttribute(
      'href',
      '/booking?service=kl-small',
    )
  })
})

describe('Gallery image tap-to-view', () => {
  function mockGalleryApis() {
    vi.spyOn(api, 'getPortfolio').mockResolvedValue({ items: [portfolioItem], nextCursor: null })
    vi.spyOn(api, 'getBusinessSettings').mockRejectedValue(new Error('offline'))
  }

  it('opens the lightbox from a gallery tile without breaking the Book link', async () => {
    const user = userEvent.setup()
    mockGalleryApis()

    renderWithProviders(<Gallery />)

    const tiles = await screen.findAllByRole('button', { name: /view boho knotless photo/i })
    await user.click(tiles[0])

    expect(screen.getByRole('dialog', { name: 'Boho Knotless' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keyboard: Enter opens the lightbox from the image, and the tile button contains no links', async () => {
    const user = userEvent.setup()
    mockGalleryApis()

    renderWithProviders(<Gallery />)

    const [tile] = await screen.findAllByRole('button', { name: /view boho knotless photo/i })

    // Valid ARIA: the role=button element must not contain focusable children
    // (the Book This Style overlay link used to be nested inside it).
    expect(tile.querySelector('a')).toBeNull()

    tile.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Boho Knotless' })).toBeInTheDocument()
  })

  it('keyboard: Enter on the overlay Book link does NOT hijack into the lightbox', async () => {
    const user = userEvent.setup()
    mockGalleryApis()

    renderWithProviders(<Gallery />)

    await screen.findAllByRole('button', { name: /view boho knotless photo/i })
    const bookLinks = screen.getAllByRole('link', { name: /book this style/i })
    bookLinks[0].focus()
    await user.keyboard('{Enter}')

    // The old tile-level onKeyDown preventDefault()ed the bubbled keydown,
    // blocking booking navigation and opening the lightbox instead.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('traps Tab on the close button and restores focus to the trigger on close', async () => {
    const user = userEvent.setup()
    mockGalleryApis()

    renderWithProviders(<Gallery />)

    const [tile] = await screen.findAllByRole('button', { name: /view boho knotless photo/i })
    tile.focus()
    await user.keyboard('{Enter}')

    const closeButton = screen.getByRole('button', { name: /close image view/i })
    expect(closeButton).toHaveFocus()

    // aria-modal promises containment — Tab must not escape into the page.
    await user.tab()
    expect(closeButton).toHaveFocus()
    await user.tab({ shift: true })
    expect(closeButton).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(tile).toHaveFocus()
  })
})
