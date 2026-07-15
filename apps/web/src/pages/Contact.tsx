import { CheckCircle, Send } from 'lucide-react'
import { useState } from 'react'

import { PageMeta } from '../components/seo/PageMeta'
import { ContactHero } from '../components/contact/ContactHero'
import { ApiRequestError, api } from '../lib/api'
import { formatHours } from '../lib/format'
import { defaultBusinessSettings } from '../lib/mockData'
import { useBusinessSettings } from '../hooks/useBusinessSettings'

// Contact — same functionality as the platform's /contact API (DynamoDB + SES).
// The hero console handles instant actions (call/directions/email/Instagram);
// this page body focuses on one job: the message form.

interface FormState {
  name: string
  email: string
  phone: string
  message: string
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', message: '' }

const LABEL_STYLE = {
  fontSize: '0.68rem',
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--brown)',
} as const

export function Contact() {
  const { data } = useBusinessSettings()
  const settings = data ?? defaultBusinessSettings

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
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

  return (
    <>
      <PageMeta
        title="Contact | Braids by Deb — Dallas, TX"
        description="Questions about a style, pricing, or availability? Reach Braids by Deb in Dallas — we reply within 24 hours."
        canonical="https://braidsbydeb.com/contact"
      />

      {/* ── Instant-action hero ────────────────────── */}
      <ContactHero settings={settings} />

      {/* ── Message form + studio info ─────────────── */}
      <section id="contact-form" className="py-14 md:py-20" style={{ background: 'var(--cream)' }}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_360px]">
            {/* Form card */}
            <div className="card-luxury p-6 sm:p-10" style={{ transform: 'none' }}>
              {submitted ? (
                <div className="py-14 text-center">
                  <CheckCircle size={48} style={{ color: 'var(--gold)' }} className="mx-auto mb-5" />
                  <h2 className="font-display mb-3 text-3xl font-light" style={{ color: 'var(--onyx)' }}>
                    Message Received
                  </h2>
                  <p className="mx-auto max-w-sm" style={{ fontSize: '0.92rem', color: 'var(--muted)' }}>
                    Thank you for reaching out. Deb will get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false)
                      setForm(EMPTY_FORM)
                    }}
                    className="btn-outline mt-8"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <p className="section-label mb-2">Send a Message</p>
                  <h2
                    className="font-display mb-8"
                    style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: 'var(--onyx)' }}
                  >
                    How can we help?
                  </h2>

                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contact-page-name" className="mb-1.5 block" style={LABEL_STYLE}>
                          Full Name *
                        </label>
                        <input
                          id="contact-page-name"
                          type="text"
                          autoComplete="name"
                          className={`input-luxury ${errors.name ? 'error' : ''}`}
                          placeholder="Your name"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        />
                        {errors.name && (
                          <p className="mt-1 text-xs" style={{ color: '#C0392B' }}>
                            {errors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="contact-page-phone" className="mb-1.5 block" style={LABEL_STYLE}>
                          Phone *
                        </label>
                        <input
                          id="contact-page-phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          maxLength={14}
                          className={`input-luxury ${errors.phone ? 'error' : ''}`}
                          placeholder="(214) 555-0000"
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                        {errors.phone && (
                          <p className="mt-1 text-xs" style={{ color: '#C0392B' }}>
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-page-email" className="mb-1.5 block" style={LABEL_STYLE}>
                        Email *
                      </label>
                      <input
                        id="contact-page-email"
                        type="email"
                        autoComplete="email"
                        className={`input-luxury ${errors.email ? 'error' : ''}`}
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs" style={{ color: '#C0392B' }}>
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="contact-page-message" className="mb-1.5 block" style={LABEL_STYLE}>
                        Your Message *
                      </label>
                      <textarea
                        id="contact-page-message"
                        rows={6}
                        className={`input-luxury resize-none ${errors.message ? 'error' : ''}`}
                        placeholder="Tell us about the style you have in mind, your hair, or anything you'd like to ask…"
                        value={form.message}
                        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                      />
                      {errors.message && (
                        <p className="mt-1 text-xs" style={{ color: '#C0392B' }}>
                          {errors.message}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-gold flex w-full items-center justify-center gap-2 px-10 sm:w-auto"
                    >
                      {loading ? (
                        <>
                          <div className="spinner" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          Send Message
                        </>
                      )}
                    </button>

                    {submitError && (
                      <p className="text-sm" style={{ color: '#C0392B' }} role="alert">
                        {submitError}
                      </p>
                    )}
                  </form>
                </>
              )}
            </div>

            {/* Aside — studio address + hours (everything else lives in the hero) */}
            <aside className="card-luxury p-7" style={{ transform: 'none' }}>
              {settings.contactImageUrl && (
                <div
                  className="mb-5 overflow-hidden"
                  style={{ aspectRatio: '3/4', borderRadius: '14px', maxWidth: '100%' }}
                >
                  <img
                    src={settings.contactImageUrl}
                    alt="The Braids by Deb studio"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <p className="section-label mb-4">Studio &amp; Hours</p>
              <p style={{ fontSize: '0.92rem', color: 'var(--charcoal)', lineHeight: 1.6 }}>
                {settings.address.street}
                <br />
                {settings.address.city}, {settings.address.state} {settings.address.zip}
              </p>
              {settings.googleMapsUrl && (
                <a
                  href={settings.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block py-1"
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--gold-dark)',
                  }}
                >
                  Get directions →
                </a>
              )}
              <p
                className="mt-5 border-t pt-4"
                style={{ borderColor: 'var(--border)', fontSize: '0.85rem', color: 'var(--muted)' }}
              >
                {formatHours(settings)}
              </p>
              <p className="mt-3" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                Appointments recommended — walk-ins welcome based on availability.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
