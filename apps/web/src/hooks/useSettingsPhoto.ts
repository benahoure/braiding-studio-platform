import { useBusinessSettings } from './useBusinessSettings'
import type { BusinessSettings } from '../types'

/**
 * Admin-editable photo with a bundled fallback, without the stale flash:
 * returns null while settings load (render nothing), the admin-uploaded URL
 * once loaded, or the fallback when none was uploaded / the fetch failed.
 */
export function useSettingsPhoto(
  select: (settings: BusinessSettings) => string | null | undefined,
  fallback: string,
): string | null {
  const { data: settings, isPending } = useBusinessSettings()
  if (isPending) return null
  return (settings ? select(settings) : null) || fallback
}
