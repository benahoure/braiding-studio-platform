'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { BUSINESS_INFO } from '@/lib/data'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '/#services',  label: 'Services' },
    { href: '/#gallery',   label: 'Gallery' },
    { href: '/#about',     label: 'About' },
    { href: '/#contact',   label: 'Contact' },
    { href: '/appointments', label: 'My Bookings' },
  ]

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(251,247,242,0.96)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex flex-col leading-none group">
            <span
              className="font-display text-2xl font-medium tracking-wide transition-colors"
              style={{ color: scrolled ? 'var(--onyx)' : 'var(--cream)' }}
            >
              Braids by Deb
            </span>
            <span
              className="text-[0.58rem] font-medium tracking-[0.24em] uppercase mt-0.5"
              style={{ color: 'var(--gold)' }}
            >
              Dallas, Texas
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="nav-link"
                style={{ color: scrolled ? 'var(--onyx)' : 'rgba(251,247,242,0.88)' }}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/booking" className="btn-gold py-2.5 px-5" style={{ fontSize: '0.72rem' }}>
              Book Now
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} color={scrolled ? 'var(--onyx)' : 'white'} />
          </button>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <button
          className="absolute top-6 right-6 p-2"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          <X size={24} color="var(--cream)" />
        </button>

        <div className="text-center mb-2">
          <div
            className="font-display text-3xl font-medium"
            style={{ color: 'var(--cream)' }}
          >
            Braids by Deb
          </div>
          <div
            className="text-[0.6rem] font-medium tracking-[0.24em] uppercase mt-1"
            style={{ color: 'var(--gold)' }}
          >
            Dallas, Texas
          </div>
        </div>

        <div className="w-8 h-px mx-auto" style={{ background: 'var(--gold)' }} />

        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </Link>
        ))}

        <Link
          href="/booking"
          className="btn-gold mt-2"
          onClick={() => setMenuOpen(false)}
        >
          Book Now
        </Link>

        <p
          className="mt-8 text-center"
          style={{ fontSize: '0.78rem', color: 'rgba(251,247,242,0.38)' }}
        >
          {BUSINESS_INFO.phone}
        </p>
      </div>
    </>
  )
}
