import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronDown, List } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DEPOSIT_AMOUNT_CENTS } from '../../components/booking/bookingConfig'
import { PageMeta } from '../../components/seo/PageMeta'
import { ApiRequestError, api } from '../../lib/api'
import { formatPhone, formatPrice, shortDate } from '../../lib/format'
import type { AdminAppointment, DepositStatus } from '../../types'
import { AdminPageShell } from './AdminDashboard'

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = ['confirmed', 'pending', 'completed', 'cancelled', 'no_show', 'all'] as const
type StatusFilter = typeof STATUS_TABS[number]

const TAB_LABEL: Record<StatusFilter, string> = {
  confirmed:  'Upcoming',
  pending:    'Awaiting Review',
  completed:  'Completed',
  cancelled:  'Cancelled',
  no_show:    'No Show',
  all:        'All',
}

const STATUS_DISPLAY: Record<string, string> = {
  pending:         'Pending',
  confirmed:       'Confirmed',
  cancelled:       'Cancelled',
  completed:       'Completed',
  no_show:         'No Show',
  pending_payment: 'Payment Pending',
}

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  pending:   { bg: 'rgba(251,191,36,0.12)',  color: '#FFC98B',  dot: '#F59E0B' },
  confirmed: { bg: 'rgba(34,197,94,0.12)',   color: '#8CE8AC',  dot: '#22C55E' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',   color: '#FF9DA6',  dot: '#EF4444' },
  completed: { bg: 'rgba(59,130,246,0.12)',  color: '#A7BEFF',  dot: '#60A5FA' },
  no_show:   { bg: 'rgba(249,115,22,0.12)',  color: '#FFB585',  dot: '#F97316' },
}

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ─── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayStr() {
  const n = new Date()
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate())
}

function fmtMonthYear(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function fmtDayHeading(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtTime(t: string) {
  const [h, min] = t.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  const display = h % 12 || 12
  return `${display}:${String(min).padStart(2, '0')} ${suffix}`
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: 'rgba(0,0,0,0.06)', color: '#555', dot: '#aaa' }
  const label = STATUS_DISPLAY[status] ?? status
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {label}
    </span>
  )
}

