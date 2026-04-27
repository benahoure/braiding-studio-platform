'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Instagram, Clock, Send, CheckCircle } from 'lucide-react'
import { BUSINESS_INFO } from '@/lib/data'
import { ContactFormData } from '@/types'

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z" />
    </svg>
  )
}

export default function ContactSection() {
  const [form, setForm] = useState<ContactFormData>({
    name: '', email: '', phone: '', message: '',
  })
  const [errors, setErrors] = useState<Partial<ContactFormData>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs: Partial<ContactFormData> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required'
    if (!form.message.trim()) errs.message = 'Message is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <section id="contact" className="py-24 md:py-32" style={{ background: 'var(--onyx)' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="section-label mb-3" style={{ color: 'var(--gold)' }}>
            Get in Touch
          </div>
          <h2
            className="section-title text-5xl md:text-6xl mb-5 font-light"
            style={{ color: 'var(--cream)' }}
          >
            Contact Us
          </h2>
          <div className="divider-gold" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          {/* Info Column */}
          <div>
            <h3
              className="font-display text-2xl font-light mb-8"
              style={{ color: 'var(--cream)' }}
            >
              Visit the Studio
            </h3>

            <div className="space-y-6">
              {[
                {
                  icon: MapPin,
                  label: 'Location',
                  content: `${BUSINESS_INFO.address}\n${BUSINESS_INFO.city}`,
                },
                {
                  icon: Phone,
                  label: 'Phone',
                  content: BUSINESS_INFO.phone,
                  href: `tel:${BUSINESS_INFO.phone}`,
                },
                {
                  icon: Mail,
                  label: 'Email',
                  content: BUSINESS_INFO.email,
                  href: `mailto:${BUSINESS_INFO.email}`,
                },
                {
                  icon: Instagram,
                  label: 'Instagram',
                  content: BUSINESS_INFO.instagram,
                  href: BUSINESS_INFO.instagramUrl,
                },
                {
                  icon: TikTokIcon,
                  label: 'TikTok',
                  content: BUSINESS_INFO.tiktok,
                  href: BUSINESS_INFO.tiktokUrl,
                },
              ].map(({ icon: Icon, label, content, href }) => (
                <div key={label} className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}
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
            <div className="mt-10 p-6 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Clock size={15} style={{ color: 'var(--gold)' }} />
                <span className="text-[0.7rem] font-medium tracking-wider uppercase" style={{ color: 'var(--gold)' }}>
                  Studio Hours
                </span>
              </div>
              {Object.entries(BUSINESS_INFO.hours).map(([day, time]) => (
                <div
                  key={day}
                  className="flex justify-between text-sm py-1.5 border-b"
                  style={{
                    borderColor: 'rgba(255,255,255,0.05)',
                    color: 'rgba(253,248,240,0.6)',
                  }}
                >
                  <span>{day}</span>
                  <span style={{ color: 'rgba(253,248,240,0.85)' }}>{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Column */}
          <div>
            {submitted ? (
              <div
                className="h-full flex flex-col items-center justify-center text-center p-10 rounded"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.2)' }}
              >
                <CheckCircle size={48} style={{ color: 'var(--gold)' }} className="mb-5" />
                <h3 className="font-display text-2xl font-light mb-3" style={{ color: 'var(--cream)' }}>
                  Message Received!
                </h3>
                <p className="text-sm" style={{ color: 'rgba(253,248,240,0.6)' }}>
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', message: '' }) }}
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
                    <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'rgba(253,248,240,0.5)' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      className={`input-luxury ${errors.name ? 'error' : ''}`}
                      placeholder="Your name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.06)', borderColor: errors.name ? '#E53E3E' : 'rgba(255,255,255,0.12)', color: 'var(--cream)' }}
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'rgba(253,248,240,0.5)' }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        className={`input-luxury ${errors.email ? 'error' : ''}`}
                        placeholder="your@email.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        style={{ background: 'rgba(255,255,255,0.06)', borderColor: errors.email ? '#E53E3E' : 'rgba(255,255,255,0.12)', color: 'var(--cream)' }}
                      />
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'rgba(253,248,240,0.5)' }}>
                        Phone
                      </label>
                      <input
                        type="tel"
                        className="input-luxury"
                        placeholder="(214) 555-0000"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: 'var(--cream)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'rgba(253,248,240,0.5)' }}>
                      Message *
                    </label>
                    <textarea
                      rows={5}
                      className={`input-luxury resize-none ${errors.message ? 'error' : ''}`}
                      placeholder="How can we help you?"
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      style={{ background: 'rgba(255,255,255,0.06)', borderColor: errors.message ? '#E53E3E' : 'rgba(255,255,255,0.12)', color: 'var(--cream)' }}
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
