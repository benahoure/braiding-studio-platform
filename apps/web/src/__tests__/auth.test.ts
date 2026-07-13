import { afterEach, describe, expect, it, vi } from 'vitest'

import { adminIsAuthenticated, clearAdminToken, getAdminToken, setAdminToken } from '../lib/auth'

function tokenWithExpiry(exp: number): string {
  const payload = window.btoa(JSON.stringify({ exp })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `header.${payload}.signature`
}

describe('admin auth token storage', () => {
  afterEach(() => {
    vi.useRealTimers()
    clearAdminToken()
  })

  it('stores admin tokens in sessionStorage and verifies expiry', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'))
    setAdminToken(tokenWithExpiry(Math.floor(Date.now() / 1000) + 60))

    expect(window.sessionStorage.getItem('braids-by-deb-admin-token')).toBeTruthy()
    expect(getAdminToken()).toBeTruthy()
    expect(adminIsAuthenticated()).toBe(true)
  })

  it('clears expired or invalid tokens', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'))
    setAdminToken(tokenWithExpiry(Math.floor(Date.now() / 1000) - 60))
    expect(adminIsAuthenticated()).toBe(false)

    setAdminToken('not-a-jwt')
    expect(adminIsAuthenticated()).toBe(false)
    expect(getAdminToken()).toBeNull()
  })
})
