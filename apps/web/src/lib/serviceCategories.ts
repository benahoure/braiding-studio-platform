export interface SubcategoryDef {
  value: string
  label: string
}

export interface ServiceCategoryDef {
  value: string
  label: string
  description: string
  subcategories: SubcategoryDef[]
  sortOrder: number
  showInFilters: boolean
}

// Braids by Deb service taxonomy — four main categories with style families
// as subcategories. Mirrors lambdas/scripts/seed_data.py.
export const SERVICE_CATEGORIES: ServiceCategoryDef[] = [
  {
    value: 'braids-protective-styles',
    label: 'Braids & Protective Styles',
    description: 'Box braids, knotless braids, boho braids, twists, cornrows, and Fulani styles.',
    subcategories: [
      { value: 'box-braids', label: 'Box Braids' },
      { value: 'knotless-braids', label: 'Knotless Braids' },
      { value: 'boho-braids', label: 'Boho Braids' },
      { value: 'twist-braids', label: 'Twist Braids' },
      { value: 'cornrows', label: 'Cornrows' },
      { value: 'fulani-braids', label: 'Fulani Braids' },
    ],
    sortOrder: 1,
    showInFilters: true,
  },
  {
    value: 'natural-ponytails',
    label: 'Natural Hair & Ponytails',
    description: 'Natural hair styling and sleek ponytail services.',
    subcategories: [
      { value: 'natural-styling', label: 'Natural Styling' },
      { value: 'ponytails', label: 'Ponytails' },
    ],
    sortOrder: 2,
    showInFilters: true,
  },
  {
    value: 'sew-in-wigs',
    label: 'Sew-In, Wigs & Crochet',
    description: 'Sew-in installs, wig foundations, and crochet styles.',
    subcategories: [
      { value: 'sew-in', label: 'Sew-In' },
      { value: 'wig-cornrows', label: 'Wig Cornrows' },
      { value: 'crochet', label: 'Crochet' },
    ],
    sortOrder: 3,
    showInFilters: true,
  },
  {
    value: 'kids',
    label: 'Kids & Toddlers',
    description: 'Gentle braids and styles for kids and toddlers.',
    subcategories: [
      { value: 'kids-braids', label: 'Kids Braids' },
      { value: 'toddler-styles', label: 'Toddler Styles' },
    ],
    sortOrder: 4,
    showInFilters: true,
  },
]

// Flat set of all valid filter values (top-level category IDs + subcategory IDs).
// Used by service filtering and the mock API to validate ?category= param.
export const ALL_FILTER_VALUES: ReadonlySet<string> = new Set([
  'all',
  ...SERVICE_CATEGORIES.map((c) => c.value),
  ...SERVICE_CATEGORIES.flatMap((c) => c.subcategories.map((s) => s.value)),
])

// Look up a customer-facing label for any category or subcategory value.
export function getCategoryLabel(value: string): string {
  const top = SERVICE_CATEGORIES.find((c) => c.value === value)
  if (top) return top.label
  for (const cat of SERVICE_CATEGORIES) {
    const sub = cat.subcategories.find((s) => s.value === value)
    if (sub) return sub.label
  }
  return value
}
