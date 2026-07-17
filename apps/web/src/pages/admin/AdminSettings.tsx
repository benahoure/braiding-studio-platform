import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { ImageUploader } from '../../components/admin/ImageUploader'
import { PageMeta } from '../../components/seo/PageMeta'
import { api } from '../../lib/api'
import { defaultBusinessSettings } from '../../lib/mockData'
import type { BusinessSettings, DayName } from '../../types'
import { AdminPageShell } from './AdminDashboard'

const DAYS: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-cocoa" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
      />
    </div>
  )
}

// Always show what the public site is actually displaying in this spot —
// an empty admin card next to a live default photo reads as "hardcoded".
function PhotoPreview({
  url,
  fallback,
  aspect,
  alt,
}: {
  url?: string | null
  fallback?: string
  aspect: string
  alt: string
}) {
  const effective = url || fallback
  if (!effective) {
    return (
      <p className="mb-3 text-[0.68rem] italic text-mocha/40">
        No photo uploaded — the site hides this spot until you add one.
      </p>
    )
  }
  return (
    <div className="mb-3 w-full max-w-[160px]">
      <div className="relative">
        <img src={effective} alt={alt} className={`${aspect} w-full rounded-xl object-cover shadow`} />
        {!url && (
          <span
            className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase"
            style={{ background: 'rgba(17,17,17,0.72)', color: 'rgba(255,240,247,0.9)' }}
          >
            Built-in default
          </span>
        )}
      </div>
      {!url && (
        <p className="mt-1 text-[0.62rem] leading-snug text-mocha/40">
          What visitors currently see — upload to replace it.
        </p>
      )}
    </div>
  )
}

