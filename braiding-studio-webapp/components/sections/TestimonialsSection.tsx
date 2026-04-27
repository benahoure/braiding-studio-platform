import { Star } from 'lucide-react'

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Kezia M.',
    location: 'Dallas, TX',
    rating: 5,
    text: "Deb is genuinely the best braider I've ever been to. My knotless braids lasted nearly 3 months and looked perfect the whole time. She took her time and made me feel so comfortable.",
    service: 'Medium Knotless Braids',
    initials: 'KM',
  },
  {
    id: 2,
    name: 'Jasmine T.',
    location: 'Grand Prairie, TX',
    rating: 5,
    text: "I got the Fulani hairstyle and it came out absolutely GORGEOUS. The partings, the beaded accents, the detail — Deb put so much love into every section. I got compliments for weeks straight.",
    service: 'Fulani Hairstyle',
    initials: 'JT',
  },
  {
    id: 3,
    name: 'Destiny W.',
    location: 'Frisco, TX',
    rating: 5,
    text: "Booked online — super easy. Left with the most beautiful cornrow design I've ever had, and my daughter loved her kids braids too. This is our new go-to spot!",
    service: 'Cornrow Design',
    initials: 'DW',
  },
]

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={12} fill="var(--gold)" style={{ color: 'var(--gold)' }} />
      ))}
    </div>
  )
}

export default function TestimonialsSection() {
  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden"
      style={{ background: 'var(--blush)' }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'var(--blush-mid)', opacity: 0.25, filter: 'blur(72px)' }}
      />
      <div
        className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'var(--gold)', opacity: 0.08, filter: 'blur(60px)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* ── Header ────────────────────────────────── */}
        <div className="text-center mb-14">
          <p className="section-label mb-3">Client Love</p>
          <h2
            className="section-title mb-4"
            style={{ fontSize: 'clamp(2.6rem, 5vw, 4rem)' }}
          >
            What They&rsquo;re Saying
          </h2>
          <div className="divider-gold" />
        </div>

        {/* ── Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div
              key={t.id}
              className="flex flex-col p-7"
              style={{
                background: 'white',
                borderRadius: '20px',
                border: '1px solid rgba(196,133,110,0.18)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
              }}
            >
              {/* Stars */}
              <Stars count={t.rating} />

              {/* Quote */}
              <p
                className="font-display italic font-light leading-relaxed flex-1 my-5"
                style={{ fontSize: '1.05rem', color: 'var(--charcoal)' }}
              >
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Author */}
              <div
                className="flex items-center gap-3 pt-5 border-t"
                style={{ borderColor: 'rgba(196,133,110,0.18)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{ background: 'var(--onyx)', color: 'var(--gold-light)' }}
                >
                  {t.initials}
                </div>
                <div>
                  <p
                    className="font-medium"
                    style={{ fontSize: '0.88rem', color: 'var(--onyx)' }}
                  >
                    {t.name}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    {t.location} · {t.service}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Google aggregate ──────────────────────── */}
        <div className="text-center mt-10">
          <div className="flex justify-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} fill="var(--gold)" style={{ color: 'var(--gold)' }} />
            ))}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            5.0 · 47 reviews on Google
          </p>
        </div>

      </div>
    </section>
  )
}
