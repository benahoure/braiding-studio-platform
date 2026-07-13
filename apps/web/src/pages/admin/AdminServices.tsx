import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ImageUploader } from '../../components/admin/ImageUploader'
import { PageMeta } from '../../components/seo/PageMeta'
import { api, ApiRequestError } from '../../lib/api'
import { formatDuration, formatPrice } from '../../lib/format'
import { SERVICE_CATEGORIES, getCategoryLabel } from '../../lib/serviceCategories'
import type { SalonService, ServiceCategory } from '../../types'
import { AdminPageShell } from './AdminDashboard'

export function AdminServices() {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingService, setEditingService] = useState<SalonService | null>(null)

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-services'],
    queryFn: api.getAdminServices,
  })

  const [mutationError, setMutationError] = useState<string | null>(null)

  const toggleMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Pick<SalonService, 'active' | 'featured'>> }) =>
      api.updateService(id, body),
    onSuccess: () => {
      setMutationError(null)
      queryClient.invalidateQueries({ queryKey: ['admin-services'] })
    },
    onError: () => setMutationError('Update failed. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteService(id),
    onSuccess: () => {
      setMutationError(null)
      queryClient.invalidateQueries({ queryKey: ['admin-services'] })
    },
    onError: () => setMutationError('Delete failed. Please try again.'),
  })

  const services = data?.services ?? []
  const active = services.filter((s) => s.active)
  const inactive = services.filter((s) => !s.active)
  const isMutating = toggleMutation.isPending || deleteMutation.isPending

  return (
    <>
      <PageMeta title="Services | Admin" description="" canonical="" />
      <AdminPageShell
        title="Services"
        intro="Manage salon services. Active services appear on the public booking page. Featured services are highlighted on the homepage."
        action={
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1F0A15, #432735)', color: '#FFF2F8' }}
          >
            <Plus size={16} />
            Add Service
          </button>
        }
      >
        {isPending && (
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-16 animate-pulse rounded-xl bg-cream-deep" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-sm text-error">Failed to load services. Please refresh.</p>
        )}

        {mutationError && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-error">{mutationError}</p>
        )}

        {!isPending && !isError && (
          <div className="space-y-6">
            <ServiceSection
              title="Active services"
              services={active}
              onToggle={(id, body) => toggleMutation.mutate({ id, body })}
              onEdit={setEditingService}
              onDelete={(id, name) => {
                if (window.confirm(`Deactivate "${name}"? It will be removed from the public site.`)) {
                  deleteMutation.mutate(id)
                }
              }}
              isUpdating={isMutating}
            />
            {inactive.length > 0 && (
              <ServiceSection
                title="Inactive services"
                services={inactive}
                onToggle={(id, body) => toggleMutation.mutate({ id, body })}
                onEdit={setEditingService}
                onDelete={(id, name) => {
                  if (window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) {
                    deleteMutation.mutate(id)
                  }
                }}
                isUpdating={isMutating}
              />
            )}
          </div>
        )}
      </AdminPageShell>

      {showCreate && (
        <ServiceDrawer
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false)
            queryClient.invalidateQueries({ queryKey: ['admin-services'] })
          }}
        />
      )}

      {editingService && (
        <ServiceDrawer
          service={editingService}
          onClose={() => setEditingService(null)}
          onSaved={() => {
            setEditingService(null)
            queryClient.invalidateQueries({ queryKey: ['admin-services'] })
          }}
        />
      )}
    </>
  )
}

