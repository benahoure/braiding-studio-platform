import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ImageUploader } from '../../components/admin/ImageUploader'
import { PageMeta } from '../../components/seo/PageMeta'
import { api } from '../../lib/api'
import { shortDate } from '../../lib/format'
import type { PortfolioItem, SalonService, ServiceCategory } from '../../types'
import { AdminPageShell } from './AdminDashboard'

const PORTFOLIO_CATEGORIES: { value: string; label: string }[] = [
  { value: 'knotless', label: 'Knotless Braids' },
  { value: 'boho', label: 'Boho Braids' },
  { value: 'box-braids', label: 'Box Braids' },
  { value: 'cornrows', label: 'Cornrows' },
  { value: 'fulani', label: 'Fulani Braids' },
  { value: 'twists', label: 'Twist Braids' },
  { value: 'kids', label: 'Kids' },
  { value: '__custom__', label: 'Custom (type below)…' },
]

const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'braids-protective-styles', label: 'Braids & Protective Styles' },
  { value: 'natural-ponytails', label: 'Natural Hair & Ponytails' },
  { value: 'sew-in-wigs', label: 'Sew-In, Wigs & Crochet' },
  { value: 'kids', label: 'Kids & Toddlers' },
]

type Destination = 'portfolio' | 'add-to-service' | 'new-service'

export function AdminPortfolio() {
  const queryClient = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-portfolio'],
    queryFn: api.getAdminPortfolio,
  })

  const [mutationError, setMutationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Pick<PortfolioItem, 'active' | 'featured'>> }) =>
      api.updatePortfolio(id, body),
    onSuccess: () => {
      setMutationError(null)
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] })
    },
    onError: () => setMutationError('Update failed. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePortfolio(id),
    onSuccess: () => {
      setMutationError(null)
      queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] })
    },
    onError: () => setMutationError('Delete failed. Please try again.'),
  })

  const items = data?.portfolio ?? []
  const isMutating = updateMutation.isPending || deleteMutation.isPending

  function handleDelete(item: PortfolioItem) {
    if (window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      deleteMutation.mutate(item.styleId)
    }
  }

  return (
    <>
      <PageMeta title="Gallery | Admin" description="" canonical="" />
      <AdminPageShell
        title="Gallery"
        intro="Manage gallery photos. Toggle items visible or featured, add new photos, or attach photos to services."
        action={
          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1F0A15, #432735)', color: '#FFF2F8' }}
          >
            <Plus size={16} />
            Add Photo
          </button>
        }
      >
        {isPending && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="aspect-square animate-pulse rounded-xl bg-cream-deep" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-sm text-error">Failed to load portfolio. Please refresh.</p>
        )}

        {mutationError && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-error">{mutationError}</p>
        )}

        {!isPending && !isError && items.length === 0 && (
          <div className="rounded-xl border border-cream-border bg-paper p-10 text-center">
            <p className="text-sm text-mocha/60">No portfolio items yet.</p>
          </div>
        )}

        {!isPending && !isError && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <PortfolioAdminCard
                key={item.styleId}
                item={item}
                onToggleActive={() =>
                  updateMutation.mutate({
                    id: item.styleId,
                    body: { active: !item.active, ...(item.active ? { featured: false } : {}) },
                  })
                }
                onToggleFeatured={() =>
                  updateMutation.mutate({ id: item.styleId, body: { featured: !item.featured } })
                }
                onDelete={() => handleDelete(item)}
                isUpdating={isMutating}
              />
            ))}
          </div>
        )}
      </AdminPageShell>

      {showUpload && (
        <AddPhotoDrawer
          onClose={() => setShowUpload(false)}
          onCreated={() => {
            setShowUpload(false)
            queryClient.invalidateQueries({ queryKey: ['admin-portfolio'] })
            queryClient.invalidateQueries({ queryKey: ['admin-services'] })
          }}
        />
      )}
    </>
  )
}

