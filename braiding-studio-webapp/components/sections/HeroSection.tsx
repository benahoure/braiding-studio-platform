'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function HeroSection() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { setLoaded(true) }, [])

  return (
    <section
      className="relative flex items-end overflow-hidden"
      style={{
        minHeight: '100vh',
        backgroundImage: "url('/images/Hero.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Bottom-up dark gradient — anchors text, preserves model in upper frame */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(8,6,5,0.97) 0%, rgba(8,6,5,0.82) 28%, rgba(8,6,5,0.45) 55%, rgba(8,6,5,0.12) 80%, rgba(8,6,5,0.0) 100%)',
        }}
      />

      {/* Left-side vignette — keeps headline crisp against any background tone */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(8,6,5,0.72) 0%, rgba(8,6,5,0.40) 40%, transparent 70%)',
        }}
      />

      {/* Top vignette — darkens navbar zone so cream links stay readable on any image */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(8,6,5,0.65) 0%, rgba(8,6,5,0.20) 60%, transparent 100%)',
        }}
      />

      {/* Content block — sits at the visual bottom of the cinematic frame */}
      <div
        className="relative z-10 w-full max-w-7xl mx-auto px-8 sm:px-12 md:px-16 lg:px-24 pb-20 md:pb-28 pt-40"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? 'none' : 'translateY(32px)',
          transition: 'opacity 1.1s ease 0.1s, transform 1.1s ease 0.1s',
        }}
      >
        {/* Location label */}
        <p
          className="section-label mb-7"
          style={{ color: 'var(--gold)', letterSpacing: '0.22em' }}
        >
          Dallas, Texas &nbsp;·&nbsp; Protective Hair Styling
        </p>

        {/* Main headline */}
        <h1
          className="font-display mb-7"
          style={{
            fontSize: 'clamp(3.6rem, 8.5vw, 8rem)',
            fontWeight: 300,
            lineHeight: 0.93,
            color: 'var(--cream)',
            letterSpacing: '-0.01em',
          }}
        >
          Braids{' '}
          <span
            style={{
              fontStyle: 'italic',
              color: 'var(--gold-light)',
            }}
          >
            by Deb
          </span>
        </h1>

        {/* Gold rule */}
        <div
          className="mb-9"
          style={{
            width: '52px',
            height: '1.5px',
            background: 'var(--gold)',
            opacity: 0.9,
          }}
        />

        {/* Supporting text */}
        <p
          className="mb-12 max-w-xl leading-relaxed"
          style={{
            fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)',
            color: 'rgba(251,247,242,0.68)',
            fontWeight: 300,
            letterSpacing: '0.01em',
          }}
        >
          Protective styles rooted in culture, crafted with love — box braids,
          knotless braids, locs &amp; twists. Your crown, honored.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/booking" className="btn-gold px-10 py-4">
            Book Appointment
          </Link>
          <a
            href="#services"
            className="btn-outline py-4 px-8"
            style={{
              borderColor: 'rgba(251,247,242,0.22)',
              color: 'rgba(251,247,242,0.80)',
            }}
          >
            View Services
          </a>
        </div>

        {/* Stats bar */}
        <div
          className="flex flex-wrap gap-8 sm:gap-14 mt-20 pt-8 border-t"
          style={{ borderColor: 'rgba(251,247,242,0.10)' }}
        >
          {[
            { n: '500+', label: 'Happy Clients' },
            { n: '8+',   label: 'Years Experience' },
            { n: '20+',  label: 'Braid Styles' },
          ].map(s => (
            <div key={s.label}>
              <div
                className="font-display font-light"
                style={{
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
                  color: 'var(--gold-light)',
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 500,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(251,247,242,0.32)',
                  marginTop: '5px',
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