function ServiceSection({
  title,
  services,
  onToggle,
  onEdit,
  onDelete,
  isUpdating,
}: {
  title: string
  services: SalonService[]
  onToggle: (id: string, body: Partial<Pick<SalonService, 'active' | 'featured'>>) => void
  onEdit: (service: SalonService) => void
  onDelete: (id: string, name: string) => void
  isUpdating: boolean
}) {
  if (services.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 text-[0.7rem] font-bold uppercase tracking-widest text-cocoa/50">{title}</h2>
      <div className="grid gap-2">
        {services.map((service) => (
          <ServiceRow
            key={service.serviceId}
            service={service}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </div>
  )
}

function ServiceRow({
  service,
  onToggle,
  onEdit,
  onDelete,
  isUpdating,
}: {
  service: SalonService
  onToggle: (id: string, body: Partial<Pick<SalonService, 'active' | 'featured'>>) => void
  onEdit: (service: SalonService) => void
  onDelete: (id: string, name: string) => void
  isUpdating: boolean
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-cream-border bg-paper px-4 py-3.5 shadow-soft">
        {service.imageUrl && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="shrink-0 overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
            title="Click to enlarge"
          >
            <img
              src={service.imageUrl}
              alt={service.name}
              className="h-12 w-12 object-cover transition-opacity hover:opacity-80"
            />
          </button>
        )}
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-semibold text-espresso">{service.name}</p>
          <p className="mt-0.5 text-xs text-mocha/60">
            {getCategoryLabel(service.category)}
            {service.subcategory ? ` · ${getCategoryLabel(service.subcategory)}` : ''}
            {` · ${formatDuration(service.durationMinutes)} · from ${formatPrice(service.startingPrice)}`}
          </p>
        </div>
        {/* Wraps to its own full-width line on narrow screens */}
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <Toggle
            label="Featured"
            checked={service.featured}
            disabled={!service.active || isUpdating}
            onChange={(v) => onToggle(service.serviceId, { featured: v })}
          />
          <Toggle
            label={service.active ? 'Active' : 'Inactive'}
            checked={service.active}
            disabled={isUpdating}
            onChange={(v) => onToggle(service.serviceId, { active: v, ...(v ? {} : { featured: false }) })}
            activeColor="green"
          />
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onEdit(service)}
            className="rounded p-1 text-mocha/40 transition-colors hover:text-mocha disabled:opacity-40"
            aria-label="Edit service"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onDelete(service.serviceId, service.name)}
            className="rounded p-1 text-error/50 transition-colors hover:text-error disabled:opacity-40"
            aria-label="Delete service"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          src={service.imageUrl}
          alt={service.name}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="relative max-h-[90vh] max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt={alt}
          className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
        />
        <p className="mt-3 text-center text-sm font-semibold text-white/80">{alt}</p>
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-espresso shadow-lg hover:bg-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// Shared drawer used for both Create and Edit
function ServiceDrawer({
  service,
  onClose,
  onSaved,
}: {
  service?: SalonService
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!service

  const [imageUrl, setImageUrl] = useState(service?.imageUrl ?? '')
  const [changingPhoto, setChangingPhoto] = useState(false)
  const [name, setName] = useState(service?.name ?? '')
  const [category, setCategory] = useState<ServiceCategory>(service?.category ?? 'braids-protective-styles')
  // Determine if the existing subcategory is a known one or a custom value
  const knownSubs = SERVICE_CATEGORIES.find((c) => c.value === (service?.category ?? category))?.subcategories?.map((s) => s.value) ?? []
  const initialSub = service?.subcategory ?? ''
  const isCustomSub = !!(initialSub && !knownSubs.includes(initialSub))
  const [subcategory, setSubcategory] = useState<string>(isCustomSub ? '__custom__' : initialSub)
  // If the stored value is a slug (lowercase + hyphens only), convert to display form so the admin sees readable text
  const [customSubcategory, setCustomSubcategory] = useState(() => {
    if (!isCustomSub) return ''
    return /^[a-z][a-z0-9-]*$/.test(initialSub)
      ? initialSub.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : initialSub
  })
  const [imagePosition, setImagePosition] = useState(service?.imagePosition ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [priceStr, setPriceStr] = useState(service ? String(service.startingPrice / 100) : '')
  const [durationHours, setDurationHours] = useState(service ? String(Math.floor(service.durationMinutes / 60)) : '')
  const [durationMins, setDurationMins] = useState(service ? String(service.durationMinutes % 60) : '')
  const [featured, setFeatured] = useState(service?.featured ?? false)
  const [active, setActive] = useState(service?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!imageUrl) { setError('Please upload a service image.'); return }
    const startingPrice = Math.round(parseFloat(priceStr) * 100)
    const durationMinutes = (parseInt(durationHours || '0', 10) * 60) + parseInt(durationMins || '0', 10)
    if (isNaN(startingPrice) || startingPrice <= 0) { setError('Enter a valid price.'); return }
    if (isNaN(durationMinutes) || durationMinutes < 15) { setError('Duration must be at least 15 minutes.'); return }
    if (description.trim().length < 10) { setError('Description must be at least 10 characters.'); return }
    setError(null)
    setIsSubmitting(true)
    try {
      // Send null (not undefined) so the Lambda can REMOVE the field from DynamoDB when cleared
      const subcategoryValue = (subcategory === '__custom__' ? (customSubcategory.trim() || null) : (subcategory || null)) as import('../../types').ServiceSubcategory | null
      const imagePositionValue = imagePosition || null
      if (isEdit) {
        await api.updateService(service.serviceId, {
          name, category, subcategory: subcategoryValue, description, startingPrice, durationMinutes,
          imageUrl, imagePosition: imagePositionValue, featured, active,
        })
      } else {
        await api.createService({
          name, category, subcategory: subcategoryValue ?? undefined, description, startingPrice, durationMinutes,
          imageUrl, imagePosition: imagePositionValue ?? undefined, featured, active,
        })
      }
      onSaved()
    } catch (err) {
      if (err instanceof ApiRequestError && err.fieldErrors) {
        const fieldLabels: Record<string, string> = {
          description: 'Description', name: 'Service name',
          startingPrice: 'Price', durationMinutes: 'Duration', imageUrl: 'Photo',
        }
        const [field, msg] = Object.entries(err.fieldErrors)[0] ?? []
        if (field && msg) {
          const clean = msg.replace(/\s*\[type=\w+[^\]]*\]/, '').trim()
          setError(`${fieldLabels[field] ?? field}: ${clean}`)
        } else {
          setError(err.message || 'Please review the highlighted fields.')
        }
      } else {
        setError(`Failed to ${isEdit ? 'update' : 'create'} service. Please try again.`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col overflow-y-auto shadow-2xl"
        style={{ background: '#FFF2F8' }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #1F0A15, #1C0D17)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-gold-light/70">Services</p>
            <h2 className="mt-0.5 text-lg font-semibold text-cream">
              {isEdit ? 'Edit Service' : 'Add New Service'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,240,247,0.6)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-6 py-6">
          {/* Photo */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Service Photo <span className="text-error">*</span>
            </label>

            {isEdit && imageUrl && !changingPhoto ? (
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={imageUrl}
                  alt={name}
                  className="h-40 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setChangingPhoto(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                >
                  <span className="rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold text-espresso shadow">
                    Change photo
                  </span>
                </button>
              </div>
            ) : (
              <ImageUploader
                folder="services"
                onUploaded={(url) => { setImageUrl(url); setChangingPhoto(false) }}
                label="Upload service photo"
                hint="4:5 portrait crop · JPG, PNG, WebP · max 10 MB"
              />
            )}
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Service Name <span className="text-error">*</span>
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Knotless Braids — Waist Length"
              className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Category <span className="text-error">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value as ServiceCategory); setSubcategory('') }}
              className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
            >
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Subcategory — options driven by selected category, with custom fallback */}
          {(() => {
            const subs = SERVICE_CATEGORIES.find((c) => c.value === category)?.subcategories ?? []
            return (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
                  Subcategory
                </label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                >
                  <option value="">— None —</option>
                  {subs.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                  <option value="__custom__">Custom (type below)…</option>
                </select>
                {subcategory === '__custom__' && (
                  <input
                    type="text"
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    placeholder="e.g. Ivorian Braids"
                    className="mt-2 w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                  />
                )}
              </div>
            )
          })()}

          {/* Image Position */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Image Focus
            </label>
            <select
              value={imagePosition}
              onChange={(e) => setImagePosition(e.target.value)}
              className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
            >
              <option value="">Default (center)</option>
              <option value="center center">Center</option>
              <option value="top center">Top</option>
              <option value="center 20%">Slightly Up</option>
              <option value="center 35%">Slightly Down</option>
              <option value="left center">Left</option>
              <option value="right center">Right</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Description <span className="text-error">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this service for clients…"
              className="w-full resize-none rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
            />
            <p className="mt-1 text-[0.65rem] text-mocha/40">
              {description.length < 10
                ? `${10 - description.length} more character${10 - description.length === 1 ? '' : 's'} needed`
                : `${description.length} / 1000`}
            </p>
          </div>

          {/* Price + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
                Starting Price ($) <span className="text-error">*</span>
              </label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                placeholder="150.00"
                className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
                Duration <span className="text-error">*</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 pr-9 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mocha/40">hr</span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={durationMins}
                    onChange={(e) => setDurationMins(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 pr-12 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mocha/40">min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active + Featured */}
          <div className="flex gap-6 rounded-xl border border-cream-border bg-white px-4 py-3.5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => { setActive(e.target.checked); if (!e.target.checked) setFeatured(false) }}
                className="h-4 w-4 rounded accent-green-700"
              />
              <span className="text-sm font-semibold text-espresso">Active</span>
              <span className="text-xs text-mocha/50">(live on site)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={featured}
                disabled={!active}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4 rounded accent-yellow-700 disabled:opacity-40"
              />
              <span className="text-sm font-semibold text-espresso">Featured</span>
              <span className="text-xs text-mocha/50">(homepage)</span>
            </label>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-error">{error}</p>
          )}

          <div className="mt-auto flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-cream-border py-3 text-sm font-semibold text-mocha transition-colors hover:bg-cream-deep"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !imageUrl}
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-cream transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #1F0A15, #432735)' }}
            >
              {isSubmitting
                ? (isEdit ? 'Saving…' : 'Creating…')
                : (isEdit ? 'Save Changes' : 'Create Service')}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
  activeColor = 'gold',
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
  activeColor?: 'gold' | 'green'
}) {
  const trackOn = activeColor === 'green' ? '#16a34a' : '#E8789F'
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1">
      <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-mocha/50">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative h-5 w-9 rounded-full transition-colors disabled:opacity-40"
        style={{ background: checked ? trackOn : 'rgba(0,0,0,0.12)' }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
          style={{ left: '2px', transform: checked ? 'translateX(16px)' : 'none' }}
        />
      </button>
    </label>
  )
}