function PortfolioAdminCard({
  item,
  onToggleActive,
  onToggleFeatured,
  onDelete,
  isUpdating,
}: {
  item: PortfolioItem
  onToggleActive: () => void
  onToggleFeatured: () => void
  onDelete: () => void
  isUpdating: boolean
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-cream-border bg-paper shadow-soft transition-all hover:shadow-md"
      style={{ opacity: item.active ? 1 : 0.55 }}
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={item.thumbnailUrl || item.imageUrl}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-3">
        <p className="truncate text-xs font-semibold text-espresso">{item.title}</p>
        <p className="mt-0.5 text-[0.6rem] capitalize text-mocha/50">
          {item.category.replace(/-/g, ' ')} · {shortDate(item.createdAt)}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={isUpdating}
            onClick={onToggleActive}
            className="rounded px-2 py-0.5 text-[0.65rem] font-semibold disabled:opacity-40"
            style={
              item.active
                ? { background: 'rgba(34,197,94,0.12)', color: '#8CE8AC' }
                : { background: 'rgba(0,0,0,0.07)', color: '#555' }
            }
          >
            {item.active ? 'Active' : 'Hidden'}
          </button>

          {item.active && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={onToggleFeatured}
              className="rounded px-2 py-0.5 text-[0.65rem] font-semibold disabled:opacity-40"
              style={
                item.featured
                  ? { background: 'rgba(232,120,159,0.15)', color: '#FFC98B' }
                  : { background: 'rgba(0,0,0,0.07)', color: '#555' }
              }
            >
              {item.featured ? 'Featured' : 'Feature'}
            </button>
          )}

          <button
            type="button"
            disabled={isUpdating}
            onClick={onDelete}
            className="ml-auto rounded p-0.5 text-error/60 transition-colors hover:text-error disabled:opacity-40"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function AddPhotoDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [imageUrl, setImageUrl] = useState('')
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState<Destination>('portfolio')
  const [portfolioCategory, setPortfolioCategory] = useState('knotless')
  const [customPortfolioCategory, setCustomPortfolioCategory] = useState('')
  const [featured, setFeatured] = useState(false)

  // Reset uploaded URL when destination changes — avoids CDN folder mismatch
  useEffect(() => {
    setImageUrl('')
  }, [destination])

  // "add to existing service" fields
  const [selectedServiceId, setSelectedServiceId] = useState('')

  // "create as new service" fields
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('braids-protective-styles')
  const [serviceDescription, setServiceDescription] = useState('')
  const [servicePriceStr, setServicePriceStr] = useState('')
  const [serviceDurationStr, setServiceDurationStr] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const servicesQuery = useQuery({
    queryKey: ['admin-services'],
    queryFn: api.getAdminServices,
    enabled: destination === 'add-to-service',
  })
  const activeServices = (servicesQuery.data?.services ?? []).filter((s) => s.active)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!imageUrl) { setError('Please upload a photo first.'); return }
    if (!title.trim()) { setError('Please enter a title for this photo.'); return }
    const resolvedCategory = (
      portfolioCategory === '__custom__' ? customPortfolioCategory.trim() : portfolioCategory
    ) as import('../../types').PortfolioCategory
    if (!resolvedCategory) { setError('Please enter a custom category name.'); return }

    setError(null)
    setIsSubmitting(true)

    try {
      if (destination === 'portfolio') {
        await api.createPortfolioItem({
          title: title.trim(),
          category: resolvedCategory,
          imageUrl,
          thumbnailUrl: imageUrl,
          featured,
          active: true,
        })
      } else if (destination === 'add-to-service') {
        if (!selectedServiceId) { setError('Please select a service.'); setIsSubmitting(false); return }
        await api.updateService(selectedServiceId, { addImage: imageUrl } as Parameters<typeof api.updateService>[1])
        await api.createPortfolioItem({
          title: title.trim(),
          category: resolvedCategory,
          imageUrl,
          thumbnailUrl: imageUrl,
          featured,
          active: true,
        })
      } else {
        // new service
        const startingPrice = Math.round(parseFloat(servicePriceStr) * 100)
        const durationMinutes = parseInt(serviceDurationStr, 10)
        if (isNaN(startingPrice) || startingPrice <= 0) { setError('Enter a valid price.'); setIsSubmitting(false); return }
        if (isNaN(durationMinutes) || durationMinutes <= 0) { setError('Enter a valid duration.'); setIsSubmitting(false); return }
        await api.createService({
          name: title.trim(),
          category: serviceCategory,
          description: serviceDescription,
          startingPrice,
          durationMinutes,
          imageUrl,
          featured,
          active: true,
        })
        await api.createPortfolioItem({
          title: title.trim(),
          category: resolvedCategory,
          imageUrl,
          thumbnailUrl: imageUrl,
          featured: false,
          active: true,
        })
      }
      onCreated()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const destinationOptions: { value: Destination; label: string; desc: string }[] = [
    { value: 'portfolio', label: 'Portfolio only', desc: 'Shows in the gallery on your website' },
    { value: 'add-to-service', label: 'Add to existing service', desc: "Adds photo to a service's gallery" },
    { value: 'new-service', label: 'Create new service', desc: 'Creates a bookable service with this photo' },
  ]

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
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-gold-light/70">Portfolio</p>
            <h2 className="mt-0.5 text-lg font-semibold text-cream">Add New Photo</h2>
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
          {/* Image upload */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Photo <span className="text-error">*</span>
            </label>
            <ImageUploader
              key={destination}
              folder={destination === 'portfolio' ? 'portfolio' : 'services'}
              onUploaded={setImageUrl}
              label="Upload photo"
              hint="4:5 portrait crop · JPG, PNG, WebP · max 10 MB"
            />
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Photo Title <span className="text-error">*</span>
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Boho Knotless Braids"
              className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
            />
          </div>

          {/* Destination */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Where should this photo go? <span className="text-error">*</span>
            </label>
            <div className="grid gap-2">
              {destinationOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all"
                  style={{
                    borderColor: destination === opt.value ? 'rgba(184,145,42,0.6)' : 'rgba(0,0,0,0.1)',
                    background: destination === opt.value ? 'rgba(232,120,159,0.06)' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="destination"
                    value={opt.value}
                    checked={destination === opt.value}
                    onChange={() => setDestination(opt.value)}
                    className="mt-0.5 accent-yellow-700"
                  />
                  <div>
                    <p className="text-sm font-semibold text-espresso">{opt.label}</p>
                    <p className="text-xs text-mocha/55">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Portfolio category (always shown) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
              Portfolio Category
            </label>
            <select
              value={portfolioCategory}
              onChange={(e) => setPortfolioCategory(e.target.value)}
              className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
            >
              {PORTFOLIO_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {portfolioCategory === '__custom__' && (
              <input
                type="text"
                value={customPortfolioCategory}
                onChange={(e) => setCustomPortfolioCategory(e.target.value)}
                placeholder="e.g. Ivorian Braids"
                className="mt-2 w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
              />
            )}
          </div>

          {/* Add to existing service: service picker */}
          {destination === 'add-to-service' && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
                Select Service <span className="text-error">*</span>
              </label>
              {servicesQuery.isPending ? (
                <div className="h-10 animate-pulse rounded-lg bg-cream-deep" />
              ) : (
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-cream-border bg-white px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                >
                  <option value="">— Choose a service —</option>
                  {activeServices.map((s: SalonService) => (
                    <option key={s.serviceId} value={s.serviceId}>{s.name}</option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-[0.68rem] text-mocha/50">
                The photo will also be added to your portfolio gallery above.
              </p>
            </div>
          )}

          {/* New service fields */}
          {destination === 'new-service' && (
            <div className="space-y-4 rounded-xl border border-cream-border bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-mocha/50">New Service Details</p>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
                  Service Category <span className="text-error">*</span>
                </label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                  className="w-full rounded-lg border border-cream-border bg-cream px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                >
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
                  Description <span className="text-error">*</span>
                </label>
                <textarea
                  required={destination === 'new-service'}
                  minLength={10}
                  rows={2}
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Describe this service…"
                  className="w-full resize-none rounded-lg border border-cream-border bg-cream px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
                    Price ($) <span className="text-error">*</span>
                  </label>
                  <input
                    required={destination === 'new-service'}
                    type="number"
                    min="1"
                    step="0.01"
                    value={servicePriceStr}
                    onChange={(e) => setServicePriceStr(e.target.value)}
                    placeholder="150.00"
                    className="w-full rounded-lg border border-cream-border bg-cream px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mocha/60">
                    Duration (min) <span className="text-error">*</span>
                  </label>
                  <input
                    required={destination === 'new-service'}
                    type="number"
                    min="15"
                    max="720"
                    value={serviceDurationStr}
                    onChange={(e) => setServiceDurationStr(e.target.value)}
                    placeholder="180"
                    className="w-full rounded-lg border border-cream-border bg-cream px-3.5 py-2.5 text-sm text-espresso focus:outline-none focus:ring-2 focus:ring-gold-dark/40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Featured toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-cream-border bg-white px-4 py-3">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 rounded accent-yellow-700"
            />
            <div>
              <p className="text-sm font-semibold text-espresso">Feature this photo</p>
              <p className="text-xs text-mocha/50">Highlighted in the portfolio section on the homepage</p>
            </div>
          </label>

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
              {isSubmitting ? 'Saving…' : 'Save Photo'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
