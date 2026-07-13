import { motion } from 'framer-motion'
import { Mail, Phone } from 'lucide-react'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import { InstagramGlyph, TikTokGlyph } from '../ui/SocialIcons'
import { formatPhone, telHref } from '../../lib/format'
import type { BusinessSettings } from '../../types'

// Contact hero — split layout: copy + booking CTA left, an instant-action
// console right (call / directions / email / Instagram) so visitors can act
// without scrolling. Tall bottom padding preserved for the floating info
// cards that overlap the seam below.

interface ContactHeroProps {
  settings: BusinessSettings
}

export function ContactHero({ settings }: ContactHeroProps) {
  const reducedMotion = useReducedMotion()

  const actions = [
    { icon: Phone, label: 'Call or Text', value: formatPhone(settings.phone), href: telHref(settings.phone) },
    { icon: Mail, label: 'Email', value: 'Write to Deb', href: `mailto:${settings.email}` },
    ...(settings.socialLinks.instagram
      ? [{ icon: InstagramGlyph, label: 'Instagram', value: '@braided_bydebs', href: settings.socialLinks.instagram, network: 'instagram' }]
      : []),
    ...(settings.socialLinks.tiktok
      ? [{ icon: TikTokGlyph, label: 'TikTok', value: '@braids_by_debs', href: settings.socialLinks.tiktok, network: 'tiktok' }]
      : []),
  ].filter((a) => a.href)

  return (
    <section className="relative overflow-hidden pb-14 md:pb-16" style={{ background: 'var(--onyx)' }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full"
        style={{ background: 'var(--gold)', opacity: 0.05, filter: 'blur(100px)' }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pt-10 md:pt-14 lg:grid-cols-[1.15fr_1fr]">
        {/* ── Left: copy ── */}
        <div className="text-center lg:text-left">
          <p className="section-label mb-2.5">Get in Touch</p>
          <h1
            className="font-display font-light"
            style={{ fontSize: 'clamp(2.4rem, 5.2vw, 3.9rem)', color: 'var(--cream)', lineHeight: 1.08 }}
          >
            Let&rsquo;s talk about your hair
          </h1>
          <div className="divider-gold !mx-auto !my-4 lg:!mx-0" />
          <p
            className="mx-auto max-w-md leading-relaxed lg:mx-0"
            style={{ fontSize: '0.92rem', color: 'rgba(251,247,242,0.6)' }}
          >
            Questions about a style, your hair type, or availability — Deb replies within 24 hours.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <a href="#contact-form" className="btn-gold px-8">
              Send a Message
            </a>
          </div>
        </div>

        {/* ── Right: instant-action console ── */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 18, delay: 0.15 }}
          className="mx-auto w-full max-w-md rounded-2xl p-5"
          style={{
            background: 'rgba(26,23,18,0.85)',
            border: '1px solid rgba(191,161,74,0.28)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <p
              className="text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--gold)' }}
            >
              Reach Deb Instantly
            </p>
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: '#4ade80' }}
                />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#22c55e' }} />
              </span>
              <span className="text-[0.6rem] font-medium" style={{ color: 'rgba(251,247,242,0.55)' }}>
                Replies in 24h
              </span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {actions.map(({ icon: Icon, label, value, href, network }, i) => (
              <motion.a
                key={label}
                href={href}
                {...(href!.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 150, damping: 17, delay: 0.3 + i * 0.08 }
                }
                className={`group rounded-xl p-3.5 transition-colors ${network ? `social-tile ${network}` : ''}`}
                style={{ background: 'rgba(251,247,242,0.04)', border: '1px solid rgba(251,247,242,0.08)' }}
              >
                <span
                  className={`social-tile-icon flex h-9 w-9 items-center justify-center rounded-full transition-all ${network ? '' : 'group-hover:bg-gold/20'}`}
                  style={{ background: 'rgba(191,161,74,0.12)', border: '1px solid rgba(191,161,74,0.3)', color: 'var(--gold)' }}
                >
                  <Icon size={14} aria-hidden="true" />
                </span>
                <p
                  className="mt-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: 'rgba(251,247,242,0.45)' }}
                >
                  {label}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium" style={{ color: 'rgba(251,247,242,0.85)' }}>
                  {value}
                </p>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
