import Image from 'next/image'
import Link from 'next/link'
import { Award, Heart, Leaf } from 'lucide-react'

export default function AboutSection() {
  return (
    <section id="about" className="py-24 md:py-32" style={{ background: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* ── Photo side ──────────────────────────── */}
          <div className="relative flex justify-center lg:justify-start">
            {/* Gold frame accent */}
            <div
              className="absolute -top-5 -left-5 w-36 h-36 hidden lg:block"
              style={{
                border: '1.5px solid var(--gold)',
                borderRadius: '14px',
                opacity: 0.35,
              }}
            />

            {/* Main photo */}
            <div
              className="relative w-full overflow-hidden"
              style={{
                aspectRatio: '4/5',
                maxWidth: '460px',
                borderRadius: '20px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
              }}
            >
              <Image
                src="/images/deb-2.jpg"
                alt="Deb — master braider at Braids by Deb, Dallas TX"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 90vw, 45vw"
              />
              {/* Bottom gradient for floating card readability */}
              <div
                className="absolute inset-x-0 bottom-0 h-24"
                style={{
                  background: 'linear-gradient(to top, rgba(17,17,17,0.35), transparent)',
                  borderRadius: '0 0 20px 20px',
                }}
              />
            </div>

            {/* Floating stat card */}
            <div
              className="absolute -bottom-6 -right-2 lg:-right-8 w-44 p-5 hidden md:block"
              style={{
                background: 'var(--onyx)',
                borderRadius: '16px',
                boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
              }}
            >
              <div
                className="font-display font-light"
                style={{ fontSize: '2.8rem', color: 'var(--gold-light)', lineHeight: 1 }}
              >
                8+
              </div>
              <div
                className="mt-1"
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 500,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(251,247,242,0.55)',
                }}
              >
                Years of Artistry
              </div>
              <div
                className="mt-2"
                style={{ fontSize: '0.75rem', color: 'rgba(251,247,242,0.38)' }}
              >
                Trained in Dallas &amp; Atlanta
              </div>
            </div>
          </div>

          {/* ── Text side ───────────────────────────── */}
          <div>
            <p className="section-label mb-3">The Artist Behind the Braids</p>
            <h2
              className="section-title mb-4"
              style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)' }}
            >
              Meet Deb,
              <br />
              <span
                className="italic font-light"
                style={{ color: 'var(--gold-dark)' }}
              >
                Your Stylist
              </span>
            </h2>
            <div className="w-12 h-px mb-8" style={{ background: 'var(--gold)' }} />

            <div
              className="space-y-5 leading-relaxed"
              style={{ fontSize: '0.92rem', color: 'var(--muted)' }}
            >
              <p>
                With over 8 years of experience and a deep-rooted love for protective styling,
                Deb built <em>Braids by Deb</em> with one vision: to create a space where
                Black hair is celebrated, honored, and elevated to art.
              </p>
              <p>
                Trained in West African braiding traditions and contemporary techniques, Deb
                brings both cultural heritage and modern craft to every appointment. Her
                attention to scalp health, tension management, and style longevity sets
                her apart.
              </p>
              <p>
                Every client who sits in Deb's chair leaves not just with beautiful hair —
                but with confidence, care, and a style built to last.
              </p>
            </div>

            {/* Values */}
            <div className="grid grid-cols-3 gap-5 mt-10">
              {[
                { icon: Award, label: 'Certified', desc: 'Certified braiding specialist & protective styles artist' },
                { icon: Heart, label: 'Caring',    desc: 'Gentle technique, scalp-health focused' },
                { icon: Leaf,  label: 'Natural',   desc: 'Clean, quality-first product choices' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="text-center">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'var(--blush)' }}
                  >
                    <Icon size={18} style={{ color: 'var(--blush-dark)' }} />
                  </div>
                  <p
                    className="font-medium mb-1"
                    style={{ fontSize: '0.85rem', color: 'var(--onyx)' }}
                  >
                    {label}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                    {desc}
                  </p>
                </div>
              ))}
            </div>

            <Link href="/booking" className="btn-primary mt-10 inline-flex">
              Book with Deb
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}
