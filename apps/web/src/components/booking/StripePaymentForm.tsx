import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useState } from 'react'

import { DEPOSIT_AMOUNT_CENTS, dollars } from './bookingConfig'

// Real Stripe deposit payment — identical behavior to the previous booking
// flow: PaymentElement + confirmPayment with redirect fallback handled by
// /booking/success. In mock/dev mode (no publishable key) payment simulates.

const POLICY_CHECKBOX_TEXT =
  'I understand and agree that a $20 deposit is required to secure my appointment. The deposit will be applied toward my final service balance. I understand that I may reschedule online more than 24 hours before my appointment and my deposit will transfer to the new date. I understand that cancellations or rescheduling requests made less than 24 hours before the appointment may result in forfeiture of my deposit. I have read and agree to the Booking, Cancellation, Rescheduling, and Refund Policy.'

interface StripePaymentFormProps {
  appointmentId: string
  policyAccepted: boolean
  onPolicyChange: (v: boolean) => void
  onSuccess: (paymentIntentId: string) => void
  isConfirming: boolean
  isMock: boolean
}

export function StripePaymentForm({
  appointmentId,
  policyAccepted,
  onPolicyChange,
  onSuccess,
  isConfirming,
  isMock,
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  const handlePay = async () => {
    if (!policyAccepted) return
    if (isMock) {
      onSuccess('pi_mock')
      return
    }
    if (!stripe || !elements) return
    setPaying(true)
    setStripeError(null)
    // Persist appointmentId so the /booking/success redirect page can call confirm
    sessionStorage.setItem('ghb_pending_appt', appointmentId)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/success`,
      },
      redirect: 'if_required',
    })
    setPaying(false)
    if (error) {
      setStripeError(error.message ?? 'Payment failed. Please try again.')
      return
    }
    if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    }
  }

  return (
    <div className="space-y-5">
      {/* Policy checkbox */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-border bg-cream p-4">
        <input
          type="checkbox"
          checked={policyAccepted}
          onChange={(e) => onPolicyChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4B86A]"
        />
        <span className="text-[0.72rem] leading-relaxed text-mocha">{POLICY_CHECKBOX_TEXT}</span>
      </label>

      {/* Stripe payment input (hidden in mock mode) */}
      {!isMock && (
        <div className="rounded-xl border border-cream-border bg-cream p-4">
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">Payment Method</p>
          <p className="mb-3 text-[0.65rem] leading-relaxed text-mocha/55">
            Pay your $20 deposit using a debit card, credit card, Apple Pay, Google Pay, Cash App Pay, or Klarna.
            Available options vary by device, location, and eligibility.
          </p>
          <PaymentElement />
        </div>
      )}

      {isMock && (
        <div className="rounded-xl border border-dashed border-gold-dark/40 bg-gold/5 p-4 text-center">
          <p className="text-xs text-mocha/60">
            <span className="font-semibold text-mocha">Dev mode</span> — Stripe not configured. Payment will be
            simulated.
          </p>
        </div>
      )}

      {stripeError && (
        <p className="rounded-lg border border-error/30 bg-error/8 p-3 text-sm text-error" role="alert">
          {stripeError}
        </p>
      )}

      <button
        type="button"
        className="btn btn-gold w-full"
        disabled={!policyAccepted || paying || isConfirming || (!isMock && (!stripe || !elements))}
        onClick={handlePay}
      >
        {paying
          ? 'Processing…'
          : isConfirming
            ? 'Confirming…'
            : `Pay ${dollars(DEPOSIT_AMOUNT_CENTS)} Deposit & Confirm`}
      </button>

      <p className="text-center text-[0.65rem] text-mocha/50">
        Powered by Stripe · Your card is never stored on this site
      </p>
    </div>
  )
}
