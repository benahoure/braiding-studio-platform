import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

const SWIPE_THRESHOLD = 40

import { useReducedMotion } from '../../hooks/useReducedMotion'

interface HeroAction {
  label: string
  to: string
  variant?: 'gold' | 'outline'
}

interface HeroImage {
  src: string
  alt: string
  position?: string
}

interface PageHeroProps {
  eyebrow: string
  title: string
  italicTitle?: string
  description: string
  tone?: 'cream' | 'dark'
  image?: string
  images?: HeroImage[]
  imageAlt?: string
  imagePosition?: string
  primaryAction?: HeroAction
  secondaryAction?: HeroAction
  supporting?: ReactNode
  visual?: ReactNode
  backgroundDecor?: ReactNode
  scrollCueTo?: string
}

function actionClass(action: HeroAction) {
  return action.variant === 'outline' ? 'btn btn-outline' : 'btn btn-gold'
}

function ActionLink({ action, dark, reduced }: { action: HeroAction; dark: boolean; reduced: boolean }) {
  const style = dark && action.variant === 'outline'
    ? { borderColor: 'rgba(251,247,242,0.62)', color: 'rgba(251,247,242,0.90)' }
    : undefined

  if (!action.to.startsWith('#')) {
    return (
      <Link className={actionClass(action)} to={action.to} style={style}>
        {action.label}
      </Link>
    )
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.querySelector<HTMLElement>(action.to)
    if (!target) return

    event.preventDefault()
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    window.history.pushState(null, '', action.to)
  }

  return (
    <a className={actionClass(action)} href={action.to} onClick={handleClick} style={style}>
      {action.label}
    </a>
  )
}

