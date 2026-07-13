import { useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { PageMeta } from '../components/seo/PageMeta'

const BOOKING_META = (
  <PageMeta
    title="Booking Confirmation | Braids by Deb"
    description="Booking confirmation for Braids by Deb."
    canonical=""
    noIndex={true}
  />
)

export function BookingSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const calledRef = useRef(false)

  const paymentIntentId = params.get('payment_intent')
  const redirectStatus   = params.get('redirect_status')
  const appointmentId    = sessionStorage.getItem('ghb_pending_appt')

  const confirmMutation = useMutation({
    mutationFn: () => api.confirmAppointment(appointmentId!, paymentIntentId!),
    onSuccess: () => sessionStorage.removeItem('ghb_pending_appt'),
  })

  useEffect(() => {
    // Redirect to /book if we arrived here without the expected params
    if (!paymentIntentId || !appointmentId) {
      navigate('/book', { replace: true })
      return
    }
    if (redirectStatus !== 'succeeded') return
    if (calledRef.current) return
    calledRef.current = true
    confirmMutation.mutate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── payment failed / cancelled ────────────────────────────────────────────
  if (redirectStatus && redirectStatus !== 'succeeded') {
    return (
      <>
        {BOOKING_META}
        <div className="section-pad bg-cream flex min-h-[60vh] items-center justify-center">
          <div className="mx-auto max-w-md rounded-2xl border border-error/30 bg-error/5 p-8 text-center">
            <p className="font-display text-2xl font-semibold text-espresso">Payment Not Completed</p>
            <p className="mt-3 text-sm leading-relaxed text-mocha/70">
              Your payment was not processed. No charge was made. Please try again.
            </p>
            <Link to="/book" className="btn btn-gold mt-6 inline-block">
              Back to Booking
            </Link>
          </div>
        </div>
      </>
    )
  }

  // ── loading ───────────────────────────────────────────────────────────────
  if (confirmMutation.isPending || confirmMutation.isIdle) {
    return (
      <>
        {BOOKING_META}
        <div className="section-pad bg-cream flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-mocha/60 animate-pulse">Confirming your appointment…</p>
        </div>
      </>
    )
  }

  // ── backend error ─────────────────────────────────────────────────────────
  if (confirmMutation.isError) {
    return (
      <>
        {BOOKING_META}
        <div className="section-pad bg-cream flex min-h-[60vh] items-center justify-center">
          <div className="mx-auto max-w-md rounded-2xl border border-error/30 bg-error/5 p-8 text-center space-y-3">
            <p className="font-display text-2xl font-semibold text-espresso">Almost There</p>
            <p className="text-sm leading-relaxed text-mocha/70">
              Your $20 deposit was received, but we couldn't finish confirming your booking right now.
              Please contact us and share your payment confirmation — we'll manually confirm your appointment.
            </p>
            <button
              className="btn btn-gold mt-2"
              onClick={() => confirmMutation.mutate()}
            >
              Try Again
            </button>
            <Link to="/contact" className="btn btn-outline mt-2 inline-block">
              Contact Us
            </Link>
          </div>
        </div>
      </>
    )
  }

  // ── success ───────────────────────────────────────────────────────────────
  const data = confirmMutation.data
  const portalUrl = data?.portalUrl

  return (
    <>
      {BOOKING_META}
      <div className="section-pad bg-cream flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-cream-border shadow-soft"
        >
          <div className="bg-cocoa px-8 py-12 text-center">
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 14 }}
              className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold"
            >
              <Check size={36} strokeWidth={2.5} className="text-espresso" aria-hidden="true" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="font-display mt-6 text-4xl font-semibold text-cream"
            >
              Appointment Confirmed!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="mx-auto mt-3 max-w-md leading-7 text-cream/75"
            >
              Your appointment is confirmed. Your $20 deposit has been received and will be applied
              toward your final service balance. Please check your email for your appointment details
              and a link to manage your appointment.
            </motion.p>
          </div>

          <div className="border-t border-cream-border bg-cream-deep/40 px-8 py-7 text-center">
            <p className="text-sm leading-relaxed text-mocha">
              Your deposit will be applied toward your final service balance.{' '}
              <span className="font-semibold text-espresso">Check your email</span> for a link to view
              or manage your appointment.
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {portalUrl && (
                <a href={portalUrl} className="btn btn-gold inline-flex items-center gap-2">
                  View My Appointment
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
              <Link to="/" className="btn btn-outline">
                Back to Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
