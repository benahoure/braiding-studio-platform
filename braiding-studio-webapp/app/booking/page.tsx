'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  SERVICES, SERVICE_CATEGORIES, TIME_SLOTS, formatDuration,
  getServiceById, getBookedSlots, saveAppointment, generateId,
  DEPOSIT_AMOUNT, PAYMENT_METHODS, PaymentMethodId,
} from '@/lib/data'
import { Appointment, BookingFormData, ServiceCategory } from '@/types'
import { format, addDays, isBefore, startOfToday } from 'date-fns'
import { ChevronRight, ChevronLeft, Clock, DollarSign, CheckCircle, Calendar, User, Phone, Mail, CreditCard, AlertCircle } from 'lucide-react'
import DatePicker from '@/components/DatePicker'

type Step = 1 | 2 | 3 | 4 | 5

function BookingContent() {
  const searchParams = useSearchParams()
  const preselectedService = searchParams.get('service')

  const [step, setStep] = useState<Step>(1)
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'All'>('All')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState<Appointment | null>(null)

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | ''>('')
  const [depositAgreed, setDepositAgreed] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const [form, setForm] = useState<BookingFormData>({
    serviceId: preselectedService || '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    date: undefined,
    time: '',
    notes: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({})

  const selectedService = form.serviceId ? getServiceById(form.serviceId) : null

  useEffect(() => {
    if (form.date) {
      const dateStr = format(form.date, 'yyyy-MM-dd')
      setBookedSlots(getBookedSlots(dateStr))
    }
  }, [form.date])

  useEffect(() => {
    if (preselectedService && getServiceById(preselectedService)) {
      setStep(2)
    }
  }, [preselectedService])

  const filteredServices = SERVICES.filter(s =>
    categoryFilter === 'All' || s.category === categoryFilter
  )

  const validateStep = (s: Step): boolean => {
    const errs: Partial<Record<keyof BookingFormData, string>> = {}

    if (s === 1) {
      if (!form.serviceId) errs.serviceId = 'Please select a service'
    }
    if (s === 2) {
      if (!form.date) errs.date = 'Please select a date'
      if (!form.time) errs.time = 'Please select a time slot'
    }
    if (s === 3) {
      if (!form.clientName.trim()) errs.clientName = 'Name is required'
      if (!form.clientEmail.trim() || !/\S+@\S+\.\S+/.test(form.clientEmail)) {
        errs.clientEmail = 'Valid email is required'
      }
      if (!form.clientPhone.trim()) errs.clientPhone = 'Phone number is required'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validatePayment = (): boolean => {
    if (!paymentMethod) {
      setPaymentError('Please select a payment method')
      return false
    }
    if (!depositAgreed) {
      setPaymentError('Please confirm you agree to the deposit policy')
      return false
    }
    setPaymentError('')
    return true
  }

  const nextStep = () => {
    if (step === 4) {
      if (!validatePayment()) return
      setStep(5)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (validateStep(step as Step)) {
      setStep(prev => (prev + 1) as Step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    setStep(prev => (prev - 1) as Step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1500))

    const appointment: Appointment = {
      id: generateId(),
      serviceId: form.serviceId,
      serviceName: selectedService!.name,
      servicePrice: selectedService!.price,
      serviceDuration: selectedService!.duration,
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
      date: format(form.date!, 'yyyy-MM-dd'),
      time: form.time,
      notes: form.notes,
      status: 'confirmed',
      paymentMethod,
      createdAt: new Date().toISOString(),
    }

    saveAppointment(appointment)
    setConfirmed(appointment)
    setSubmitting(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const STEPS = [
    { n: 1, label: 'Service' },
    { n: 2, label: 'Date & Time' },
    { n: 3, label: 'Your Info' },
    { n: 4, label: 'Deposit' },
  ]

  const selectedPaymentDetails = PAYMENT_METHODS.find(m => m.id === paymentMethod)

  return (
    <div className="min-h-screen pattern-bg pt-28 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="section-label mb-2">Online Booking</div>
          <h1 className="section-title text-4xl md:text-5xl">
            Book Your Appointment
          </h1>
          <div className="divider-gold" style={{ margin: '1rem auto' }} />
        </div>

        {/* Progress Stepper */}
        {step < 5 && (
          <div className="flex items-center justify-center mb-10">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all"
                    style={{
                      background: step >= s.n ? 'var(--onyx)' : 'white',
                      color: step >= s.n ? 'var(--gold-light)' : 'var(--muted)',
                      border: `1px solid ${step >= s.n ? 'var(--onyx)' : '#E8DDD0'}`,
                    }}
                  >
                    {step > s.n ? <CheckCircle size={14} /> : s.n}
                  </div>
                  <span
                    className="text-[0.6rem] font-medium tracking-wider uppercase mt-1.5"
                    style={{ color: step >= s.n ? 'var(--onyx)' : 'var(--muted)' }}
                  >
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div
                    className="w-12 md:w-20 h-px mx-2 mb-5"
                    style={{ background: step > s.n ? 'var(--gold)' : '#E8DDD0' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 1 — Service Selection */}
        {step === 1 && (
          <div className="card-luxury p-6 md:p-8">
            <h2 className="font-display text-2xl font-medium mb-6">Choose Your Service</h2>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(['All', ...SERVICE_CATEGORIES] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase transition-all"
                  style={{
                    background: categoryFilter === cat ? 'var(--onyx)' : 'transparent',
                    color: categoryFilter === cat ? 'var(--gold-light)' : 'var(--muted)',
                    border: `1px solid ${categoryFilter === cat ? 'var(--onyx)' : '#E8DDD0'}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Service List */}
            <div className="space-y-3">
              {filteredServices.map(service => (
                <button
                  key={service.id}
                  onClick={() => setForm(f => ({ ...f, serviceId: service.id }))}
                  className="w-full text-left p-4 rounded transition-all"
                  style={{
                    border: `1px solid ${form.serviceId === service.id ? 'var(--onyx)' : '#E8DDD0'}`,
                    background: form.serviceId === service.id ? 'rgba(13,13,13,0.03)' : 'white',
                    borderRadius: '4px',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{service.name}</span>
                        {service.popular && (
                          <span
                            className="text-[0.6rem] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: 'var(--blush)', color: 'var(--blush-dark)' }}
                          >
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>
                          {service.category}
                        </span>
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                          <Clock size={10} /> {formatDuration(service.duration)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-xl font-medium">${service.price}</span>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: form.serviceId === service.id ? 'var(--onyx)' : '#D4C9BA',
                          background: form.serviceId === service.id ? 'var(--onyx)' : 'transparent',
                        }}
                      >
                        {form.serviceId === service.id && (
                          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold-light)' }} />
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {errors.serviceId && (
              <p className="text-red-500 text-sm mt-4">{errors.serviceId}</p>
            )}

            <div className="flex justify-end mt-8">
              <button onClick={nextStep} className="btn-primary flex items-center gap-2">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Date & Time */}
        {step === 2 && (
          <div className="card-luxury p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-medium">Select Date & Time</h2>
              {selectedService && (
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    {selectedService.name}
                  </div>
                  <div className="font-display text-lg">${selectedService.price}</div>
                </div>
              )}
            </div>

            {/* Calendar */}
            <div className="mb-8">
              <label className="block text-xs font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--muted)' }}>
                Pick a Date
              </label>
              <DatePicker
                selected={form.date}
                onSelect={date => {
                  setForm(f => ({ ...f, date, time: '' }))
                }}
              />
              {errors.date && <p className="text-red-500 text-sm mt-2">{errors.date}</p>}
            </div>

            {/* Time Slots */}
            {form.date && (
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--muted)' }}>
                  Available Times — {format(form.date, 'EEEE, MMMM d')}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {TIME_SLOTS.map(slot => {
                    const isBooked = bookedSlots.includes(slot)
                    const isSelected = form.time === slot
                    return (
                      <button
                        key={slot}
                        disabled={isBooked}
                        onClick={() => setForm(f => ({ ...f, time: slot }))}
                        className={`time-slot ${isBooked ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
                {bookedSlots.length > 0 && (
                  <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
                    Strikethrough times are already booked.
                  </p>
                )}
                {errors.time && <p className="text-red-500 text-sm mt-2">{errors.time}</p>}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button onClick={prevStep} className="btn-outline flex items-center gap-2">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={nextStep} className="btn-primary flex items-center gap-2">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Client Info */}
        {step === 3 && (
          <div className="card-luxury p-6 md:p-8">
            <h2 className="font-display text-2xl font-medium mb-6">Your Information</h2>

            {/* Booking Summary Bar */}
            {selectedService && form.date && form.time && (
              <div
                className="p-4 rounded mb-7 flex flex-wrap gap-4"
                style={{ background: 'var(--blush)', borderRadius: '4px' }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign size={14} style={{ color: 'var(--gold-dark)' }} />
                  <span className="font-medium">{selectedService.name}</span>
                  <span style={{ color: 'var(--muted)' }}>· ${selectedService.price}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} style={{ color: 'var(--gold-dark)' }} />
                  <span>{format(form.date!, 'MMM d, yyyy')} at {form.time}</span>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                  Full Name *
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                  <input
                    type="text"
                    className={`input-luxury pl-9 ${errors.clientName ? 'error' : ''}`}
                    placeholder="Your full name"
                    value={form.clientName}
                    onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  />
                </div>
                {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                    <input
                      type="email"
                      className={`input-luxury pl-9 ${errors.clientEmail ? 'error' : ''}`}
                      placeholder="your@email.com"
                      value={form.clientEmail}
                      onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                    />
                  </div>
                  {errors.clientEmail && <p className="text-red-500 text-xs mt-1">{errors.clientEmail}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                    <input
                      type="tel"
                      className={`input-luxury pl-9 ${errors.clientPhone ? 'error' : ''}`}
                      placeholder="(214) 555-0000"
                      value={form.clientPhone}
                      onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                    />
                  </div>
                  {errors.clientPhone && <p className="text-red-500 text-xs mt-1">{errors.clientPhone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                  Special Requests / Notes
                </label>
                <textarea
                  rows={3}
                  className="input-luxury resize-none"
                  placeholder="Hair length, allergies, reference photos, anything you'd like Deb to know..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={prevStep} className="btn-outline flex items-center gap-2">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={nextStep} className="btn-primary flex items-center gap-2">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 — Deposit & Payment */}
        {step === 4 && (
          <div className="card-luxury p-6 md:p-8">
            <h2 className="font-display text-2xl font-medium mb-2">Secure Your Spot</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              A <strong>${DEPOSIT_AMOUNT} non-refundable deposit</strong> is required to confirm your appointment.
              Select how you'd like to pay below.
            </p>

            {/* Booking Summary */}
            {selectedService && form.date && form.time && (
              <div
                className="p-4 rounded mb-6 flex flex-wrap gap-4"
                style={{ background: 'var(--blush)', borderRadius: '4px' }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign size={14} style={{ color: 'var(--gold-dark)' }} />
                  <span className="font-medium">{selectedService.name}</span>
                  <span style={{ color: 'var(--muted)' }}>· ${selectedService.price}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={14} style={{ color: 'var(--gold-dark)' }} />
                  <span>{format(form.date!, 'MMM d, yyyy')} at {form.time}</span>
                </div>
              </div>
            )}

            {/* Deposit amount callout */}
            <div
              className="flex items-center justify-between p-4 rounded mb-6"
              style={{ background: 'var(--onyx)', borderRadius: '4px' }}
            >
              <div className="flex items-center gap-3">
                <CreditCard size={18} style={{ color: 'var(--gold)' }} />
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--cream)' }}>
                    Non-Refundable Deposit
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(253,248,240,0.5)' }}>
                    Due now to secure your appointment
                  </div>
                </div>
              </div>
              <div className="font-display text-3xl font-light" style={{ color: 'var(--gold-light)' }}>
                ${DEPOSIT_AMOUNT}
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <label className="block text-xs font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--muted)' }}>
                Choose Payment Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.id}
                    onClick={() => { setPaymentMethod(method.id); setPaymentError('') }}
                    className="p-4 text-left transition-all"
                    style={{
                      border: `2px solid ${paymentMethod === method.id ? 'var(--onyx)' : '#E8DDD0'}`,
                      background: paymentMethod === method.id ? 'rgba(13,13,13,0.04)' : 'white',
                      borderRadius: '4px',
                    }}
                  >
                    <div className="text-2xl mb-2">{method.icon}</div>
                    <div className="font-medium text-sm" style={{ color: 'var(--onyx)' }}>
                      {method.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Instructions */}
            {selectedPaymentDetails && (
              <div
                className="p-4 rounded mb-6"
                style={{ background: '#F0F9F0', border: '1px solid #C3E6CB', borderRadius: '4px' }}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#2D6A4F' }} />
                  <div>
                    <div className="text-sm font-medium mb-0.5" style={{ color: '#1B4332' }}>
                      {selectedPaymentDetails.label} Instructions
                    </div>
                    <div className="text-sm" style={{ color: '#2D6A4F' }}>
                      {selectedPaymentDetails.instruction}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deposit Agreement */}
            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={depositAgreed}
                onChange={e => { setDepositAgreed(e.target.checked); setPaymentError('') }}
                className="mt-0.5 flex-shrink-0"
                style={{ width: '16px', height: '16px', accentColor: 'var(--onyx)' }}
              />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                I understand that the <strong>${DEPOSIT_AMOUNT} deposit is non-refundable</strong> and agrees to be sent before my appointment is confirmed. I also agree to the 24-hour cancellation policy.
              </span>
            </label>

            {paymentError && (
              <div className="flex items-center gap-2 mb-4 text-red-600 text-sm">
                <AlertCircle size={14} />
                {paymentError}
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button onClick={prevStep} className="btn-outline flex items-center gap-2">
                <ChevronLeft size={16} /> Back
              </button>
              <button onClick={nextStep} className="btn-primary flex items-center gap-2">
                Review Booking <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 — Review & Confirm */}
        {step === 5 && !confirmed && (
          <div className="card-luxury p-6 md:p-8">
            <h2 className="font-display text-2xl font-medium mb-6">Review & Confirm</h2>

            {/* Summary */}
            <div className="space-y-4">
              <SummaryRow label="Service" value={selectedService?.name || ''} />
              <SummaryRow label="Price" value={`$${selectedService?.price}`} />
              <SummaryRow label="Duration" value={formatDuration(selectedService?.duration || 0)} />
              <SummaryRow label="Date" value={form.date ? format(form.date, 'EEEE, MMMM d, yyyy') : ''} />
              <SummaryRow label="Time" value={form.time} />
              <div className="border-t pt-4" style={{ borderColor: '#E8DDD0' }} />
              <SummaryRow label="Name" value={form.clientName} />
              <SummaryRow label="Email" value={form.clientEmail} />
              <SummaryRow label="Phone" value={form.clientPhone} />
              {form.notes && <SummaryRow label="Notes" value={form.notes} />}
              <div className="border-t pt-4" style={{ borderColor: '#E8DDD0' }} />
              <SummaryRow
                label="Deposit"
                value={`$${DEPOSIT_AMOUNT} non-refundable`}
              />
              <SummaryRow
                label="Payment via"
                value={PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label || ''}
              />
            </div>

            <div
              className="mt-6 p-4 rounded text-sm"
              style={{ background: 'var(--blush)', borderRadius: '4px', color: 'var(--muted)' }}
            >
              By confirming, you agree to our 24-hour cancellation policy. Your $50 deposit is due immediately via your chosen payment method to secure this appointment.
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={prevStep} className="btn-outline flex items-center gap-2">
                <ChevronLeft size={16} /> Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-gold flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="spinner" style={{ borderTopColor: 'var(--onyx)' }} />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Confirm Appointment
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {confirmed && (
          <div className="card-luxury p-8 md:p-12 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--blush)' }}
            >
              <CheckCircle size={40} style={{ color: 'var(--gold-dark)' }} />
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-light mb-3">
              You're All Set!
            </h2>
            <p className="text-base mb-2" style={{ color: 'var(--muted)' }}>
              Your appointment has been confirmed. We'll see you soon!
            </p>

            {/* Deposit reminder */}
            {(() => {
              const method = PAYMENT_METHODS.find(m => m.id === confirmed.paymentMethod)
              return method ? (
                <div
                  className="max-w-md mx-auto mb-6 p-4 rounded text-sm text-left"
                  style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: '4px', color: '#5D4037' }}
                >
                  <strong>Action needed:</strong> {method.instruction}
                </div>
              ) : null
            })()}

            {/* Confirmation Card */}
            <div
              className="text-left max-w-md mx-auto p-6 rounded mb-8"
              style={{ background: 'var(--cream)', border: '1px solid #E8DDD0' }}
            >
              <div className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--gold)' }}>
                Booking Confirmation #{confirmed.id.slice(-8).toUpperCase()}
              </div>
              <div className="space-y-3">
                <SummaryRow label="Service" value={confirmed.serviceName} />
                <SummaryRow label="Date" value={format(new Date(confirmed.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')} />
                <SummaryRow label="Time" value={confirmed.time} />
                <SummaryRow label="Price" value={`$${confirmed.servicePrice}`} />
                <SummaryRow label="Deposit" value={`$${DEPOSIT_AMOUNT} — ${PAYMENT_METHODS.find(m => m.id === confirmed.paymentMethod)?.label || ''}`} />
                <SummaryRow label="Name" value={confirmed.clientName} />
                <SummaryRow label="Email" value={confirmed.clientEmail} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/appointments" className="btn-primary">
                View My Bookings
              </Link>
              <Link href="/" className="btn-outline">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pattern-bg flex items-center justify-center pt-28">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    }>
      <BookingContent />
    </Suspense>
  )
}
