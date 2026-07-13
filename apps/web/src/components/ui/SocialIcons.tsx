// Authentic social glyphs + brand-aware buttons, shared site-wide.
// Resting state follows the site's gold language; hover/focus reveals the
// real brand identity (Instagram gradient, TikTok black + cyan/red offset).

export function InstagramGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TikTokGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z" />
    </svg>
  )
}

type SocialNetwork = 'instagram' | 'tiktok'

const GLYPHS: Record<SocialNetwork, typeof InstagramGlyph> = {
  instagram: InstagramGlyph,
  tiktok: TikTokGlyph,
}

const LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

/** Round icon button (footer, info rows) — gold ring at rest, brand on hover. */
export function SocialCircle({
  network,
  href,
  size = 15,
}: {
  network: SocialNetwork
  href: string
  size?: number
}) {
  const Glyph = GLYPHS[network]
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${LABELS[network]} (opens in a new tab)`}
      className={`social-circle ${network}`}
    >
      <Glyph size={size} />
    </a>
  )
}

/** Pill button with handle text (gallery CTAs) — brand accent on hover. */
export function SocialPill({
  network,
  href,
  children,
}: {
  network: SocialNetwork
  href: string
  children: React.ReactNode
}) {
  const Glyph = GLYPHS[network]
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn-outline social-pill ${network} flex items-center justify-center gap-2`}
    >
      <Glyph size={15} />
      {children}
    </a>
  )
}