// ─── calendar component ───────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function AppointmentCalendar({
  appointments,
  selectedDate,
  onSelectDate,
}: {
  appointments: AdminAppointment[]
  selectedDate: string | null
  onSelectDate: (d: string | null) => void
}) {
  const [calDate, setCalDate] = useState(new Date())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear())
  const today = todayStr()

  const year = calDate.getFullYear()
  const month = calDate.getMonth()

  // Group appointments by date
  const byDate = useMemo(() => {
    const map = new Map<string, AdminAppointment[]>()
    for (const apt of appointments) {
      const list = map.get(apt.preferredDate) ?? []
      map.set(apt.preferredDate, [...list, apt])
    }
    return map
  }, [appointments])

  // Build grid cells
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateStr(year, month, i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() { setCalDate(new Date(year, month - 1)) }
  function nextMonth() { setCalDate(new Date(year, month + 1)) }
  function prevYear()  { setCalDate(new Date(year - 1, month)) }
  function nextYear()  { setCalDate(new Date(year + 1, month)) }
  function goToday()   { setCalDate(new Date()); onSelectDate(todayStr()); setPickerOpen(false) }

  function openPicker() { setPickerYear(year); setPickerOpen(true) }
  function pickMonth(m: number) {
    setCalDate(new Date(pickerYear, m))
    setPickerOpen(false)
  }

  const NAV_BTN = "flex h-7 w-7 items-center justify-center rounded-lg text-cream/45 transition-colors hover:bg-white/10 hover:text-cream text-base leading-none"

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-border bg-paper shadow-soft">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ background: 'linear-gradient(135deg, #241220, #1C0D17)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Left nav cluster */}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={prevYear}  className={NAV_BTN} aria-label="Previous year" title="Previous year">«</button>
          <button type="button" onClick={prevMonth} className={NAV_BTN} aria-label="Previous month" title="Previous month">‹</button>
        </div>

        {/* Clickable month+year — opens picker */}
        <button
          type="button"
          onClick={pickerOpen ? () => setPickerOpen(false) : openPicker}
          className="group flex items-center gap-1.5 rounded-lg px-3 py-1 transition-colors hover:bg-white/10"
          title="Pick month & year"
        >
          <span className="text-sm font-semibold text-cream">{fmtMonthYear(calDate)}</span>
          <span
            className="text-[0.6rem] text-cream/40 transition-transform group-hover:text-cream/70"
            style={{ transform: pickerOpen ? 'rotate(180deg)' : undefined }}
          >▾</span>
        </button>

        {/* Right nav cluster */}
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={nextMonth} className={NAV_BTN} aria-label="Next month" title="Next month">›</button>
          <button type="button" onClick={nextYear}  className={NAV_BTN} aria-label="Next year" title="Next year">»</button>
        </div>
      </div>

      {/* ── Month picker panel ── */}
      {pickerOpen && (
        <div
          className="px-4 py-4"
          style={{ background: 'linear-gradient(180deg, #1C0D17, #432735)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Year navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPickerYear(y => y - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-cream/45 hover:bg-white/10 hover:text-cream"
            >‹</button>
            <span className="text-sm font-bold text-cream">{pickerYear}</span>
            <button
              type="button"
              onClick={() => setPickerYear(y => y + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-cream/45 hover:bg-white/10 hover:text-cream"
            >›</button>
          </div>

          {/* 4×3 month grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {MONTH_NAMES.map((name, m) => {
              const isCurrent = pickerYear === year && m === month
              const hasApts = Array.from(byDate.keys()).some(d => {
                const [dy, dm] = d.split('-').map(Number)
                return dy === pickerYear && dm - 1 === m
              })
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => pickMonth(m)}
                  className="relative rounded-lg py-2 text-xs font-semibold transition-colors"
                  style={{
                    background: isCurrent ? '#F5A8C2' : 'rgba(255,255,255,0.06)',
                    color: isCurrent ? '#1F0A15' : 'rgba(255,240,247,0.75)',
                  }}
                >
                  {name}
                  {hasApts && !isCurrent && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-amber-400" />
                  )}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={goToday}
            className="mt-3 w-full rounded-lg py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide transition-colors hover:bg-white/10"
            style={{ color: '#F5A8C2', border: '1px solid rgba(232,120,159,0.25)' }}
          >
            Jump to Today
          </button>
        </div>
      )}

      {/* ── Day-of-week headers ── */}
      {!pickerOpen && (
        <>
          <div className="grid grid-cols-7 border-b border-cream-border/50">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="py-2 text-center text-[0.58rem] font-bold uppercase tracking-wider text-mocha/40">
                {d}
              </div>
            ))}
          </div>

          {/* ── Day grid ── */}
          <div className="grid grid-cols-7">
            {cells.map((dateStr, i) => {
              if (!dateStr) return <div key={i} className="border-b border-r border-cream-border/30 bg-cream-deep/20 py-3" />

              const apts = byDate.get(dateStr) ?? []
              const isToday    = dateStr === today
              const isSelected = dateStr === selectedDate
              const statusOrder = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show']
              const presentStatuses = statusOrder.filter(s => apts.some(a => a.status === s))

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onSelectDate(isSelected ? null : dateStr)}
                  className="group relative flex flex-col items-center border-b border-r border-cream-border/30 py-2.5 transition-colors hover:bg-cream-deep/40"
                  style={isSelected ? { background: 'rgba(232,120,159,0.08)' } : undefined}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: isSelected ? '#F5A8C2' : 'transparent',
                      color: isSelected ? '#1F0A15' : isToday ? '#F5A8C2' : undefined,
                      outline: isToday && !isSelected ? '2px solid rgba(232,120,159,0.5)' : undefined,
                      outlineOffset: '1px',
                      fontWeight: isToday || isSelected ? 700 : undefined,
                    }}
                  >
                    {parseInt(dateStr.split('-')[2])}
                  </span>
                  {apts.length > 0 && (
                    <div className="mt-1 flex items-center gap-0.5">
                      {presentStatuses.slice(0, 3).map((s) => (
                        <span key={s} className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_STYLE[s]?.dot ?? '#aaa' }} />
                      ))}
                      {apts.length > 3 && <span className="text-[0.5rem] font-bold text-mocha/40">+{apts.length - 3}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Legend ── */}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5"
            style={{ borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.015)' }}
          >
            {Object.entries(STATUS_STYLE).map(([key, { dot }]) => (
              <span key={key} className="flex items-center gap-1.5 text-[0.6rem] text-mocha/50">
                <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
                {STATUS_DISPLAY[key] ?? key}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── deposit badge ─────────────────────────────────────────────────────────────

const DEPOSIT_STYLE: Record<DepositStatus, { label: string; bg: string; color: string }> = {
  paid:               { label: 'Deposit paid',        bg: 'rgba(34,197,94,0.10)',  color: '#8CE8AC' },
  refund_pending:     { label: 'Refund processing',   bg: 'rgba(251,191,36,0.12)', color: '#FFC98B' },
  refunded:           { label: 'Deposit refunded',    bg: 'rgba(59,130,246,0.12)', color: '#A7BEFF' },
  forfeited:          { label: 'Deposit forfeited',   bg: 'rgba(239,68,68,0.12)', color: '#FF9DA6' },
  transferred:        { label: 'Deposit transferred', bg: 'rgba(34,197,94,0.10)',  color: '#8CE8AC' },
  applied_to_balance: { label: 'Applied to balance',  bg: 'rgba(34,197,94,0.10)',  color: '#8CE8AC' },
}

function DepositBadge({ status, amount }: { status: DepositStatus; amount?: number }) {
  const s = DEPOSIT_STYLE[status]
  const amtLabel = status === 'paid' && amount ? ` — ${formatPrice(amount)}` : ''
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.62rem] font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}{amtLabel}
    </span>
  )
}

// ─── appointment card ─────────────────────────────────────────────────────────

type AdminActionType = 'cancel-refund' | 'reschedule' | 'refund' | 'late-cancel' | 'no-show' | 'override'

function AppointmentCard({
  apt,
  onUpdate,
  isUpdating,
  compact = false,
}: {
  apt: AdminAppointment
  onUpdate: (status: 'confirmed' | 'cancelled' | 'completed', adminNote?: string) => void
  isUpdating: boolean
  compact?: boolean
}) {
  const queryClient = useQueryClient()
  const [pendingAction, setPendingAction] = useState<'confirmed' | 'cancelled' | null>(null)
  const [note, setNote] = useState('')
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
  const [adminAction, setAdminAction] = useState<AdminActionType | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState(apt.preferredDate)
  const [rescheduleTime, setRescheduleTime] = useState(apt.preferredTime)
  const [adminError, setAdminError] = useState<string | null>(null)

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['admin-appointments'] })
    queryClient.invalidateQueries({ queryKey: ['admin-appointments-all'] })
  }

  function resetAdminPanel() {
    setAdminAction(null)
    setActionNote('')
    setRescheduleDate(apt.preferredDate)
    setRescheduleTime(apt.preferredTime)
    setAdminError(null)
  }

  const adminMutation = useMutation({
    mutationFn: async (type: AdminActionType) => {
      switch (type) {
        case 'cancel-refund': return api.adminCancelRefund(apt.appointmentId)
        case 'reschedule':    return api.adminReschedule(apt.appointmentId, {
          preferredDate: rescheduleDate,
          preferredTime: rescheduleTime,
          reason: actionNote.trim() || undefined,
        })
        case 'refund':        return api.adminRefundDeposit(apt.appointmentId)
        case 'late-cancel':   return api.adminForfeitDeposit(apt.appointmentId, {
          action: 'late_cancel',
          reason: actionNote.trim() || undefined,
        })
        case 'no-show':       return api.adminForfeitDeposit(apt.appointmentId, {
          action: 'no_show',
          reason: actionNote.trim() || undefined,
        })
        case 'override':      return api.adminOverride(apt.appointmentId, actionNote.trim())
      }
    },
    onSuccess: () => {
      invalidateAll()
      resetAdminPanel()
      setAdminPanelOpen(false)
    },
    onError: (err) => {
      setAdminError(err instanceof ApiRequestError ? err.message : 'Action failed. Please try again.')
    },
  })

  function submitWithNote() {
    if (!pendingAction) return
    onUpdate(pendingAction, note)
    setPendingAction(null)
    setNote('')
  }

  const isActiveStatus = apt.status === 'pending' || apt.status === 'confirmed'

  return (
    <div className="rounded-xl border border-cream-border bg-paper shadow-soft">
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-espresso">{apt.clientName}</p>
              <StatusBadge status={apt.status} />
              {apt.depositStatus && (
                <DepositBadge status={apt.depositStatus} amount={apt.depositAmount} />
              )}
              {apt.refundStatus === 'failed' && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.62rem] font-semibold"
                  style={{ background: 'rgba(239,68,68,0.14)', color: '#FF9DA6' }}
                  title={apt.refundFailureReason ?? 'Refund failed — action required'}
                >
                  ⚠ Refund failed
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm font-medium text-mocha">{apt.serviceName}</p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-mocha/60">
              {!compact && <span>{apt.preferredDate}</span>}
              <span>{fmtTime(apt.preferredTime)}</span>
              <span>{formatPhone(apt.clientPhone)}</span>
              <span>{apt.clientEmail}</span>
              {apt.referralSource && <span>via {apt.referralSource}</span>}
            </div>
            {apt.notes && <p className="mt-1.5 text-xs italic text-mocha/50">"{apt.notes}"</p>}
            {(apt.adminNote || apt.adminNotes) && (
              <p className="mt-1 text-xs font-medium text-gold-dark">Note: {apt.adminNote ?? apt.adminNotes}</p>
            )}
            {apt.rescheduledAt && (
              <p className="mt-1 text-[0.62rem] text-mocha/40">
                Rescheduled {shortDate(apt.rescheduledAt)}
                {apt.rescheduledBy === 'admin' ? ' by admin' : apt.rescheduledBy === 'client' ? ' by client' : ''}
                {apt.rescheduledFrom ? ` (was ${apt.rescheduledFrom})` : ''}
              </p>
            )}
            {!compact && <p className="mt-1.5 text-[0.62rem] text-mocha/35">Received {shortDate(apt.createdAt)}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {apt.status === 'pending' && !pendingAction && (
              <>
                <button
                  type="button" disabled={isUpdating}
                  onClick={() => setPendingAction('confirmed')}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'rgba(34,197,94,0.12)', color: '#8CE8AC' }}
                >Confirm</button>
                <button
                  type="button" disabled={isUpdating}
                  onClick={() => setPendingAction('cancelled')}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#FF9DA6' }}
                >Cancel</button>
              </>
            )}
            {apt.status === 'confirmed' && !pendingAction && (
              <button
                type="button" disabled={isUpdating}
                onClick={() => onUpdate('completed')}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                style={{ background: 'rgba(59,130,246,0.12)', color: '#A7BEFF' }}
              >Mark Complete</button>
            )}
          </div>
        </div>
      </div>

      {/* Basic action note panel */}
      {pendingAction && (
        <div
          className="border-t px-4 pb-4 pt-3"
          style={{ borderColor: 'rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.015)' }}
        >
          <p className="mb-2 text-xs font-semibold" style={{
            color: pendingAction === 'confirmed' ? '#8CE8AC' : '#FF9DA6',
          }}>
            {pendingAction === 'confirmed' ? 'Confirming' : 'Cancelling'} — add a note (optional)
          </p>
          <textarea
            rows={2} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Confirmed via phone · Cancelled — client rescheduled"
            autoFocus
            className="w-full resize-none rounded-lg border border-cream-border bg-white px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button" disabled={isUpdating} onClick={submitWithNote}
              className="rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: pendingAction === 'confirmed' ? '#8CE8AC' : '#FF9DA6' }}
            >
              {isUpdating ? 'Saving…' : pendingAction === 'confirmed' ? 'Confirm Appointment' : 'Cancel Appointment'}
            </button>
            <button
              type="button" onClick={() => { setPendingAction(null); setNote('') }}
              className="rounded-lg px-4 py-1.5 text-xs font-semibold text-mocha/60 hover:text-mocha"
            >Go back</button>
          </div>
        </div>
      )}

      {/* Admin advanced actions toggle */}
      {!pendingAction && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button
            type="button"
            onClick={() => { setAdminPanelOpen((o) => !o); resetAdminPanel() }}
            className="flex w-full items-center justify-between px-4 py-2.5 text-[0.65rem] font-semibold uppercase tracking-wide text-mocha/50 transition-colors hover:bg-cream-deep/40 hover:text-mocha/70"
          >
            Admin Actions
            <ChevronDown
              size={13}
              className="transition-transform"
              style={{ transform: adminPanelOpen ? 'rotate(180deg)' : undefined }}
            />
          </button>

          {adminPanelOpen && (
            <div className="px-4 pb-4 pt-1 space-y-3" style={{ background: 'rgba(0,0,0,0.012)' }}>
              {/* Action button grid */}
              {!adminAction && (
                <div className="flex flex-wrap gap-2">
                  {isActiveStatus && apt.depositStatus === 'paid' && (
                    <AdminActionBtn
                      label="Cancel by Salon + Refund"
                      color="#FF9DA6"
                      bg="rgba(239,68,68,0.10)"
                      onClick={() => setAdminAction('cancel-refund')}
                    />
                  )}
                  {isActiveStatus && (
                    <AdminActionBtn
                      label="Reschedule"
                      color="#A7BEFF"
                      bg="rgba(59,130,246,0.10)"
                      onClick={() => setAdminAction('reschedule')}
                    />
                  )}
                  {apt.depositStatus === 'paid' && (
                    <AdminActionBtn
                      label="Refund Manually"
                      color="#FFC98B"
                      bg="rgba(251,191,36,0.12)"
                      onClick={() => setAdminAction('refund')}
                    />
                  )}
                  {isActiveStatus && (
                    <AdminActionBtn
                      label="Mark Late Cancel + Forfeit"
                      color="#FF9DA6"
                      bg="rgba(239,68,68,0.08)"
                      onClick={() => setAdminAction('late-cancel')}
                    />
                  )}
                  {isActiveStatus && (
                    <AdminActionBtn
                      label="Mark No-Show + Forfeit"
                      color="#FF9DA6"
                      bg="rgba(239,68,68,0.08)"
                      onClick={() => setAdminAction('no-show')}
                    />
                  )}
                  <AdminActionBtn
                    label="Override With Reason"
                    color="#4A2C3F"
                    bg="rgba(107,114,128,0.10)"
                    onClick={() => setAdminAction('override')}
                  />
                </div>
              )}

              {/* Inline action forms */}
              {adminAction === 'cancel-refund' && (
                <AdminActionForm
                  title="Cancel by Salon + Full Refund"
                  description="This will cancel the appointment and issue a full $30.00 refund to the client's card."
                  confirmLabel="Cancel & Refund"
                  confirmColor="#FF9DA6"
                  requireNote={false}
                  note={actionNote}
                  onNoteChange={setActionNote}
                  onConfirm={() => adminMutation.mutate('cancel-refund')}
                  onBack={resetAdminPanel}
                  isPending={adminMutation.isPending}
                  error={adminError}
                />
              )}

              {adminAction === 'reschedule' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-mocha/70">Reschedule by Admin</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[0.6rem] font-bold uppercase tracking-wide text-mocha/50">New Date</label>
                      <input
                        type="date" value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-cream-border bg-white px-2.5 py-1.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                      />
                    </div>
                    <div>
                      <label className="text-[0.6rem] font-bold uppercase tracking-wide text-mocha/50">New Time</label>
                      <input
                        type="time" value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-cream-border bg-white px-2.5 py-1.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[0.6rem] font-bold uppercase tracking-wide text-mocha/50">Reason (optional)</label>
                    <input
                      type="text" value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="e.g. Stylist unavailable — moved to next availability"
                      className="mt-1 w-full rounded-lg border border-cream-border bg-white px-2.5 py-1.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                    />
                  </div>
                  {adminError && <p className="text-xs text-error">{adminError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={adminMutation.isPending || (!rescheduleDate || !rescheduleTime)}
                      onClick={() => adminMutation.mutate('reschedule')}
                      className="rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#A7BEFF' }}
                    >
                      {adminMutation.isPending ? 'Saving…' : 'Confirm Reschedule'}
                    </button>
                    <button type="button" onClick={resetAdminPanel} className="rounded-lg px-4 py-1.5 text-xs font-semibold text-mocha/60 hover:text-mocha">
                      Back
                    </button>
                  </div>
                </div>
              )}

              {adminAction === 'refund' && (
                <AdminActionForm
                  title="Refund Deposit Manually"
                  description="Issue a full $30.00 refund to the client's original payment method."
                  confirmLabel="Issue Refund"
                  confirmColor="#FFC98B"
                  requireNote={false}
                  note={actionNote}
                  onNoteChange={setActionNote}
                  onConfirm={() => adminMutation.mutate('refund')}
                  onBack={resetAdminPanel}
                  isPending={adminMutation.isPending}
                  error={adminError}
                />
              )}

              {adminAction === 'late-cancel' && (
                <AdminActionForm
                  title="Mark Late Cancel + Forfeit Deposit"
                  description={`Records this as a late cancellation. The ${formatPrice(apt.depositAmount ?? DEPOSIT_AMOUNT_CENTS)} deposit will be forfeited.`}
                  confirmLabel="Mark Late Cancel + Forfeit"
                  confirmColor="#FF9DA6"
                  requireNote={false}
                  note={actionNote}
                  onNoteChange={setActionNote}
                  notePlaceholder="Reason (optional)"
                  onConfirm={() => adminMutation.mutate('late-cancel')}
                  onBack={resetAdminPanel}
                  isPending={adminMutation.isPending}
                  error={adminError}
                />
              )}

              {adminAction === 'no-show' && (
                <AdminActionForm
                  title="Mark No-Show + Forfeit Deposit"
                  description={`Records this as a no-show. The ${formatPrice(apt.depositAmount ?? DEPOSIT_AMOUNT_CENTS)} deposit will be forfeited.`}
                  confirmLabel="Mark No-Show + Forfeit"
                  confirmColor="#FF9DA6"
                  requireNote={false}
                  note={actionNote}
                  onNoteChange={setActionNote}
                  notePlaceholder="Reason (optional)"
                  onConfirm={() => adminMutation.mutate('no-show')}
                  onBack={resetAdminPanel}
                  isPending={adminMutation.isPending}
                  error={adminError}
                />
              )}

              {adminAction === 'override' && (
                <AdminActionForm
                  title="Override With Reason"
                  description="Records an admin override note without changing the appointment status or deposit."
                  confirmLabel="Save Override"
                  confirmColor="#4A2C3F"
                  requireNote
                  note={actionNote}
                  onNoteChange={setActionNote}
                  notePlaceholder="Reason for override (required)"
                  onConfirm={() => adminMutation.mutate('override')}
                  onBack={resetAdminPanel}
                  isPending={adminMutation.isPending}
                  error={adminError}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AdminActionBtn({
  label, color, bg, onClick,
}: {
  label: string; color: string; bg: string; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
      style={{ background: bg, color }}
    >
      {label}
    </button>
  )
}

function AdminActionForm({
  title, description, confirmLabel, confirmColor, requireNote,
  note, onNoteChange, notePlaceholder, onConfirm, onBack, isPending, error,
}: {
  title: string
  description: string
  confirmLabel: string
  confirmColor: string
  requireNote: boolean
  note: string
  onNoteChange: (v: string) => void
  notePlaceholder?: string
  onConfirm: () => void
  onBack: () => void
  isPending: boolean
  error: string | null
}) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-xs font-semibold" style={{ color: confirmColor }}>{title}</p>
        <p className="text-[0.68rem] text-mocha/60 mt-0.5">{description}</p>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={notePlaceholder ?? 'Note (optional)'}
        className="w-full rounded-lg border border-cream-border bg-white px-2.5 py-1.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending || (requireNote && !note.trim())}
          onClick={onConfirm}
          className="rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          style={{ background: confirmColor }}
        >
          {isPending ? 'Saving…' : confirmLabel}
        </button>
        <button
          type="button" onClick={onBack}
          className="rounded-lg px-4 py-1.5 text-xs font-semibold text-mocha/60 hover:text-mocha"
        >
          Back
        </button>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export function AdminAppointments() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [filter, setFilter] = useState<StatusFilter>('confirmed')
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr)
  const queryClient = useQueryClient()

  // List view query — filtered by status
  const listQuery = useQuery({
    queryKey: ['admin-appointments', filter],
    queryFn: () => api.getAdminAppointments(filter !== 'all' ? { status: filter } : {}),
    enabled: view === 'list',
  })

  // Calendar view query — fetch all appointments
  const calQuery = useQuery({
    queryKey: ['admin-appointments-all'],
    queryFn: () => api.getAdminAppointments({}),
    enabled: view === 'calendar',
  })

  const mutation = useMutation({
    mutationFn: ({ id, status, adminNote }: {
      id: string
      status: 'confirmed' | 'cancelled' | 'completed'
      adminNote?: string
    }) => api.updateAppointment(id, { status, adminNote: adminNote?.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appointments'] })
      queryClient.invalidateQueries({ queryKey: ['admin-appointments-all'] })
    },
  })

  const allApts = useMemo(() => calQuery.data?.appointments ?? [], [calQuery.data])
  const listApts = useMemo(() => listQuery.data?.appointments ?? [], [listQuery.data])

  // Appointments for the selected calendar date
  const dayApts = useMemo(
    () => (selectedDate ? allApts.filter((a) => a.preferredDate === selectedDate) : []),
    [allApts, selectedDate],
  )

  // Today's pending count (for the summary chip)
  const todayPending = useMemo(
    () => allApts.filter((a) => a.preferredDate === todayStr() && a.status === 'pending').length,
    [allApts],
  )

  return (
    <>
      <PageMeta title="Appointments | Admin" description="" canonical="" />
      <AdminPageShell
        title="Appointments"
        intro="Review booking requests and manage your schedule."
        action={
          <div className="flex items-center gap-1 rounded-xl border border-cream-border bg-cream-deep p-1">
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                view === 'calendar' ? 'bg-paper text-espresso shadow-sm' : 'text-mocha/60 hover:text-mocha'
              }`}
            >
              <CalendarDays size={13} />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                view === 'list' ? 'bg-paper text-espresso shadow-sm' : 'text-mocha/60 hover:text-mocha'
              }`}
            >
              <List size={13} />
              List
            </button>
          </div>
        }
      >

        {/* ── CALENDAR VIEW ─────────────────────────────── */}
        {view === 'calendar' && (
          <div className="space-y-4">
            {/* Summary chips */}
            {!calQuery.isPending && (
              <div className="flex flex-wrap gap-2">
                {todayPending > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr())}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors hover:opacity-80"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#FFC98B' }}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    {todayPending} pending today
                  </button>
                )}
                <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'rgba(255,214,232,0.08)', color: '#F4D7E5' }}>
                  {allApts.length} total appointments
                </span>
              </div>
            )}

            {calQuery.isPending && (
              <div className="h-72 animate-pulse rounded-2xl bg-cream-deep" />
            )}

            {calQuery.isError && (
              <p className="text-sm text-error">Failed to load appointments. Please refresh.</p>
            )}

            {!calQuery.isPending && !calQuery.isError && (
              <AppointmentCalendar
                appointments={allApts}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            )}

            {/* Selected day detail */}
            {selectedDate && !calQuery.isPending && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-mocha/50">
                      {fmtDayHeading(selectedDate)}
                    </p>
                    {dayApts.length > 0 && (
                      <p className="mt-0.5 text-[0.65rem] text-mocha/40">
                        {dayApts.length} appointment{dayApts.length !== 1 ? 's' : ''}
                        {' · '}
                        {dayApts.filter(a => a.status === 'pending').length} pending
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="text-[0.65rem] font-semibold text-mocha/40 hover:text-mocha/70"
                  >
                    Clear
                  </button>
                </div>

                {dayApts.length === 0 ? (
                  <div className="rounded-xl border border-cream-border bg-paper p-6 text-center">
                    <p className="text-sm text-mocha/40">No appointments on this day.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {dayApts.map((apt) => (
                      <AppointmentCard
                        key={apt.appointmentId}
                        apt={apt}
                        compact
                        onUpdate={(status, adminNote) =>
                          mutation.mutate({ id: apt.appointmentId, status, adminNote })
                        }
                        isUpdating={mutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedDate && !calQuery.isPending && (
              <p className="py-4 text-center text-sm text-mocha/35">
                Tap a date to see that day's appointments.
              </p>
            )}
          </div>
        )}

        {/* ── LIST VIEW ─────────────────────────────────── */}
        {view === 'list' && (
          <>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                    filter === tab
                      ? 'bg-cocoa text-cream'
                      : 'bg-cream-deep text-mocha hover:bg-cream-border'
                  }`}
                >
                  {TAB_LABEL[tab]}
                </button>
              ))}
            </div>

            {listQuery.isPending && (
              <div className="grid gap-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-24 animate-pulse rounded-xl bg-cream-deep" />
                ))}
              </div>
            )}

            {listQuery.isError && (
              <p className="text-sm text-error">Failed to load appointments. Please refresh.</p>
            )}

            {!listQuery.isPending && !listQuery.isError && listApts.length === 0 && (
              <div className="rounded-xl border border-cream-border bg-paper p-10 text-center">
                <p className="text-sm text-mocha/60">
                  No {filter !== 'all' ? filter : ''} appointments.
                </p>
              </div>
            )}

            <div className="grid gap-3">
              {listApts.map((apt) => (
                <AppointmentCard
                  key={apt.appointmentId}
                  apt={apt}
                  onUpdate={(status, adminNote) =>
                    mutation.mutate({ id: apt.appointmentId, status, adminNote })
                  }
                  isUpdating={mutation.isPending}
                />
              ))}
            </div>
          </>
        )}
      </AdminPageShell>
    </>
  )
}
