import type { SalonService } from '../types'

// Service image fallback strategy:
//   1. service.imageUrl (admin-uploaded CDN URL or seeded path) wins.
//   2. Otherwise the subcategory's default image.
//   3. Otherwise the global fallback image.
// The styled gradient placeholder in ServiceCard remains the last-ditch
// visual if even these images fail to load in the browser.

export const SUBCATEGORY_DEFAULT_IMAGE: Record<string, string> = {
  'box-braids': '/images/medium-box-braids.jpg',
  'knotless-braids': '/images/medium-knotless-braids.jpg',
  'boho-braids': '/images/medium-boho-braids.jpg',
  'twist-braids': '/images/twist-braids.jpg',
  cornrows: '/images/straight-back-cornrows.jpg',
  'fulani-braids': '/images/fulani-braids.jpg',
  // Kids & Toddlers
  'kids-braids': '/images/kids-cornrows.jpg',
  'toddler-styles': '/images/kids-braided-ponytails.jpg',
}

export const GLOBAL_FALLBACK_IMAGE = '/images/goddess-cornrows.jpg'

export function resolveServiceImage(
  service: Pick<SalonService, 'imageUrl' | 'subcategory'>,
): string {
  if (service.imageUrl) return service.imageUrl
  if (service.subcategory && SUBCATEGORY_DEFAULT_IMAGE[service.subcategory]) {
    return SUBCATEGORY_DEFAULT_IMAGE[service.subcategory]
  }
  return GLOBAL_FALLBACK_IMAGE
}

export function resolveServiceImageAlt(
  service: Pick<SalonService, 'imageAlt' | 'name'>,
): string {
  return service.imageAlt?.trim() || service.name
}
