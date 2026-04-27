'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Appointment } from '@/types'
import { getAppointments, updateAppointment, deleteAppointment, exportAppointmentsCSV, formatDuration } from '@/lib/data'
import {
  Download, RefreshCw, Trash2, CheckCircle, XCircle,
  BarChart2, DollarSign, Calendar, Users, TrendingUp
} from 'lucide-react'

export default function AdminPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled' | 'completed'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'created' | 'price'>('created')

  const load = () => setAppointments(getAppointments())

  useEffect(() => { load() }, [])

  const filtered = appointments
    .filter(a => filter === 'all' || a.status === filter)
    .sort((a, b) => {
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === 'date') return a.date.localeCompare(b.date)
      if (sortBy === 'price') return b.servicePrice - a.servicePrice
      return 0
    })

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    revenue: appointments.filter(a => a.status !== 'cancelled').reduce((sum, a) => sum + a.servicePrice, 0),
  }

  const handleStatusChange = (id: string, status: Appointment['status']) => {
    updateAppointment(id, { status })
    load()
  }

  const handleDelete = (id: string) => {
    if (confirm('Permanently delete this appointment?')) {
      deleteAppointment(id)
      load()
    }
  }

  return (
    <div className="min-h-screen pt-28 pb-20" style={{ background: '#F8F5EE' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
          <div>
            <div className="section-label mb-2">Studio Management</div>
            <h1 className="section-title text-4xl">Admin Dashboard</h1>
            <div className="w-10 h-px mt-4" style={{ background: 'var(--gold)' }} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={load}
              className="btn-outline flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={exportAppointmentsCSV}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: Users, label: 'Total Bookings', value: stats.total, color: 'var(--onyx)' },
            { icon: CheckCircle, label: 'Confirmed', value: stats.confirmed, color: '#065F46' },
            { icon: XCircle, label: 'Cancelled', value: stats.cancelled, color: '#991B1B' },
            {
              icon: DollarSign,
              label: 'Total Revenue',
              value: `$${stats.revenue.toLocaleString()}`,
              color: 'var(--gold-dark)',
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card-luxury p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--muted)' }}>
                  {label}
                </div>
                <Icon size={16} style={{ color }} />
              </div>
              <div className="font-display text-3xl font-light" style={{ color }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex gap-2">
            {(['all', 'confirmed', 'completed', 'cancelled'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase transition-all capitalize"
                style={{
                  background: filter === s ? 'var(--onyx)' : 'white',
                  color: filter === s ? 'var(--gold-light)' : 'var(--muted)',
                  border: `1px solid ${filter === s ? 'var(--onyx)' : '#E8DDD0'}`,
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            Sort:
            {(['created', 'date', 'price'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className="px-2 py-1 rounded capitalize transition-all"
                style={{
                  background: sortBy === s ? 'var(--blush)' : 'transparent',
                  color: sortBy === s ? 'var(--onyx)' : 'var(--muted)',
                  fontWeight: sortBy === s ? 500 : 400,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card-luxury overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <p className="font-display text-2xl font-light mb-2" style={{ color: 'var(--muted)' }}>
                No appointments yet
              </p>
              <Link href="/booking" className="btn-primary mt-4 inline-flex">
                Create Test Booking
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--onyx)' }}>
                    {['ID', 'Client', 'Service', 'Date & Time', 'Price', 'Status', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[0.65rem] font-medium tracking-wider uppercase"
                        style={{ color: 'rgba(253,248,240,0.6)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apt, i) => (
                    <tr
                      key={apt.id}
                      style={{
                        background: i % 2 === 0 ? 'white' : '#FDFAF6',
                        opacity: apt.status === 'cancelled' ? 0.6 : 1,
                      }}
                    >
                      <td className="px-4 py-3 text-[0.65rem] font-mono" style={{ color: '#B5A898' }}>
                        #{apt.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{apt.clientName}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{apt.clientEmail}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{apt.clientPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{apt.serviceName}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>
                          {formatDuration(apt.serviceDuration)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {format(new Date(apt.date + 'T12:00:00'), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{apt.time}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-display text-lg font-light">${apt.servicePrice}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={apt.status}
                          onChange={e => handleStatusChange(apt.id, e.target.value as Appointment['status'])}
                          className="text-xs px-2 py-1.5 rounded border cursor-pointer"
                          style={{
                            borderColor: '#E8DDD0',
                            background: 'white',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(apt.id)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 size={13} style={{ color: '#C0392B' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div className="text-xs mt-4" style={{ color: 'var(--muted)' }}>
            Showing {filtered.length} of {appointments.length} appointments.
            {' '}Data stored in browser localStorage.
            {' '}<Link href="/booking" className="underline">Add test bookings →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