export function AdminSettings() {
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: api.getAdminSettings,
  })

  const settings = data ?? defaultBusinessSettings

  const [form, setForm] = useState<BusinessSettings>(settings)
  const [saved, setSaved] = useState(false)
  const [photoSaved, setPhotoSaved] = useState<'founder' | 'story' | 'contact' | null>(null)
  // Scoped like photoSaved — the shared photoMutation's isError would show
  // the failure banner under all three photo cards at once.
  const [photoError, setPhotoError] = useState<'founder' | 'story' | 'contact' | null>(null)
  const [dayOffFrom, setDayOffFrom] = useState('')
  const [dayOffTo, setDayOffTo] = useState('')
  const [blockDate, setBlockDate] = useState('')
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: (body: Partial<BusinessSettings>) => api.updateSettings(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-settings'], updated)
      queryClient.invalidateQueries({ queryKey: ['business-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const photoMutation = useMutation({
    mutationFn: (body: Partial<BusinessSettings>) => api.updateSettings(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-settings'], updated)
      queryClient.invalidateQueries({ queryKey: ['business-settings'] })
    },
  })

  function set<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Past days off / time blocks are irrelevant — prune them so lists stay tidy.
    const today = new Date().toISOString().slice(0, 10)
    mutation.mutate({
      ...form,
      blockedDates: (form.blockedDates ?? []).filter((d) => d >= today),
      blockedSlots: (form.blockedSlots ?? []).filter((s) => s.date >= today),
    })
  }

  function addTimeBlock() {
    if (!blockDate || !blockStart || !blockEnd || blockEnd <= blockStart) return
    const next = [...(form.blockedSlots ?? []), { date: blockDate, start: blockStart, end: blockEnd }].sort(
      (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
    )
    set('blockedSlots', next)
    setBlockDate('')
    setBlockStart('')
    setBlockEnd('')
  }

  function removeTimeBlock(index: number) {
    set(
      'blockedSlots',
      (form.blockedSlots ?? []).filter((_, i) => i !== index),
    )
  }

  function formatBlockTime(t: string): string {
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  function addDaysOff() {
    if (!dayOffFrom) return
    const from = dayOffFrom
    const to = dayOffTo && dayOffTo > from ? dayOffTo : from
    const dates: string[] = []
    // Walk the range in UTC to avoid DST surprises (max ~60 days as a guard).
    const cursor = new Date(`${from}T00:00:00Z`)
    const end = new Date(`${to}T00:00:00Z`)
    let guard = 0
    while (cursor <= end && guard < 60) {
      dates.push(cursor.toISOString().slice(0, 10))
      cursor.setUTCDate(cursor.getUTCDate() + 1)
      guard++
    }
    const merged = Array.from(new Set([...(form.blockedDates ?? []), ...dates])).sort()
    set('blockedDates', merged)
    setDayOffFrom('')
    setDayOffTo('')
  }

  function removeDayOff(date: string) {
    set(
      'blockedDates',
      (form.blockedDates ?? []).filter((d) => d !== date),
    )
  }

  if (isPending) {
    return (
      <AdminPageShell title="Settings" intro="Edit business details displayed on the public site.">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-12 animate-pulse rounded-xl bg-cream-deep" />
          ))}
        </div>
      </AdminPageShell>
    )
  }

  return (
    <>
      <PageMeta title="Settings | Admin" description="" canonical="" />
      <AdminPageShell
        title="Settings"
        intro="Edit business details that appear on the public site."
        action={
          saved ? (
            <span className="text-sm font-semibold" style={{ color: '#8CE8AC' }}>Saved!</span>
          ) : undefined
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact */}
          <section className="rounded-xl border border-cream-border bg-paper p-6 shadow-soft">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-cocoa/60">Contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Business Name"
                name="businessName"
                value={form.businessName}
                onChange={(v) => set('businessName', v)}
              />
              <Field
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={(v) => set('phone', v)}
              />
              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(v) => set('email', v)}
              />
            </div>
          </section>

          {/* Address */}
          <section className="rounded-xl border border-cream-border bg-paper p-6 shadow-soft">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-cocoa/60">Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Street"
                  name="street"
                  value={form.address.street}
                  onChange={(v) => set('address', { ...form.address, street: v })}
                />
              </div>
              <Field
                label="City"
                name="city"
                value={form.address.city}
                onChange={(v) => set('address', { ...form.address, city: v })}
              />
              <Field
                label="State"
                name="state"
                value={form.address.state}
                onChange={(v) => set('address', { ...form.address, state: v })}
              />
              <Field
                label="ZIP"
                name="zip"
                value={form.address.zip}
                onChange={(v) => set('address', { ...form.address, zip: v })}
              />
            </div>
          </section>

          {/* Hours */}
          <section className="rounded-xl border border-cream-border bg-paper p-5 shadow-soft">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-cocoa/60">Hours</h2>
            <div className="divide-y divide-cream-border/60">
              {DAYS.map((day) => {
                const h = form.hours[day]
                return (
                  <div key={day} className="flex items-center gap-2 py-2.5">
                    {/* Day abbreviation */}
                    <span className="w-8 shrink-0 text-[0.7rem] font-bold uppercase text-espresso">
                      {day.slice(0, 3)}
                    </span>

                    {/* Closed pill toggle */}
                    <label
                      className="flex shrink-0 cursor-pointer items-center gap-1.5 select-none"
                      title={h.closed ? 'Mark as open' : 'Mark as closed'}
                    >
                      <div
                        className="relative h-4 w-7 rounded-full transition-colors"
                        style={{ background: h.closed ? '#1F0A15' : 'rgba(0,0,0,0.12)' }}
                      >
                        <span
                          className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform"
                          style={{ transform: h.closed ? 'translateX(14px)' : 'translateX(2px)' }}
                        />
                        <input
                          type="checkbox"
                          checked={h.closed}
                          onChange={(e) =>
                            set('hours', { ...form.hours, [day]: { ...h, closed: e.target.checked } })
                          }
                          className="sr-only"
                        />
                      </div>
                      <span className="text-[0.65rem] font-semibold uppercase tracking-wide"
                        style={{ color: h.closed ? '#1F0A15' : 'rgba(107,79,58,0.4)' }}>
                        {h.closed ? 'Off' : 'On'}
                      </span>
                    </label>

                    {/* Time range */}
                    {h.closed ? (
                      <span className="flex-1 text-[0.65rem] italic text-mocha/30">Closed all day</span>
                    ) : (
                      <div className="flex flex-1 items-center gap-1.5">
                        <input
                          type="time"
                          value={h.open}
                          onChange={(e) =>
                            set('hours', { ...form.hours, [day]: { ...h, open: e.target.value } })
                          }
                          className="flex-1 min-w-0 rounded-lg border border-cream-border bg-cream px-1.5 py-1 text-xs text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                        />
                        <span className="shrink-0 text-[0.65rem] text-mocha/35">–</span>
                        <input
                          type="time"
                          value={h.close}
                          onChange={(e) =>
                            set('hours', { ...form.hours, [day]: { ...h, close: e.target.value } })
                          }
                          className="flex-1 min-w-0 rounded-lg border border-cream-border bg-cream px-1.5 py-1 text-xs text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Days Off — specific dates, unlike the weekly Hours schedule */}
          <section className="rounded-xl border border-cream-border bg-paper p-6 shadow-soft">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-cocoa/60">Days Off</h2>
            <p className="mb-4 text-xs text-mocha/50">
              Block specific dates (a vacation, an appointment, a holiday) without touching your
              weekly hours. Customers can&rsquo;t book these days. Use the weekly Hours above only
              for your regular schedule.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-cocoa" htmlFor="dayoff-from">
                  Date (or start of range)
                </label>
                <input
                  id="dayoff-from"
                  type="date"
                  value={dayOffFrom}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDayOffFrom(e.target.value)}
                  className="rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-cocoa" htmlFor="dayoff-to">
                  Until (optional)
                </label>
                <input
                  id="dayoff-to"
                  type="date"
                  value={dayOffTo}
                  min={dayOffFrom || new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDayOffTo(e.target.value)}
                  className="rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                />
              </div>
              <button
                type="button"
                onClick={addDaysOff}
                disabled={!dayOffFrom}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: '#C87390' }}
              >
                Add
              </button>
            </div>
            {(form.blockedDates ?? []).length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {(form.blockedDates ?? []).map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#FF9DA6' }}
                  >
                    {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    <button
                      type="button"
                      onClick={() => removeDayOff(date)}
                      aria-label={`Unblock ${date}`}
                      className="text-sm leading-none transition-opacity hover:opacity-70"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs italic text-mocha/40">No days off scheduled.</p>
            )}
            {/* Time blocks — partial-day unavailability */}
            <div className="mt-6 border-t border-cream-border pt-5">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-cocoa/60">
                Busy Hours (partial day)
              </h3>
              <p className="mb-4 text-xs text-mocha/50">
                Unavailable for part of a day — a morning appointment, an errand? Block just those
                hours; the rest of the day stays bookable.
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-cocoa" htmlFor="block-date">
                    Date
                  </label>
                  <input
                    id="block-date"
                    type="date"
                    value={blockDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-cocoa" htmlFor="block-start">
                    From
                  </label>
                  <input
                    id="block-start"
                    type="time"
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-cocoa" htmlFor="block-end">
                    Until
                  </label>
                  <input
                    id="block-end"
                    type="time"
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={addTimeBlock}
                  disabled={!blockDate || !blockStart || !blockEnd || blockEnd <= blockStart}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{ background: '#C87390' }}
                >
                  Add
                </button>
              </div>
              {(form.blockedSlots ?? []).length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(form.blockedSlots ?? []).map((slot, i) => (
                    <span
                      key={`${slot.date}-${slot.start}-${i}`}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                      style={{ background: 'rgba(251,191,36,0.12)', color: '#FFC98B' }}
                    >
                      {new Date(`${slot.date}T12:00:00`).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {formatBlockTime(slot.start)} – {formatBlockTime(slot.end)}
                      <button
                        type="button"
                        onClick={() => removeTimeBlock(i)}
                        aria-label={`Unblock ${slot.date} ${slot.start}`}
                        className="text-sm leading-none transition-opacity hover:opacity-70"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs italic text-mocha/40">No busy hours scheduled.</p>
              )}
            </div>

            <p className="mt-3 text-[0.7rem] text-mocha/50">
              Remember to press <span className="font-semibold">Save Settings</span> below to apply.
            </p>
          </section>

          {/* Social & Links */}
          <section className="rounded-xl border border-cream-border bg-paper p-6 shadow-soft">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-cocoa/60">Social & Links</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Instagram URL"
                name="instagram"
                value={form.socialLinks.instagram ?? ''}
                onChange={(v) => set('socialLinks', { ...form.socialLinks, instagram: v || null })}
              />
              <Field
                label="Facebook URL"
                name="facebook"
                value={form.socialLinks.facebook ?? ''}
                onChange={(v) => set('socialLinks', { ...form.socialLinks, facebook: v || null })}
              />
              <Field
                label="TikTok URL"
                name="tiktok"
                value={form.socialLinks.tiktok ?? ''}
                onChange={(v) => set('socialLinks', { ...form.socialLinks, tiktok: v || null })}
              />
              <Field
                label="Google Maps URL"
                name="googleMapsUrl"
                value={form.googleMapsUrl}
                onChange={(v) => set('googleMapsUrl', v)}
              />
              <Field
                label="Google Review URL"
                name="googleReviewUrl"
                value={form.googleReviewUrl}
                onChange={(v) => set('googleReviewUrl', v)}
              />
            </div>
          </section>

          {/* Announcements */}
          <section className="rounded-xl border border-cream-border bg-paper p-6 shadow-soft">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-cocoa/60">Announcements</h2>
            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-cocoa" htmlFor="announcementBanner">
                  Announcement Banner
                </label>
                <input
                  id="announcementBanner"
                  type="text"
                  value={form.announcementBanner ?? ''}
                  onChange={(e) => set('announcementBanner', e.target.value || null)}
                  placeholder="Leave blank to hide the banner"
                  className="w-full rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-cocoa" htmlFor="bookingNotice">
                  Booking Notice
                </label>
                <textarea
                  id="bookingNotice"
                  rows={2}
                  value={form.bookingNotice}
                  onChange={(e) => set('bookingNotice', e.target.value)}
                  className="w-full rounded-lg border border-cream-border bg-cream px-3 py-2 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-gold disabled:opacity-50"
              style={saved ? { background: '#22C55E', color: '#0B2914' } : undefined}
            >
              {mutation.isPending ? 'Saving…' : saved ? '✓ Saved — changes are live' : 'Save Settings'}
            </button>
            {mutation.isError && (
              <p className="text-sm text-error">Failed to save. Please try again.</p>
            )}
          </div>
        </form>

        {/* Photos — saved immediately on upload, not part of the main form */}
        <div className="mt-6 space-y-6">
          <section className="rounded-xl border border-cream-border bg-paper p-6 shadow-soft">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-cocoa/60">Photos</h2>
            <p className="mb-5 text-xs text-mocha/50">
              Uploaded photos save automatically. They appear on the About, Home, and Contact pages.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cocoa">
                  Founder Photo
                  <span className="ml-2 font-normal normal-case tracking-normal text-mocha/40">
                    About page top + Home page · 4:5 portrait
                  </span>
                </p>
                <PhotoPreview
                  url={settings.founderImageUrl}
                  fallback="/images/deb-1.jpg"
                  aspect="aspect-[4/5]"
                  alt="Current founder photo"
                />
                <ImageUploader
                  folder="portfolio"
                  aspectRatio={4 / 5}
                  label="Upload founder photo"
                  hint="4:5 portrait · JPG or WebP · max 10 MB"
                  onUploaded={(url) => {
                    setPhotoError(null)
                    photoMutation.mutate(
                      { founderImageUrl: url },
                      {
                        onSuccess: () => {
                          setPhotoSaved('founder')
                          setTimeout(() => setPhotoSaved(null), 4000)
                        },
                        onError: () => setPhotoError('founder'),
                      },
                    )
                  }}
                />
                {photoSaved === 'founder' && (
                  <p className="mt-2 text-xs font-semibold" style={{ color: '#8CE8AC' }}>
                    ✓ Photo saved — it&rsquo;s now live on the About and Home pages.
                  </p>
                )}
                {photoError === 'founder' && (
                  <p className="mt-1 text-xs text-error">Failed to save photo. Please try again.</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cocoa">
                  “Her Story” Photo
                  <span className="ml-2 font-normal normal-case tracking-normal text-mocha/40">
                    About page, lower photo · 4:5 portrait
                  </span>
                </p>
                <PhotoPreview
                  url={settings.storyImageUrl}
                  fallback="/images/deb-2.jpg"
                  aspect="aspect-[4/5]"
                  alt="Current Her Story photo"
                />
                <ImageUploader
                  folder="portfolio"
                  aspectRatio={4 / 5}
                  label="Upload Her Story photo"
                  hint="4:5 portrait · JPG or WebP · max 10 MB"
                  onUploaded={(url) => {
                    setPhotoError(null)
                    photoMutation.mutate(
                      { storyImageUrl: url },
                      {
                        onSuccess: () => {
                          setPhotoSaved('story')
                          setTimeout(() => setPhotoSaved(null), 4000)
                        },
                        onError: () => setPhotoError('story'),
                      },
                    )
                  }}
                />
                {photoSaved === 'story' && (
                  <p className="mt-2 text-xs font-semibold" style={{ color: '#8CE8AC' }}>
                    ✓ Photo saved — it&rsquo;s now live in the About page&rsquo;s Her Story section.
                  </p>
                )}
                {photoError === 'story' && (
                  <p className="mt-1 text-xs text-error">Failed to save photo. Please try again.</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cocoa">
                  Contact Page Photo
                  <span className="ml-2 font-normal normal-case tracking-normal text-mocha/40">
                    Contact page · 3:4 portrait
                  </span>
                </p>
                <PhotoPreview
                  url={settings.contactImageUrl}
                  aspect="aspect-[3/4]"
                  alt="Current contact photo"
                />
                <ImageUploader
                  folder="portfolio"
                  aspectRatio={3 / 4}
                  label="Upload contact photo"
                  hint="3:4 portrait · JPG or WebP · max 10 MB"
                  onUploaded={(url) => {
                    setPhotoError(null)
                    photoMutation.mutate(
                      { contactImageUrl: url },
                      {
                        onSuccess: () => {
                          setPhotoSaved('contact')
                          setTimeout(() => setPhotoSaved(null), 4000)
                        },
                        onError: () => setPhotoError('contact'),
                      },
                    )
                  }}
                />
                {photoSaved === 'contact' && (
                  <p className="mt-2 text-xs font-semibold" style={{ color: '#8CE8AC' }}>
                    ✓ Photo saved — it&rsquo;s now live on the Contact page.
                  </p>
                )}
                {photoError === 'contact' && (
                  <p className="mt-1 text-xs text-error">Failed to save photo. Please try again.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </AdminPageShell>
    </>
  )
}
