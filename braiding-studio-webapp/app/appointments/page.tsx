'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Appointment } from '@/types'
import { getAppointments, updateAppointment, formatDuration } from '@/lib/data'
import { Calendar, Clock, DollarSign, CheckCircle, XCircle, Edit2, Trash2, Plus, AlertCircle } from 'lucide-react'

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled' | 'completed'>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [emailFilter, setEmailFilter] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [searched, setSearched] = useState(false)

  const loadAppointments = () => {
    setAppointments(getAppointments())
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  const filtered = appointments.filter(a => {
    const statusMatch = filter === 'all' || a.status === filter
    const emailMatch = !emailFilter || a.clientEmail.toLowerCase().includes(emailFilter.toLowerCase())
    return statusMatch && emailMatch
  })

  const handleCancel = (id: string) => {
    updateAppointment(id, { status: 'cancelled' })
    loadAppointments()
    setCancellingId(null)
  }

  const handleSearch = () => {
    setEmailFilter(emailInput)
    setSearched(true)
  }

  const statusIcon = (status: Appointment['status']) => {
    if (status === 'confirmed') return <span className="badge-confirmed"><CheckCircle size={11} /> Confirmed</span>
    if (status === 'cancelled') return <span className="badge-cancelled"><XCircle size={11} /> Cancelled</span>
    return <span className="badge-completed"><CheckCircle size={11} /> Completed</span>
  }

  return (
    <div className="min-h-screen pattern-bg pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-10">
          <div className="section-label mb-2">Booking History</div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <h1 className="section-title text-4xl">My Appointments</h1>
            <Link href="/booking" className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={14} /> Book New
            </Link>
          </div>
          <div className="w-10 h-px mt-4" style={{ background: 'var(--gold)' }} />
        </div>

        {/* Email Lookup */}
        <div
          className="card-luxury p-5 mb-8 flex flex-col sm:flex-row gap-3 items-end"
        >
          <div className="flex-1">
            <label className="block text-xs font-medium tracking-wider uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
              Find by Email
            </label>
            <input
              type="email"
              className="input-luxury"
              placeholder="Filter appointments by email address"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="btn-primary text-sm flex-shrink-0">
            Search
          </button>
          {emailFilter && (
            <button
              onClick={() => { setEmailFilter(''); setEmailInput(''); setSearched(false) }}
              className="btn-outline text-sm flex-shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {(['all', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-4 py-2 rounded-full text-xs font-medium tracking-wide uppercase transition-all capitalize"
              style={{
                background: filter === s ? 'var(--onyx)' : 'white',
                color: filter === s ? 'var(--gold-light)' : 'var(--muted)',
                border: `1px solid ${filter === s ? 'var(--onyx)' : '#E8DDD0'}`,
              }}
            >
              {s}
            </button>
          ))}
          <span className="ml-auto text-xs self-center" style={{ color: 'var(--muted)' }}>
            {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Appointments */}
        {filtered.length === 0 ? (
          <div
            className="card-luxury p-14 text-center"
          >
            <AlertCircle size={36} className="mx-auto mb-4" style={{ color: '#D4C9BA' }} />
            <h3 className="font-display text-2xl font-light mb-2">No Appointments Found</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              {appointments.length === 0
                ? "You haven't booked any appointments yet."
                : "No appointments match your current filters."}
            </p>
            <Link href="/booking" className="btn-primary">
              Book Your First Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(apt => (
                <div
                  key={apt.id}
                  className="card-luxury p-5 md:p-6"
                  style={{
                    opacity: apt.status === 'cancelled' ? 0.65 : 1,
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Date Block */}
                    <div
                      className="flex-shrink-0 text-center p-3 rounded"
                      style={{
                        background: apt.status === 'cancelled' ? '#F5F0EA' : 'var(--onyx)',
                        minWidth: '70px',
                        borderRadius: '4px',
                      }}
                    >
                      <div
                        className="font-display text-2xl font-light leading-none"
                        style={{ color: apt.status === 'cancelled' ? 'var(--muted)' : 'var(--gold-light)' }}
                      >
                        {format(new Date(apt.date + 'T12:00:00'), 'd')}
                      </div>
                      <div
                        className="text-[0.6rem] font-medium tracking-wider uppercase mt-1"
                        style={{ color: apt.status === 'cancelled' ? '#B5A898' : 'rgba(253,248,240,0.6)' }}
                      >
                        {format(new Date(apt.date + 'T12:00:00'), 'MMM yy')}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-medium">{apt.serviceName}</h3>
                        {statusIcon(apt.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {format(new Date(apt.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {apt.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign size={11} /> ${apt.servicePrice}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatDuration(apt.serviceDuration)}
                        </span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: '#B5A898' }}>
                        {apt.clientName} · {apt.clientEmail}
                      </div>
                      {apt.notes && (
                        <div className="text-xs mt-2 italic" style={{ color: 'var(--muted)' }}>
                          Note: {apt.notes}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {apt.status === 'confirmed' && (
                      <div className="flex gap-2 flex-shrink-0">
                        {cancellingId === apt.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>Cancel?</span>
                            <button
                              onClick={() => handleCancel(apt.id)}
                              className="text-xs font-medium px-3 py-1.5 rounded"
                              style={{
                                background: '#FEF2F2',
                                color: '#991B1B',
                                border: '1px solid #FECACA',
                                borderRadius: '2px',
                              }}
                            >
                              Yes, Cancel
                            </button>
                            <button
                              onClick={() => setCancellingId(null)}
                              className="text-xs font-medium px-3 py-1.5 rounded"
                              style={{
                                background: 'transparent',
                                color: 'var(--muted)',
                                border: '1px solid #E8DDD0',
                                borderRadius: '2px',
                              }}
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancellingId(apt.id)}
                            className="p-2 rounded transition-colors hover:bg-red-50"
                            title="Cancel appointment"
                            style={{ borderRadius: '2px' }}
                          >
                            <Trash2 size={14} style={{ color: '#C0392B' }} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Booking ID */}
                  <div
                    className="mt-4 pt-3 border-t text-[0.65rem] font-mono"
                    style={{ borderColor: '#F0EAE0', color: '#C4B9AC' }}
                  >
                    Booking #{apt.id.slice(-12).toUpperCase()} · Booked {format(new Date(apt.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
