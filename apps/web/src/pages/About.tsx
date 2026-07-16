import { Award, Heart, Leaf, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageMeta } from '../components/seo/PageMeta'
import { AboutHero } from '../components/about/AboutHero'
import { useSettingsPhoto } from '../hooks/useSettingsPhoto'

// About Deb — editorial page in the Braids by Deb design language.

const VALUES = [
  {
    icon: Award,
    label: 'Certified Craft',
    desc: 'Certified braiding specialist and protective-styles artist, trained in West African traditions and modern technique.',
  },
  {
    icon: Heart,
    label: 'Care First',
    desc: 'Gentle, tension-aware braiding that protects your edges and prioritizes scalp health at every step.',
  },
  {
    icon: Leaf,
    label: 'Clean Products',
    desc: 'Quality-first, scalp-friendly products chosen with intention for the textures Deb works with every day.',
  },
  {
    icon: Sparkles,
    label: 'Built to Last',
    desc: 'Styles engineered for longevity — clean parts, balanced weight, and finishing that holds for weeks.',
  },
]

export function About() {
  const storyUrl = useSettingsPhoto((s) => s.storyImageUrl, '/images/deb-2.jpg')

  return (
    <>
      <PageMeta
        title="About Deb | Braids by Deb — Dallas, TX"
        description="Meet Deb — Dallas braider with 8+ years of artistry in box braids, knotless braids, boho braids, twists, cornrows, and Fulani styles."
        canonical="https://braidsbydeb.com/about"
      />

      {/* ── 3D tilt portrait hero ──────────────────── */}
      <AboutHero />

      {/* ── Story ──────────────────────────────────── */}
      <section className="py-20 md:py-28" style={{ background: 'var(--cream)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-16 items-center">
            {/* Photo side */}
            <div className="relative flex justify-center lg:justify-start">
              <div
                className="absolute -top-5 -left-5 w-36 h-36 hidden lg:block"
                style={{ border: '1.5px solid var(--gold)', borderRadius: '14px', opacity: 0.35 }}
              />
              <div
                className="relative w-full overflow-hidden"
                style={{
                  aspectRatio: '4/5',
                  maxWidth: '460px',
                  borderRadius: '20px',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
                }}
              >
                {storyUrl && (
                  <img
                    src={storyUrl}
                    alt="Deb — master braider and founder of Braids by Deb in Dallas, TX"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                )}
              </div>
            </div>

            {/* Text side */}
            <div>
              <p className="section-label mb-3">Her Story</p>
              <h2 className="section-title mb-4" style={{ fontSize: 'clamp(2rem, 3.6vw, 3rem)' }}>
                A Chair Where Your Crown
                <br />
                <span className="italic font-light" style={{ color: 'var(--gold-dark)' }}>
                  Is Celebrated
                </span>
              </h2>
              <div className="w-12 h-px mb-8" style={{ background: 'var(--gold)' }} />

              <div className="space-y-5 leading-relaxed" style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>
                <p>
                  With over 8 years of experience and a deep-rooted love for protective styling, Deb
                  built <em>Braids by Deb</em> with one vision: to create a space where Black hair is
                  celebrated, honored, and elevated to art.
                </p>
                <p>
                  Trained in West African braiding traditions and contemporary techniques, Deb brings
                  both cultural heritage and modern craft to every appointment. Her attention to scalp
                  health, tension management, and style longevity sets her apart.
                </p>
                <p>
                  Every client who sits in Deb&rsquo;s chair leaves not just with beautiful hair — but
                  with confidence, care, and a style built to last.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── Values ─────────────────────────────────── */}
      <section className="py-20 md:py-24 pattern-bg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="section-label mb-3">The Standard</p>
            <h2 className="section-title mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              What Every Client Can Expect
            </h2>
            <div className="divider-gold" />
          </div>

          <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, label, desc }, i) => (
              <div key={label} className="group relative pt-7 text-left">
                {/* Gold hairline — grows across on hover */}
                <div
                  className="absolute left-0 top-0 h-px w-10 transition-all duration-500 group-hover:w-full"
                  style={{ background: 'var(--gold)' }}
                />
                <div className="mb-5 flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/50 text-gold-dark transition-all duration-300 group-hover:bg-gold group-hover:text-white">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-display italic font-light leading-none"
                    style={{ fontSize: '1.9rem', color: 'rgba(191,161,74,0.35)' }}
                  >
                    0{i + 1}
                  </span>
                </div>
                <p className="font-display mb-2.5" style={{ fontSize: '1.28rem', color: 'var(--onyx)' }}>
                  {label}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────── */}
      <section className="py-20" style={{ background: 'var(--onyx)' }}>
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2
            className="font-display font-light mb-6"
            style={{ color: 'var(--cream)', fontSize: 'clamp(2rem, 5vw, 3.2rem)', lineHeight: 1.12 }}
          >
            Your crown deserves{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-light)' }}>this level of care.</em>
          </h2>
          <Link to="/booking" className="btn-gold px-10 py-4">
            Book Your Appointment
          </Link>
        </div>
      </section>
    </>
  )
}
