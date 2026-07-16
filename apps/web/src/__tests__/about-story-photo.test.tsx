import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../lib/api'
import { defaultBusinessSettings } from '../lib/mockData'
import { About } from '../pages/About'

// The "Her Story" photo was once hardcoded, so admin uploads changed the hero
// but never this image. These tests pin the settings-driven behavior.

// The hero portrait has a similar alt; only the Her Story photo ends in the city.
const STORY_ALT = /founder of braids by deb in dallas, tx/i

function renderAbout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <About />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('About page Her Story photo', () => {
  it('shows the admin-uploaded storyImageUrl when set', async () => {
    vi.spyOn(api, 'getBusinessSettings').mockResolvedValue({
      ...defaultBusinessSettings,
      storyImageUrl: 'https://assets.braidsbydeb.com/story-new.jpg',
    })

    renderAbout()

    const img = await screen.findByAltText(STORY_ALT)
    expect(img).toHaveAttribute('src', 'https://assets.braidsbydeb.com/story-new.jpg')
  })

  it('falls back to the bundled photo when no story photo has been uploaded', async () => {
    vi.spyOn(api, 'getBusinessSettings').mockResolvedValue({
      ...defaultBusinessSettings,
      storyImageUrl: null,
    })

    renderAbout()

    const img = await screen.findByAltText(STORY_ALT)
    expect(img).toHaveAttribute('src', '/images/deb-2.jpg')
  })
})
