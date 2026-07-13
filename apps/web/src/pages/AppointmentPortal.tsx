import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Calendar, Check, Clock, Mail, MapPin, Phone, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { PageMeta } from '../components/seo/PageMeta'
import { api, ApiRequestError } from '../lib/api'
import { formatPhone, formatPrice, shortDate } from '../lib/format'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBookingDate(dateStr: string): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatBookingTime(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function isWithin24Hours(date: string, time: string): boolean {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi).getTime() - Date.now() < 24 * 60 * 60 * 1000
}

function isPast(date: string, time: string): boolean {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi).getTime() < Date.now()
}

const WITHIN_24H_MESSAGE =
  'Online cancellation and rescheduling are not available within 24 hours of your appointment. ' +
  'Please contact the salon directly for emergency situations. ' +
  'Deposits may be forfeited according to our cancellation policy.'

// ─── status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending:         { label: 'Pending Confirmation', bg: 'rgba(251,191,36,0.12)',  color: '#92400e', dot: '#F59E0B' },
  confirmed:       { label: 'Confirmed',            bg: 'rgba(34,197,94,0.12)',   color: '#166534', dot: '#22C55E' },
  cancelled:       { label: 'Cancelled',            bg: 'rgba(239,68,68,0.12)',   color: '#991b1b', dot: '#EF4444' },
  completed:       { label: 'Completed',            bg: 'rgba(59,130,246,0.12)',  color: '#1e40af', dot: '#60A5FA' },
  no_show:         { label: 'No-Show',              bg: 'rgba(239,68,68,0.10)',   color: '#991b1b', dot: '#EF4444' },
  pending_payment: { label: 'Awaiting Payment',     bg: 'rgba(107,114,128,0.12)', color: '#374151', dot: '#9CA3AF' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

// ─── deposit badge ─────────────────────────────────────────────────────────────

const DEPOSIT_CONFIG: Record<string, { label: string; color: string }> = {
  paid:                 { label: 'Deposit paid — $30.00',    color: '#166534' },
  refund_pending:       { label: 'Refund processing',        color: '#92400e' },
  refunded:             { label: 'Deposit refunded',         color: '#1e40af' },
  forfeited:            { label: 'Deposit forfeited',        color: '#991b1b' },
  transferred:          { label: 'Deposit transferred',      color: '#166534' },
  applied_to_balance:   { label: 'Deposit applied to balance', color: '#166534' },
}

function DepositBadge({ status }: { status: string }) {
  const cfg = DEPOSIT_CONFIG[status]
  if (!cfg) return null
  return (
    <span className="text-sm font-semibold" style={{ color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ─── reschedule modal ──────────────────────────────────────────────────────────

function RescheduleModal({
  token,
  currentDate,
  currentTime,
  onSuccess,
  onClose,
}: {
  token: string
  currentDate: string
  currentTime: string
  onSuccess: () => void
  onClose: () => void
}) {
  const [newDate, setNewDate] = useState(currentDate)
  const [newTime, setNewTime] = useState(currentTime)
  const [apiError, setApiError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.portalReschedule(token, { preferredDate: newDate, preferredTime: newTime }),
    onSuccess: () => { onSuccess() },
    onError: (err) => {
      setApiError(err instanceof ApiRequestError ? err.message : 'Unable to reschedule. Please try again.')
    },
  })

  const unchanged = newDate === currentDate && newTime === currentTime

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-border px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-espresso">Reschedule Appointment</h2>
            <p className="mt-0.5 text-xs text-mocha/60">Choose a new date and time</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-mocha/40 transition-colors hover:bg-cream-deep hover:text-mocha"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-xl border border-cream-border bg-cream-deep/40 px-4 py-3 text-xs text-mocha/60">
            Your $30 deposit will automatically transfer to the new date.
          </div>

          <div className="field">
            <label htmlFor="reschedule-date" className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">
              New Date
            </label>
            <input
              id="reschedule-date"
              type="date"
              value={newDate}
              min={new Date(Date.now() + 25 * 3600000).toISOString().split('T')[0]}
              onChange={(e) => { setNewDate(e.target.value); setApiError(null) }}
              className="mt-2"
            />
          </div>

          <div className="field">
            <label htmlFor="reschedule-time" className="block text-[0.65rem] font-bold uppercase tracking-[0.08em] text-mocha">
              New Time
            </label>
            <input
              id="reschedule-time"
              type="time"
              value={newTime}
              onChange={(e) => { setNewTime(e.target.value); setApiError(null) }}
              className="mt-2"
            />
          </div>

          {apiError && (
            <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/8 p-3 text-sm text-error">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {apiError}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-cream-border px-6 py-4">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || unchanged || !newDate || !newTime}
            className="btn btn-gold flex-1 disabled:opacity-50"
          >
            {mutation.isPending ? 'Rescheduling…' : 'Confirm Reschedule'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="btn btn-outline"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── cancel modal ──────────────────────────────────────────────────────────────

function CancelModal({
  token,
  onSuccess,
  onClose,
}: {
  token: string
  onSuccess: () => void
  onClose: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.portalCancel(token),
    onSuccess: () => { onSuccess() },
    onError: (err) => {
      setApiError(err instanceof ApiRequestError ? err.message : 'Unable to cancel. Please try again.')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-border px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-espresso">Cancel Appointment</h2>
            <p className="mt-0.5 text-xs text-mocha/60">Please read before continuing</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-mocha/40 transition-colors hover:bg-cream-deep hover:text-mocha"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-6">
          {/* Refund info */}
          <div className="rounded-xl border border-cream-border bg-cream-deep/40 px-4 py-4 text-sm text-mocha/80 space-y-2">
            <p className="font-semibold text-espresso">What happens to your deposit?</p>
            <p>Your $30.00 deposit will be <span className="font-semibold text-espresso">fully refunded</span> to your original payment method. Refunds typically appear within 5–10 business days.</p>
            <p className="text-xs text-mocha/60 mt-2">
              Prefer to transfer your deposit to a future appointment instead?{' '}
              <span className="font-medium text-espresso">Contact us directly</span> — we're happy to help.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cream-border bg-cream p-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => { setConfirmed(e.target.checked); setApiError(null) }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4A843]"
            />
            <span className="text-[0.72rem] leading-relaxed text-mocha">
              I understand this will cancel my appointment and issue a refund of $30.00 to my original payment method.
            </span>
          </label>

          {apiError && (
            <div className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/8 p-3 text-sm text-error">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {apiError}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-cream-border px-6 py-4">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !confirmed}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: '#991b1b' }}
          >
            {mutation.isPending ? 'Cancelling…' : 'Yes, Cancel My Appointment'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="btn btn-outline"
          >
            Keep It
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main page ─────────────────────────────────────────────────────────────────

export function AppointmentPortal() {
  const { token } = useParams<{ token: string }>()
  const queryClient = useQueryClient()

  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [actionSuccess, setActionSuccess] = useState<'rescheduled' | 'cancelled' | null>(null)

  const query = useQuery({
    queryKey: ['portal-appointment', token],
    queryFn: () => api.getPortalAppointment(token!),
    enabled: Boolean(token),
    retry: false,
  })

  const apt = query.data

  function handleRescheduleSuccess() {
    setShowReschedule(false)
    setActionSuccess('rescheduled')
    queryClient.invalidateQueries({ queryKey: ['portal-appointment', token] })
  }

  function handleCancelSuccess() {
    setShowCancel(false)
    setActionSuccess('cancelled')
    queryClient.invalidateQueries({ queryKey: ['portal-appointment', token] })
  }

  // ── loading ────────────────────────────────────────────────────────────────
  if (query.isPending) {
    return (
      <>
        <PageMeta title="Your Appointment | Braids by Deb" description="" canonical="" noIndex={true} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cream-border border-t-gold-dark" />
            <p className="mt-4 text-sm text-mocha/60">Loading your appointment…</p>
          </div>
        </div>
      </>
    )
  }

  // ── error / not found ──────────────────────────────────────────────────────
  if (query.isError || !apt) {
    const is404 = query.error instanceof ApiRequestError && query.error.status === 404
    return (
      <>
        <PageMeta title="Appointment Not Found | Braids by Deb" description="" canonical="" noIndex={true} />
        <div className="section-pad container-page">
          <div className="mx-auto max-w-md rounded-2xl border border-cream-border bg-paper p-10 text-center shadow-soft">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
              <AlertCircle size={24} className="text-error" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-espresso">
              {is404 ? 'Appointment Not Found' : 'Something Went Wrong'}
            </h1>
            <p className="mt-3 text-sm text-mocha/60">
              {is404
                ? 'This appointment link may have expired or is invalid. Please check your confirmation email or contact us.'
                : 'We couldn\'t load your appointment. Please try again or contact us for help.'}
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/contact" className="btn btn-gold">Contact Us</Link>
              <Link to="/" className="btn btn-outline">Home</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── derive state ───────────────────────────────────────────────────────────
  const within24h = isWithin24Hours(apt.preferredDate, apt.preferredTime)
  const past = isPast(apt.preferredDate, apt.preferredTime)
  const canAct = (apt.status === 'pending' || apt.status === 'confirmed') && apt.depositStatus === 'paid' && !past
  const actionsLocked = canAct && within24h

  // ── success flash ──────────────────────────────────────────────────────────
  const renderSuccessBanner = () => {
    if (!actionSuccess) return null
    return (
      <div
        className="mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold"
        style={{
          background: 'rgba(34,197,94,0.08)',
          borderColor: 'rgba(34,197,94,0.25)',
          color: '#166534',
        }}
      >
        <Check size={16} className="shrink-0" />
        {actionSuccess === 'rescheduled'
          ? 'Your appointment has been rescheduled. A confirmation has been sent to your email.'
          : 'Your appointment has been cancelled. A refund of $30.00 will appear on your card within 5–10 business days.'}
      </div>
    )
  }

  return (
    <>
      <PageMeta
        title={`Your Appointment — ${apt.serviceName} | Braids by Deb`}
        description="View and manage your Braids by Deb appointment."
        canonical=""
        noIndex={true}
      />

      {showReschedule && (
        <RescheduleModal
          token={token!}
          currentDate={apt.preferredDate}
          currentTime={apt.preferredTime}
          onSuccess={handleRescheduleSuccess}
          onClose={() => setShowReschedule(false)}
        />
      )}

      {showCancel && (
        <CancelModal
          token={token!}
          onSuccess={handleCancelSuccess}
          onClose={() => setShowCancel(false)}
        />
      )}

      <section className="section-pad bg-cream">
        <div className="container-page max-w-2xl">
          {renderSuccessBanner()}

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="mb-6">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-mocha/50">
              Braids by Deb
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-espresso">
                {apt.serviceName}
              </h1>
              <StatusBadge status={apt.status} />
            </div>
            <p className="mt-1 text-[0.65rem] text-mocha/40">
              Booked {shortDate(apt.createdAt)}
              {apt.rescheduledAt && ` · Rescheduled ${shortDate(apt.rescheduledAt)}`}
            </p>
          </div>

          {/* ── Main card ─────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-2xl border border-cream-border bg-paper shadow-soft">

            {/* Date / Time / Deposit row */}
            <div
              className="grid divide-x divide-cream-border sm:grid-cols-3"
              style={{ borderBottom: '1px solid var(--color-cream-border)' }}
            >
              <div className="flex flex-col items-center gap-1 py-5 px-4 text-center">
                <Calendar size={16} className="text-gold-dark" />
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-mocha/50">Date</p>
                <p className="text-sm font-semibold text-espresso leading-tight">{formatBookingDate(apt.preferredDate)}</p>
              </div>
              <div className="flex flex-col items-center gap-1 py-5 px-4 text-center">
                <Clock size={16} className="text-gold-dark" />
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-mocha/50">Time</p>
                <p className="text-sm font-semibold text-espresso">{formatBookingTime(apt.preferredTime)}</p>
              </div>
              <div className="flex flex-col items-center gap-1 py-5 px-4 text-center">
                <Check size={16} className="text-gold-dark" />
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-mocha/50">Deposit</p>
                {apt.depositStatus
                  ? <DepositBadge status={apt.depositStatus} />
                  : <p className="text-sm text-mocha/40">—</p>
                }
              </div>
            </div>

            {/* Service + balance */}
            <div className="divide-y divide-cream-border/60 px-6 py-2">
              <DetailRow label="Service" value={apt.serviceName} />
              {apt.servicePrice > 0 && (
                <DetailRow label="Service price" value={formatPrice(apt.servicePrice)} />
              )}
              {apt.depositAmount > 0 && (
                <DetailRow label="Deposit paid" value={formatPrice(apt.depositAmount)} />
              )}
              {apt.remainingBalance > 0 && (
                <DetailRow
                  label="Balance due at appointment"
                  value={formatPrice(apt.remainingBalance)}
                  highlight
                />
              )}
            </div>

            {/* Client info */}
            <div className="border-t border-cream-border/60 px-6 py-5 space-y-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-wider text-mocha/50">Your Info</p>
              <div className="space-y-2">
                <ClientInfoRow icon={<Mail size={13} />} value={apt.clientEmail} />
                <ClientInfoRow icon={<Phone size={13} />} value={formatPhone(apt.clientPhone)} />
                {apt.notes && (
                  <p className="text-xs italic text-mocha/50 pt-1">"{apt.notes}"</p>
                )}
              </div>
            </div>

            {/* Admin note */}
            {apt.adminNote && (
              <div className="border-t border-cream-border/60 bg-gold/5 px-6 py-4">
                <p className="text-[0.58rem] font-bold uppercase tracking-wider text-gold-dark mb-1">Message from Salon</p>
                <p className="text-sm text-mocha">{apt.adminNote}</p>
              </div>
            )}
          </div>

          {/* ── Actions ────────────────────────────────────────────────── */}
          {canAct && (
            <div className="mt-5">
              {actionsLocked ? (
                <div
                  className="flex items-start gap-3 rounded-xl border px-4 py-4 text-sm"
                  style={{ background: 'rgba(107,114,128,0.06)', borderColor: 'rgba(107,114,128,0.2)', color: '#374151' }}
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: '#6B7280' }} />
                  <p className="leading-relaxed">{WITHIN_24H_MESSAGE}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setShowReschedule(true)}
                    className="btn btn-outline flex flex-1 items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} />
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancel(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-error/8"
                    style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#991b1b' }}
                  >
                    <X size={14} />
                    Cancel Appointment
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Policy reminder ──────────────────────────────────────── */}
          {(apt.status === 'pending' || apt.status === 'confirmed') && (
            <PolicyReminder />
          )}

          {/* ── Salon contact ─────────────────────────────────────────── */}
          <SalonContact />
        </div>
      </section>
    </>
  )
}

// ─── helper sub-components ─────────────────────────────────────────────────────

function DetailRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="shrink-0 text-xs font-semibold text-mocha/60">{label}</dt>
      <dd className={`text-right text-sm font-medium ${highlight ? 'text-cocoa font-bold' : 'text-espresso'}`}>
        {value}
      </dd>
    </div>
  )
}

function ClientInfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-mocha">
      <span className="text-mocha/40">{icon}</span>
      {value}
    </div>
  )
}

function PolicyReminder() {
  return (
    <div className="mt-6 rounded-2xl border border-cream-border bg-cream-deep/40 px-5 py-5">
      <p className="text-[0.58rem] font-bold uppercase tracking-wider text-mocha/50 mb-2">Policy Reminder</p>
      <ul className="space-y-1.5 text-xs text-mocha/70 leading-relaxed">
        <li>• You may reschedule or cancel online more than 24 hours before your appointment.</li>
        <li>• Your $30 deposit transfers automatically when you reschedule.</li>
        <li>• Cancellations more than 24 hours in advance receive a full deposit refund.</li>
        <li>• Cancellations within 24 hours may result in forfeiture of your deposit.</li>
        <li>• The remaining balance is due at the time of your appointment.</li>
      </ul>
    </div>
  )
}

function SalonContact() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 py-4 text-xs text-mocha/50">
      <span className="flex items-center gap-1.5">
        <MapPin size={12} />
        Braids by Deb
      </span>
      <Link to="/contact" className="underline underline-offset-2 hover:text-mocha transition-colors">
        Contact Us
      </Link>
      <Link to="/book" className="underline underline-offset-2 hover:text-mocha transition-colors">
        Book Again
      </Link>
    </div>
  )
}
