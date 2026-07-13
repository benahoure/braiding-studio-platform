import { describe, expect, it } from 'vitest'

import {
  GLOBAL_FALLBACK_IMAGE,
  SUBCATEGORY_DEFAULT_IMAGE,
  resolveServiceImage,
  resolveServiceImageAlt,
} from '../lib/serviceImages'
import { SERVICE_CATEGORIES } from '../lib/serviceCategories'
import { mockServices } from '../lib/mockData'

describe('service image resolver', () => {
  it('prefers the service imageUrl when present (admin upload override)', () => {
    expect(
      resolveServiceImage({ imageUrl: 'https://cdn.braidsbydeb.com/services/custom.jpg', subcategory: 'box-braids' }),
    ).toBe('https://cdn.braidsbydeb.com/services/custom.jpg')
  })

  it('falls back to the subcategory default when imageUrl is empty', () => {
    expect(resolveServiceImage({ imageUrl: '', subcategory: 'box-braids' })).toBe(
      SUBCATEGORY_DEFAULT_IMAGE['box-braids'],
    )
    expect(resolveServiceImage({ imageUrl: '', subcategory: 'fulani-braids' })).toBe(
      SUBCATEGORY_DEFAULT_IMAGE['fulani-braids'],
    )
  })

  it('falls back to the global image when there is no subcategory default', () => {
    expect(resolveServiceImage({ imageUrl: '', subcategory: undefined })).toBe(GLOBAL_FALLBACK_IMAGE)
    expect(resolveServiceImage({ imageUrl: '', subcategory: 'ponytails' })).toBe(GLOBAL_FALLBACK_IMAGE)
  })

  it('provides a default image for every braids style family', () => {
    const braids = SERVICE_CATEGORIES.find((c) => c.value === 'braids-protective-styles')
    expect(braids).toBeDefined()
    for (const sub of braids!.subcategories) {
      expect(SUBCATEGORY_DEFAULT_IMAGE[sub.value], `missing default for ${sub.value}`).toBeTruthy()
    }
  })

  it('uses imageAlt when present and falls back to the service name', () => {
    expect(resolveServiceImageAlt({ imageAlt: 'Waist-length knotless braids', name: 'X' })).toBe(
      'Waist-length knotless braids',
    )
    expect(resolveServiceImageAlt({ imageAlt: '  ', name: 'Small Box Braids' })).toBe('Small Box Braids')
    expect(resolveServiceImageAlt({ name: 'Cornrows' })).toBe('Cornrows')
  })

  it('keeps every mock service resolvable to a real image path', () => {
    for (const service of mockServices) {
      const src = resolveServiceImage(service)
      expect(src, `${service.serviceId} resolved to nothing`).toBeTruthy()
    }
  })
})
