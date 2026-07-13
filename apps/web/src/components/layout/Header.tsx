import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import type { BusinessSettings } from '../../types/index'
import { formatPhone } from '../../lib/format'

// Braids by Deb navbar. Transparent over the dark home hero, cream + blurred
// once scrolled (or on any page without the hero behind it). The logo mark is
// the home button; nav items are standalone pages.

const LINKS = [
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/contact', label: 'Contact' },
]

interface HeaderProps {
  settings: BusinessSettings
}

export function Header({ settings }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const lastY = useRef(0)
  const { pathname } = useLocation()

  // Auto-hiding header: slides fully away while scrolling down (content gets
  // the whole screen), reappears on the first upward scroll or near the top.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 48)
      const delta = y - lastY.current
      if (y < 96) {
        setHidden(false)
      } else if (Math.abs(delta) > 6) {
        setHidden(delta > 0)
      }
      lastY.current = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Reset on route change so a new page never starts with a hidden header.
  useEffect(() => {
    setHidden(false)
    lastY.current = window.scrollY
  }, [pathname])

  // Close the mobile menu on route change and lock body scroll while open.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Only the home page has the dark hero behind the transparent navbar.
  const solid = scrolled || pathname !== '/'

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        // Reveal the header if keyboard focus lands inside it while hidden.
        onFocusCapture={() => setHidden(false)}
        style={{
          transform: hidden && !menuOpen ? 'translateY(-100%)' : 'translateY(0)',
          background: solid ? 'rgba(251,247,242,0.95)' : 'transparent',
          backdropFilter: solid ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: solid ? 'blur(12px)' : 'none',
          borderBottom: solid ? '1px solid var(--border)' : '1px solid transparent',
          boxShadow: solid ? '0 2px 20px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo — home button */}
          <Link
            to="/"
            aria-label="Braids by Deb — home"
            className="flex items-center gap-3 group"
          >
            <img
              src="/brand/Braids-by-deb-logo.png"
              alt="Braids by Deb"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
              style={{
                boxShadow: solid
                  ? '0 2px 12px rgba(0,0,0,0.18)'
                  : '0 2px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(191,161,74,0.35)',
              }}
            />
            <span className="hidden lg:flex flex-col leading-none">
              <span
                className="font-display text-xl font-medium tracking-wide transition-colors"
                style={{ color: solid ? 'var(--onyx)' : 'var(--cream)' }}
              >
                Braids by Deb
              </span>
              <span
                className="text-[0.55rem] font-medium tracking-[0.24em] uppercase mt-0.5"
                style={{ color: 'var(--gold)' }}
              >
                Dallas, Texas
              </span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-7">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="nav-link"
                style={({ isActive }) => ({
                  color: isActive
                    ? 'var(--gold-dark)'
                    : solid
                      ? 'var(--onyx)'
                      : 'rgba(251,247,242,0.88)',
                })}
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/booking" className="btn-gold py-2.5 px-5" style={{ fontSize: '0.72rem' }}>
              Book Now
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-3 -mr-1"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu size={22} color={solid ? 'var(--onyx)' : 'white'} />
          </button>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
        <button
          className="absolute top-5 right-5 p-3"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          <X size={24} color="var(--cream)" />
        </button>

        <Link to="/" onClick={() => setMenuOpen(false)} aria-label="Braids by Deb — home">
          <img
            src="/brand/Braids-by-deb-logo.png"
            alt="Braids by Deb"
            className="h-20 w-20 rounded-2xl object-cover mx-auto"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(191,161,74,0.4)' }}
          />
        </Link>

        <div className="w-8 h-px mx-auto" style={{ background: 'var(--gold)' }} />

        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="nav-link py-1" onClick={() => setMenuOpen(false)}>
            {l.label}
          </Link>
        ))}

        <Link to="/booking" className="btn-gold mt-2" onClick={() => setMenuOpen(false)}>
          Book Now
        </Link>

        <p className="mt-6 text-center" style={{ fontSize: '0.78rem', color: 'rgba(251,247,242,0.38)' }}>
          {formatPhone(settings.phone)}
        </p>
      </div>
    </>
  )
}
