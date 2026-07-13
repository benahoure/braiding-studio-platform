import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'

export function useBusinessSettings() {
  return useQuery({
    queryKey: ['business-settings'],
    queryFn: api.getBusinessSettings,
    staleTime: 60 * 1000,
  })
}
