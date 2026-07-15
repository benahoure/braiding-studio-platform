import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useBusinessSettings } from '../../hooks/useBusinessSettings'
import { useReducedMotion } from '../../hooks/useReducedMotion'

// About hero — split layout: editorial copy left, a 3D mouse-tilt portrait of
// Deb right with spring-in floating stat chips. Same depth language as the
// Services carousel and Gallery arc heroes.

const STAT_CHIPS = [
  { value: '8+', label: 'Years of Artistry', className: '-left-4 top-8 sm:-left-8' },
  { value: '500+', label: 'Happy Clients', className: '-right-3 bottom-24 sm:-right-8' },
  { value: '20+', label: 'Braid Styles', className: 'left-6 -bottom-4' },
]

export function AboutHero() {
  const reducedMotion = useReducedMotion()
  const { data: settings } = useBusinessSettings()
  const portraitUrl = settings?.founderImageUrl || '/images/deb-1.jpg'
  const frameRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return
    const el = frameRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1
    setTilt({ x: ny * -7, y: nx * 9 })
  }

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--onyx)' }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full"
        style={{ background: 'var(--gold)', opacity: 0.05, filter: 'blur(100px)' }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-14 pt-10 md:pt-14 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Left: copy ── */}
        <div className="text-center lg:text-left">
          <p className="section-label mb-2.5">The Artist Behind the Braids</p>
          <h1
            className="font-display font-light"
            style={{ fontSize: 'clamp(2.4rem, 5.2vw, 3.9rem)', color: 'var(--cream)', lineHeight: 1.08 }}
          >
            Meet <span style={{ color: 'var(--gold-light)' }}>Deb</span>
          </h1>
          <div className="divider-gold !mx-auto !my-4 lg:!mx-0" />
          <p
            className="font-display italic"
            style={{ fontSize: '1.05rem', color: 'rgba(212,184,106,0.85)' }}
          >
            Braided with precision. Timeless confidence.
          </p>
          <p
            className="mx-auto mt-3 max-w-md leading-relaxed lg:mx-0"
            style={{ fontSize: '0.92rem', color: 'rgba(251,247,242,0.6)' }}
          >
            Eight years of West African braiding tradition and modern technique — in a chair where
            your crown is celebrated, honored, and elevated to art.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Link to="/booking" className="btn-gold px-8">
              Book with Deb
            </Link>
            <Link
              to="/gallery"
              className="btn-outline px-8"
              style={{ borderColor: 'rgba(251,247,242,0.24)', color: 'rgba(251,247,242,0.82)' }}
            >
              See Her Work
            </Link>
          </div>
        </div>

        {/* ── Right: 3D tilt portrait + stat chips ── */}
        <div className="flex justify-center lg:justify-end" style={{ perspective: '1000px' }}>
          <div
            ref={frameRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTilt({ x: 0, y: 0 })}
            className="relative w-64 sm:w-72"
          >
            <motion.div
              initial={false}
              animate={{ rotateX: tilt.x, rotateY: tilt.y }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 150, damping: 18 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Gold frame offset */}
              <div
                aria-hidden="true"
                className="absolute -left-4 -top-4 h-full w-full rounded-2xl"
                style={{ border: '1.5px solid rgba(191,161,74,0.4)', transform: 'translateZ(-30px)' }}
              />
              <div
                className="relative aspect-[4/5] overflow-hidden rounded-2xl"
                style={{ boxShadow: '0 30px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(191,161,74,0.25)' }}
              >
                <img
                  src={portraitUrl}
                  alt="Deb — master braider and founder of Braids by Deb"
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </div>

              {/* Floating stat chips */}
              {STAT_CHIPS.map((chip, i) => (
                <motion.div
                  key={chip.label}
                  initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 160, damping: 16, delay: 0.35 + i * 0.15 }
                  }
                  className={`absolute ${chip.className} rounded-xl px-3.5 py-2`}
                  style={{
                    background: 'rgba(17,17,17,0.92)',
                    border: '1px solid rgba(191,161,74,0.4)',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
                    transform: 'translateZ(50px)',
                  }}
                >
                  <p className="font-display text-xl font-light leading-none" style={{ color: 'var(--gold-light)' }}>
                    {chip.value}
                  </p>
                  <p
                    className="mt-0.5 text-[0.52rem] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: 'rgba(251,247,242,0.55)' }}
                  >
                    {chip.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
