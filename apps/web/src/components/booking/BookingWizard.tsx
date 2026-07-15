import { useMutation, useQuery } from '@tanstack/react-query'
import { loadStripe } from '@stripe/stripe-js'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { z } from 'zod'

import { ApiRequestError, api } from '../../lib/api'
import { mockPortfolio } from '../../lib/mockData'
import { bookingSchema } from '../../lib/validators'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import type { AppointmentRequest } from '../../types'
import {
  BOOKING_CATEGORIES,
  WIZARD_STEPS,
  composeNotes,
  serviceIdForPortfolioStyle,
  type WizardStep,
} from './bookingConfig'
import { bookingReducer, holdKeyFor, initialBookingState } from './bookingReducer'
import { BookingConfirmation } from './BookingConfirmation'
import { BookingNavigation } from './BookingNavigation'
import { BookingPriceSummary } from './BookingPriceSummary'
import { BookingProgress } from './BookingProgress'
import { BookingReviewStep } from './BookingReviewStep'
import { ClientInformationStep } from './ClientInformationStep'
import { HairDetailsStep } from './HairDetailsStep'
import { ScheduleStep } from './ScheduleStep'
import { ServiceSelectionStep } from './ServiceSelectionStep'

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)
  : null

const STEP_FIELDS: Record<number, Array<keyof AppointmentRequest>> = {
  1: ['serviceId'],
  2: [],
  3: ['preferredDate', 'preferredTime'],
  4: ['clientName', 'clientEmail', 'clientPhone', 'notes'],
}

function flattenErrors(error: z.ZodError<AppointmentRequest>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (typeof field === 'string' && !out[field]) out[field] = issue.message
  }
  return out
}

