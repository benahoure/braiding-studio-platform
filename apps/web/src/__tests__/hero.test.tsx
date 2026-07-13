import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { HeroSection } from '../components/home/HeroSection'

function renderHero() {
  return render(
    <MemoryRouter>
      <HeroSection />
    </MemoryRouter>,
  )
}

describe('HeroSection', () => {
  it('renders the Braids by Deb headline and location label', () => {
    renderHero()
    expect(screen.getByRole('heading', { level: 1, name: /braids\s*by deb/i })).toBeInTheDocument()
    expect(screen.getByText(/dallas, texas/i)).toBeInTheDocument()
  })

  it('renders the booking and services CTAs', () => {
    renderHero()
    const bookLink = screen.getByRole('link', { name: /book appointment/i })
    expect(bookLink).toBeInTheDocument()
    expect(bookLink).toHaveAttribute('href', '/booking')

    const servicesLink = screen.getByRole('link', { name: /view services/i })
    expect(servicesLink).toBeInTheDocument()
    expect(servicesLink).toHaveAttribute('href', '#services')
  })

  it('renders the trust stats bar', () => {
    renderHero()
    expect(screen.getByText('500+')).toBeInTheDocument()
    expect(screen.getByText(/happy clients/i)).toBeInTheDocument()
    expect(screen.getByText('8+')).toBeInTheDocument()
    expect(screen.getByText(/years experience/i)).toBeInTheDocument()
    expect(screen.getByText('20+')).toBeInTheDocument()
    expect(screen.getByText(/braid styles/i)).toBeInTheDocument()
  })
})
