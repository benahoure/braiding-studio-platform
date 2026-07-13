import { CheckCircle, Clock, Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState } from 'react'

import { ApiRequestError, api } from '../../lib/api'
import { InstagramGlyph, TikTokGlyph } from '../ui/SocialIcons'
import { formatPhone, telHref } from '../../lib/format'
import type { BusinessSettings, DayName } from '../../types'

// Ported from braiding-studio-webapp/components/sections/ContactSection.tsx,
// wired to the real /contact API (DynamoDB + SES notification).

const DAYS: Array<{ key: DayName; label: string }> = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]

function formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const display = h % 12 || 12
  return m === 0 ? `${display}:00 ${suffix}` : `${display}:${String(m).padStart(2, '0')} ${suffix}`
}

interface FormState {
  name: string
  email: string
  phone: string
  message: string
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', message: '' }

const LABEL_STYLE = {
  color: 'rgba(253,248,240,0.5)',
} as const

const INPUT_DARK_STYLE = {
  background: 'rgba(255,255,255,0.06)',
  borderColor: 'rgba(255,255,255,0.12)',
  color: 'var(--cream)',
} as const

interface ContactSectionProps {
  settings: BusinessSettings
}

export function ContactSection({ settings }: ContactSectionProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const validate = () => {
    const errs: Partial<FormState> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required'
    if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Valid phone required'
    if (form.message.trim().length < 10) errs.message = 'Message is required (10+ characters)'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    setSubmitError('')

    try {
      await api.createContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
        services: [],
        honeypot: '',
      })
      setLoading(false)
      setSubmitted(true)
    } catch (error) {
      setLoading(false)
      setSubmitError(
        error instanceof ApiRequestError || error instanceof Error
          ? error.message
          : 'Unable to send your message right now.',
      )
    }
  }

  const infoItems = [
    {
      icon: MapPin,
      label: 'Location',
      content: `${settings.address.street}\n${settings.address.city}, ${settings.address.state} ${settings.address.zip}`,
    },
    {
      icon: Phone,
      label: 'Phone',
      content: formatPhone(settings.phone),
      href: telHref(settings.phone),
    },
    {
      icon: Mail,
      label: 'Email',
      content: settings.email,
      href: `mailto:${settings.email}`,
    },
    ...(settings.socialLinks.instagram
      ? [{ icon: InstagramGlyph, label: 'Instagram', content: '@braided_bydebs', href: settings.socialLinks.instagram }]
      : []),
    ...(settings.socialLinks.tiktok
      ? [{ icon: TikTokGlyph, label: 'TikTok', content: '@braids_by_debs', href: settings.socialLinks.tiktok }]
      : []),
  ]

  return (
    <section id="contact" className="py-24 md:py-32" style={{ background: 'var(--onyx)' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="section-label mb-3" style={{ color: 'var(--gold)' }}>
            Get in Touch
          </div>
          <h2 className="section-title text-5xl md:text-6xl mb-5 font-light" style={{ color: 'var(--cream)' }}>
            Contact Us
          </h2>
          <div className="divider-gold" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          {/* Info Column */}
          <div>
            <h3 className="font-display text-2xl font-light mb-8" style={{ color: 'var(--cream)' }}>
              Visit the Studio
            </h3>

            <div className="space-y-6">
              {infoItems.map(({ icon: Icon, label, content, href }) => (
                <div key={label} className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(191,161,74,0.12)', border: '1px solid rgba(191,161,74,0.25)' }}
                  >
                    <Icon size={16} style={{ color: 'var(--gold)' }} />
                  </div>
                  <div>
                    <div
                      className="text-[0.65rem] font-medium tracking-wider uppercase mb-1"
                      style={{ color: 'rgba(253,248,240,0.4)' }}
                    >
                      {label}
                    </div>
                    {href ? (
                      <a
                        href={href}
                        className="text-sm transition-colors hover:text-white whitespace-pre-line"
                        style={{ color: 'rgba(253,248,240,0.7)' }}
                      >
                        {content}
                      </a>
                    ) : (
                      <p className="text-sm whitespace-pre-line" style={{ color: 'rgba(253,248,240,0.7)' }}>
                        {content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Hours */}
            <div
              className="mt-10 p-6 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock size={15} style={{ color: 'var(--gold)' }} />
                <span className="text-[0.7rem] font-medium tracking-wider uppercase" style={{ color: 'var(--gold)' }}>
                  Studio Hours
                </span>
              </div>
              {DAYS.map(({ key, label }) => {
                const day = settings.hours[key]
                return (
                  <div
                    key={key}
                    className="flex justify-between text-sm py-1.5 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(253,248,240,0.6)' }}
                  >
                    <span>{label}</span>
                    <span style={{ color: 'rgba(253,248,240,0.85)' }}>
                      {day.closed ? 'Closed' : `${formatHour(day.open)} - ${formatHour(day.close)}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Form Column */}
          <div>
            {submitted ? (
              <div
                className="h-full flex flex-col items-center justify-center text-center p-10 rounded"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(191,161,74,0.2)' }}
              >
                <CheckCircle size={48} style={{ color: 'var(--gold)' }} className="mb-5" />
                <h3 className="font-display text-2xl font-light mb-3" style={{ color: 'var(--cream)' }}>
                  Message Received!
                </h3>
                <p className="text-sm" style={{ color: 'rgba(253,248,240,0.6)' }}>
                  Thank you for reaching out. We&rsquo;ll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setForm(EMPTY_FORM)
                  }}
                  className="btn-outline mt-6 text-xs"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(253,248,240,0.7)' }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <div
                className="p-7 rounded"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <h3 className="font-display text-2xl font-light mb-6" style={{ color: 'var(--cream)' }}>
                  Send a Message
                </h3>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-medium tracking-wider uppercase mb-1.5"
                      style={LABEL_STYLE}
                    >
                      Full Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      className={`input-luxury ${errors.name ? 'error' : ''}`}
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      style={{ ...INPUT_DARK_STYLE, borderColor: errors.name ? '#E53E3E' : INPUT_DARK_STYLE.borderColor }}
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-medium tracking-wider uppercase mb-1.5"
                        style={LABEL_STYLE}
                      >
                        Email *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        className={`input-luxury ${errors.email ? 'error' : ''}`}
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        style={{ ...INPUT_DARK_STYLE, borderColor: errors.email ? '#E53E3E' : INPUT_DARK_STYLE.borderColor }}
                      />
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label
                        htmlFor="contact-phone"
                        className="block text-xs font-medium tracking-wider uppercase mb-1.5"
                        style={LABEL_STYLE}
                      >
                        Phone *
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        className={`input-luxury ${errors.phone ? 'error' : ''}`}
                        placeholder="(214) 555-0000"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={14}
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        style={{ ...INPUT_DARK_STYLE, borderColor: errors.phone ? '#E53E3E' : INPUT_DARK_STYLE.borderColor }}
                      />
                      {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-medium tracking-wider uppercase mb-1.5"
                      style={LABEL_STYLE}
                    >
                      Message *
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      className={`input-luxury resize-none ${errors.message ? 'error' : ''}`}
                      placeholder="How can we help you?"
                      value={form.message}
                      onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      style={{ ...INPUT_DARK_STYLE, borderColor: errors.message ? '#E53E3E' : INPUT_DARK_STYLE.borderColor }}
                    />
                    {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message}</p>}
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn-gold w-full mt-2 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="spinner" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Send Message
                      </>
                    )}
                  </button>

                  {submitError && <p className="text-red-400 text-xs mt-2">{submitError}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