export function PageHero({
  eyebrow,
  title,
  italicTitle,
  description,
  tone = 'cream',
  image,
  images,
  imageAlt = '',
  imagePosition = 'center',
  primaryAction,
  secondaryAction,
  supporting,
  visual,
  backgroundDecor,
  scrollCueTo,
}: PageHeroProps) {
  const reduced = useReducedMotion()
  const dark = tone === 'dark'
  const slides = images ?? (image ? [{ src: image, alt: imageAlt, position: imagePosition }] : [])
  const [activeSlide, setActiveSlide] = useState(() =>
    slides.length > 1 ? Math.floor(Math.random() * slides.length) : 0,
  )
  const hasVisual = Boolean(slides.length || visual)

  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const next = useCallback(() => setActiveSlide(i => (i + 1) % slides.length), [slides.length])
  const prev = useCallback(() => setActiveSlide(i => (i - 1 + slides.length) % slides.length), [slides.length])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    pointerStart.current = null
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next(); else prev()
    }
  }, [next, prev])

  const clearPointer = useCallback(() => { pointerStart.current = null }, [])

  const handleScrollCue = useCallback(() => {
    document.querySelector<HTMLElement>(scrollCueTo ?? '')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }, [scrollCueTo, reduced])

  useEffect(() => {
    if (slides.length <= 1) {
      setActiveSlide(0)
      return
    }
    setActiveSlide(Math.floor(Math.random() * slides.length))
  }, [slides.length])

  useEffect(() => {
    if (reduced || slides.length <= 1) return
    const id = window.setInterval(() => {
      setActiveSlide((current) => {
        let next = Math.floor(Math.random() * slides.length)
        if (next === current) next = (next + 1) % slides.length
        return next
      })
    }, 4200)
    return () => window.clearInterval(id)
  }, [reduced, slides.length])

  return (
    <section
      className="page-hero relative overflow-hidden"
      style={{
        background: dark
          ? 'linear-gradient(135deg, #141210 0%, #111111 58%, #3A3228 100%)'
          : 'linear-gradient(135deg, #FBF7F2 0%, #FEFCF9 52%, #F3EBE0 100%)',
        color: dark ? '#FBF7F2' : '#111111',
      }}
    >
      {backgroundDecor}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background: dark
            ? 'radial-gradient(ellipse 70% 60% at 100% 18%, rgba(212,184,106,0.16) 0%, transparent 68%), radial-gradient(ellipse 62% 54% at 0% 100%, rgba(251,247,242,0.08) 0%, transparent 70%)'
            : 'radial-gradient(ellipse 70% 60% at 94% 10%, rgba(212,184,106,0.13) 0%, transparent 68%), radial-gradient(ellipse 58% 50% at 0% 100%, rgba(44,24,16,0.045) 0%, transparent 72%)',
        }}
      />
      <div
        className="pointer-events-none absolute left-0 top-0 h-full w-80 opacity-[0.045]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #D4A843 0px, #D4A843 1px, transparent 1px, transparent 28px)',
        }}
      />

      <div
        className={`container-page relative z-10 grid gap-10 pb-12 pt-6 md:pb-16 md:pt-8 ${
          hasVisual ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.75fr)] lg:items-center' : ''
        }`}
      >
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, ease: 'easeOut' }}
          className="max-w-3xl"
        >
          <p className={dark ? 'text-[0.64rem] font-bold uppercase tracking-[0.18em] text-gold-light' : 'eyebrow'}>
            {eyebrow}
          </p>
          <h1
            className="display-heading mt-3 text-[clamp(2.55rem,5.7vw,5.35rem)] font-semibold leading-[1.04]"
            style={{ color: dark ? '#FBF7F2' : '#111111' }}
          >
            {title}
            {italicTitle && (
              <>
                <br />
                <em className="font-light italic" style={{ color: dark ? 'rgba(251,247,242,0.88)' : '#5c3317' }}>
                  {italicTitle}
                </em>
              </>
            )}
          </h1>
          <p
            className={`mt-5 max-w-2xl text-base leading-[1.9] md:text-lg ${
              dark ? 'text-cream/75' : 'text-espresso/80'
            }`}
          >
            {description}
          </p>

          {supporting && <div className="mt-7">{supporting}</div>}

          {(primaryAction || secondaryAction) && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {primaryAction && (
                <ActionLink action={primaryAction} dark={dark} reduced={reduced} />
              )}
              {secondaryAction && (
                <ActionLink action={secondaryAction} dark={dark} reduced={reduced} />
              )}
            </div>
          )}
        </motion.div>

        {hasVisual && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.08, ease: 'easeOut' }}
            className="relative"
          >
            {visual ?? (
              <div
                className="relative aspect-[4/5] overflow-hidden rounded-card"
                style={{
                  boxShadow: dark
                    ? '0 28px 80px rgba(10,5,2,0.38), 0 0 0 1px rgba(212,184,106,0.22)'
                    : '0 26px 72px rgba(44,24,16,0.14), 0 0 0 1px rgba(212,184,106,0.18)',
                  touchAction: slides.length > 1 ? 'pan-y' : undefined,
                  cursor: slides.length > 1 ? 'grab' : undefined,
                }}
                onPointerDown={slides.length > 1 ? handlePointerDown : undefined}
                onPointerUp={slides.length > 1 ? handlePointerUp : undefined}
                onPointerLeave={slides.length > 1 ? clearPointer : undefined}
                onPointerCancel={slides.length > 1 ? clearPointer : undefined}
              >
                {slides.map((slide, index) => (
                  <motion.img
                    key={slide.src}
                    src={slide.src}
                    alt={index === activeSlide ? slide.alt : ''}
                    aria-hidden={index !== activeSlide}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: slide.position ?? imagePosition }}
                    initial={false}
                    animate={{ opacity: index === activeSlide ? 1 : 0, scale: index === activeSlide ? 1 : 1.025 }}
                    transition={{ duration: reduced ? 0 : 0.9, ease: 'easeInOut' }}
                    draggable={false}
                  />
                ))}
                <div
                  className="pointer-events-none absolute inset-0"
                  aria-hidden="true"
                  style={{
                    background: dark
                      ? 'linear-gradient(to top, rgba(17,17,17,0.34), transparent 58%)'
                      : 'linear-gradient(to top, rgba(44,24,16,0.18), transparent 60%)',
                  }}
                />
                {slides.length > 1 && !reduced && (
                  <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5">
                    {slides.map((slide, i) => (
                      <button
                        key={slide.src}
                        type="button"
                        aria-label={`View image ${i + 1} of ${slides.length}`}
                        aria-pressed={i === activeSlide}
                        onClick={e => { e.stopPropagation(); setActiveSlide(i) }}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: i === activeSlide ? 22 : 6,
                          background: i === activeSlide ? '#D4B86A' : 'rgba(251,247,242,0.52)',
                          boxShadow: i === activeSlide ? '0 0 18px rgba(212,184,106,0.36)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {scrollCueTo && !reduced && (
        <div className="relative z-10 flex justify-center pb-6 pt-1">
          <button
            type="button"
            onClick={handleScrollCue}
            className="group flex flex-col items-center gap-2"
            aria-label="Scroll down to explore services"
          >
            <span
              className="text-[0.58rem] font-bold uppercase tracking-[0.2em] transition-opacity duration-200 group-hover:opacity-100"
              style={{ color: dark ? 'rgba(212,184,106,0.65)' : 'rgba(44,24,16,0.42)' }}
            >
              Scroll to explore
            </span>
            <span
              className="animate-bounce text-sm leading-none"
              style={{ color: dark ? '#D4B86A' : '#8b5e3c' }}
              aria-hidden="true"
            >
              ↓
            </span>
          </button>
        </div>
      )}
    </section>
  )
}
