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

export function AdminSettings() {
  const queryClient = useQueryClient()

  const { data, isPending } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: api.getAdminSettings,
  })

  const settings = data ?? defaultBusinessSettings

  const [form, setForm] = useState<BusinessSettings>(settings)
  const [saved, setSaved] = useState(false)

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
    mutation.mutate(form)
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
            <span className="text-sm font-semibold text-green-700">Saved!</span>
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
            >
              {mutation.isPending ? 'Saving…' : 'Save Settings'}
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
                    About & Home pages · 4:5 portrait
                  </span>
                </p>
                {settings.founderImageUrl && (
                  <img
                    src={settings.founderImageUrl}
                    alt="Current founder photo"
                    className="mb-3 aspect-[4/5] w-full max-w-[160px] rounded-xl object-cover shadow"
                  />
                )}
                <ImageUploader
                  folder="portfolio"
                  aspectRatio={4 / 5}
                  label="Upload founder photo"
                  hint="4:5 portrait · JPG or WebP · max 10 MB"
                  onUploaded={(url) => photoMutation.mutate({ founderImageUrl: url })}
                />
                {photoMutation.isError && (
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
                {settings.contactImageUrl && (
                  <img
                    src={settings.contactImageUrl}
                    alt="Current contact photo"
                    className="mb-3 aspect-[3/4] w-full max-w-[160px] rounded-xl object-cover shadow"
                  />
                )}
                <ImageUploader
                  folder="portfolio"
                  aspectRatio={3 / 4}
                  label="Upload contact photo"
                  hint="3:4 portrait · JPG or WebP · max 10 MB"
                  onUploaded={(url) => photoMutation.mutate({ contactImageUrl: url })}
                />
                {photoMutation.isError && (
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