export function BookingWizard() {
  const [searchParams] = useSearchParams()
  const requestedService = searchParams.get('service') ?? ''
  const requestedStyle = searchParams.get('style') ?? ''

  const [state, dispatch] = useReducer(
    bookingReducer,
    undefined,
    () => {
      const styleTitle = mockPortfolio.find((item) => item.styleId === requestedStyle)?.title ?? ''
      return initialBookingState({
        serviceId: requestedService || serviceIdForPortfolioStyle(requestedStyle),
        portfolioStyleId: requestedStyle || undefined,
        inspiration: styleTitle ? `Portfolio inspiration: ${styleTitle}` : '',
      })
    },
  )
  const [maxReachedStep, setMaxReachedStep] = useState<WizardStep>(1)
  const [confirmedWith, setConfirmedWith] = useState<{ appointmentId: string; portalUrl: string | null } | null>(null)

  const reducedMotion = useReducedMotion()
  const isMock = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  const wizardRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLElement>(null)
  const hasMounted = useRef(false)

  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: () => api.getServices() })

  const selectedService = useMemo(
    () => servicesQuery.data?.services.find((s) => s.serviceId === state.serviceId),
    [state.serviceId, servicesQuery.data?.services],
  )

  // Derive the category once services load if a service was preselected via URL.
  useEffect(() => {
    if (!selectedService || state.categoryId) return
    const cat = BOOKING_CATEGORIES.find((c) => c.serviceCategories.includes(selectedService.category))
    if (cat) dispatch({ type: 'SELECT_CATEGORY', categoryId: cat.id, clearsService: false })
  }, [selectedService, state.categoryId])

  // Scroll the wizard into view on step change (skip initial mount).
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }
    const t = window.setTimeout(() => {
      wizardRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(t)
  }, [state.step, reducedMotion])

  const buildPayload = (): AppointmentRequest => ({
    serviceId: state.serviceId,
    lengthLabel: state.lengthLabel || undefined,
    portfolioStyleId: state.portfolioStyleId || undefined,
    clientName: state.clientName.trim(),
    clientEmail: state.clientEmail.trim(),
    clientPhone: state.clientPhone.trim(),
    preferredDate: state.preferredDate,
    preferredTime: state.preferredTime,
    notes: composeNotes(state.inspiration, state.hairDetails, state.firstVisit),
    referralSource: state.referralSource,
    honeypot: state.honeypot,
  })

  const validateStep = (step: number): boolean => {
    const fields = STEP_FIELDS[step] ?? []
    if (fields.length === 0) return true
    const result = bookingSchema.safeParse(buildPayload())
    if (result.success) {
      dispatch({ type: 'SET_ERRORS', errors: {} })
      return true
    }
    const all = flattenErrors(result.error)
    const stepErrors = Object.fromEntries(Object.entries(all).filter(([f]) => fields.includes(f as keyof AppointmentRequest)))
    dispatch({ type: 'SET_ERRORS', errors: stepErrors })
    if (Object.keys(stepErrors).length > 0) {
      window.setTimeout(() => errorRef.current?.focus(), 0)
      return false
    }
    return true
  }

  const goToStep = (step: WizardStep) => {
    dispatch({ type: 'GO_TO_STEP', step })
    setMaxReachedStep((prev) => (step > prev ? step : prev))
  }

  // ── Payment hold: created when entering Review. The backend validates the
  //    slot at intent creation (and again at confirm) — that is the real
  //    availability recheck before payment. A hold is reused only if the
  //    service/date/time it was created for is unchanged.
  const paymentIntentMutation = useMutation({
    mutationFn: (data: AppointmentRequest) => api.createPaymentIntent({ ...data, policyAccepted: true }),
    onSuccess: (data) => {
      dispatch({
        type: 'SET_HOLD',
        hold: { appointmentId: data.appointmentId, clientSecret: data.clientSecret, key: holdKeyFor(state) },
      })
      goToStep(5)
    },
    onError: (error) => {
      if (error instanceof ApiRequestError && error.status === 409) {
        // Slot was taken while the customer was filling the form — go back to
        // the schedule step with a clear message. (Order matters: GO_TO_STEP
        // clears errors, so navigate first, then set the message.)
        dispatch({ type: 'GO_TO_STEP', step: 3 })
        dispatch({ type: 'SET_TIME', time: '' })
        dispatch({
          type: 'SET_ERRORS',
          errors: { preferredTime: 'That time was just booked — please pick another available time.' },
        })
        return
      }
      if (error instanceof ApiRequestError && error.fieldErrors) {
        dispatch({ type: 'SET_ERRORS', errors: error.fieldErrors })
        window.setTimeout(() => errorRef.current?.focus(), 0)
        return
      }
      dispatch({
        type: 'SET_ERRORS',
        errors: { form: error instanceof Error ? error.message : 'Something went wrong. Please try again.' },
      })
      window.setTimeout(() => errorRef.current?.focus(), 0)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: ({ appointmentId, intentId }: { appointmentId: string; intentId: string }) =>
      api.confirmAppointment(appointmentId, intentId),
    onSuccess: (data) => {
      sessionStorage.removeItem('ghb_pending_appt')
      setConfirmedWith({ appointmentId: data.appointmentId, portalUrl: data.portalUrl ?? null })
      window.setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    },
  })

  const enterReview = () => {
    const result = bookingSchema.safeParse(buildPayload())
    if (!result.success) {
      dispatch({ type: 'SET_ERRORS', errors: flattenErrors(result.error) })
      window.setTimeout(() => errorRef.current?.focus(), 0)
      return
    }
    // Reuse an existing hold only if nothing that affects it changed.
    if (state.hold && state.hold.key === holdKeyFor(state)) {
      goToStep(5)
      return
    }
    paymentIntentMutation.mutate(result.data)
  }

  const next = () => {
    if (state.step === 4) {
      if (validateStep(4)) enterReview()
      return
    }
    if (validateStep(state.step)) goToStep((state.step + 1) as WizardStep)
  }

  const back = () => {
    if (state.step > 1) dispatch({ type: 'GO_TO_STEP', step: (state.step - 1) as WizardStep })
  }

  const serviceNeedsLength = Boolean(selectedService?.lengths?.length) && !state.lengthLabel
  const nextDisabled =
    (state.step === 1 && (!state.serviceId || serviceNeedsLength)) ||
    (state.step === 3 && (!state.preferredDate || !state.preferredTime))

  const hasBlockingError = Boolean(state.errors.form)

  // ── Confirmed — success is only shown after the backend confirms. ────────
  if (confirmMutation.isSuccess && confirmedWith) {
    return (
      <BookingConfirmation
        ref={confirmRef}
        clientName={state.clientName}
        clientEmail={state.clientEmail}
        service={selectedService}
        preferredDate={state.preferredDate}
        preferredTime={state.preferredTime}
        appointmentId={confirmedWith.appointmentId}
        portalUrl={confirmedWith.portalUrl}
        hairDetails={state.hairDetails}
        firstVisit={state.firstVisit}
        inspiration={state.inspiration}
        lengthLabel={state.lengthLabel}
      />
    )
  }

  return (
    <div
      ref={wizardRef}
      className="overflow-hidden rounded-2xl border border-cream-border bg-paper shadow-soft"
      style={{ scrollMarginTop: '88px' }}
    >
      <BookingProgress currentStep={state.step} maxReachedStep={maxReachedStep} onStepClick={goToStep} />

      {/* Live summary */}
      {selectedService && (
        <div className="px-4 pt-5 sm:px-8">
          <BookingPriceSummary
            service={selectedService}
            lengthLabel={state.lengthLabel}
            preferredDate={state.preferredDate}
            preferredTime={state.preferredTime}
          />
        </div>
      )}

      <div className="p-4 sm:p-8">
        {/* Honeypot */}
        <input
          type="text"
          name="company"
          value={state.honeypot}
          onChange={(e) => dispatch({ type: 'SET_CLIENT_FIELD', field: 'honeypot', value: e.target.value })}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {hasBlockingError && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-error/30 bg-error/8 p-4 text-sm text-error"
          >
            <span className="mt-0.5 shrink-0" aria-hidden="true">
              ⚠
            </span>
            {state.errors.form}
          </div>
        )}

        <h2 className="sr-only">
          Step {state.step} of {WIZARD_STEPS.length}: {WIZARD_STEPS[state.step - 1]}
        </h2>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.step}
            initial={reducedMotion ? false : { opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, x: -18 }}
            transition={{ duration: reducedMotion ? 0 : 0.24, ease: 'easeOut' }}
          >
            {state.step === 1 && (
              <ServiceSelectionStep
                services={servicesQuery.data?.services}
                isLoading={servicesQuery.isPending}
                isError={servicesQuery.isError}
                onRetry={() => servicesQuery.refetch()}
                categoryId={state.categoryId}
                serviceId={state.serviceId}
                lengthLabel={state.lengthLabel}
                onLengthSelect={(lengthLabel) => dispatch({ type: 'SET_LENGTH', lengthLabel })}
                onCategorySelect={(categoryId) => {
                  const cat = BOOKING_CATEGORIES.find((c) => c.id === categoryId)
                  const clearsService = Boolean(
                    selectedService && cat && !cat.serviceCategories.includes(selectedService.category),
                  )
                  dispatch({ type: 'SELECT_CATEGORY', categoryId, clearsService })
                }}
                onServiceSelect={(serviceId, opts) => {
                  dispatch({ type: 'SELECT_SERVICE', serviceId })
                  // Flat-grid categories auto-advance (the card already shows
                  // the photo). Size-pill selections stay put so the customer
                  // can confirm the photo preview, then press Continue.
                  if (serviceId && opts?.advance) {
                    window.setTimeout(() => goToStep(2), reducedMotion ? 80 : 300)
                  }
                }}
                error={state.errors.serviceId}
              />
            )}

            {state.step === 2 && (
              <HairDetailsStep
                values={state.hairDetails}
                onChange={(field, value) => dispatch({ type: 'SET_HAIR_DETAIL', field, value })}
              />
            )}

            {state.step === 3 && (
              <ScheduleStep
                serviceId={state.serviceId}
                calendarMonth={state.calendarMonth}
                preferredDate={state.preferredDate}
                preferredTime={state.preferredTime}
                onMonthChange={(dir) => {
                  let { year, month } = state.calendarMonth
                  month += dir
                  if (month > 12) {
                    month = 1
                    year++
                  }
                  if (month < 1) {
                    month = 12
                    year--
                  }
                  dispatch({ type: 'SET_MONTH', year, month })
                }}
                onDateSelect={(date) => dispatch({ type: 'SET_DATE', date })}
                onTimeSelect={(time) => dispatch({ type: 'SET_TIME', time })}
                errors={state.errors}
              />
            )}

            {state.step === 4 && (
              <ClientInformationStep
                clientName={state.clientName}
                clientEmail={state.clientEmail}
                clientPhone={state.clientPhone}
                referralSource={state.referralSource}
                firstVisit={state.firstVisit}
                errors={state.errors}
                onFieldChange={(field, value) => dispatch({ type: 'SET_CLIENT_FIELD', field, value })}
                onReferralChange={(value) => dispatch({ type: 'SET_REFERRAL', value })}
                onFirstVisitChange={(value) => dispatch({ type: 'SET_FIRST_VISIT', value })}
              />
            )}

            {state.step === 5 && (
              <BookingReviewStep
                service={selectedService}
                lengthLabel={state.lengthLabel}
                hairDetails={state.hairDetails}
                firstVisit={state.firstVisit}
                preferredDate={state.preferredDate}
                preferredTime={state.preferredTime}
                clientName={state.clientName}
                clientEmail={state.clientEmail}
                clientPhone={state.clientPhone}
                inspiration={state.inspiration}
                hold={state.hold}
                stripePromise={stripePromise}
                isMock={isMock}
                policyAccepted={state.policyAccepted}
                onPolicyChange={(accepted) => dispatch({ type: 'SET_POLICY', accepted })}
                onEdit={(step) => dispatch({ type: 'GO_TO_STEP', step })}
                onPaymentSuccess={(intentId) => {
                  if (confirmMutation.isPending || confirmMutation.isSuccess) return
                  confirmMutation.mutate({ appointmentId: state.hold!.appointmentId, intentId })
                }}
                isConfirming={confirmMutation.isPending}
                confirmError={
                  confirmMutation.isError
                    ? confirmMutation.error instanceof Error
                      ? confirmMutation.error.message
                      : 'We could not confirm your booking. Please try again.'
                    : undefined
                }
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation (Review handles its own primary CTA via the payment button) */}
        {state.step < 5 && (
          <BookingNavigation
            onBack={state.step > 1 ? back : undefined}
            onNext={next}
            nextLabel={state.step === 4 ? 'Review Booking' : 'Continue'}
            nextDisabled={nextDisabled}
            nextLoading={paymentIntentMutation.isPending}
            loadingLabel="Reserving your slot…"
          />
        )}
        {state.step === 5 && (
          <BookingNavigation onBack={back} />
        )}
      </div>
    </div>
  )
}
