import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppErrorBoundary } from '../components/ui/AppErrorBoundary'
import { AdminRoot } from '../pages/admin/AdminRoot'

vi.mock('../lib/auth', () => ({
  adminIsAuthenticated: vi.fn(() => false),
  loginWithPassword: vi.fn(),
  forgotPasswordRequest: vi.fn(async () => ({ success: true as const })),
  confirmPasswordReset: vi.fn(async () => ({ success: true as const })),
  setAdminToken: vi.fn(),
}))

function renderAdminRoot() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRoot />
      </MemoryRouter>
    </HelmetProvider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AdminRoot password reset flow', () => {
  it('shows the success banner at the top of the login card after a reset', async () => {
    const user = userEvent.setup()
    renderAdminRoot()

    // login → forgot
    await user.click(screen.getByRole('button', { name: /forgot your password/i }))
    await user.type(screen.getByPlaceholderText('you@example.com'), 'deb@example.com')
    await user.click(screen.getByRole('button', { name: /send reset code/i }))

    // reset view → enter code + new password
    await screen.findByText(/enter the code sent to deb@example.com/i)
    await user.type(screen.getByPlaceholderText('123456'), '123456')
    await user.type(screen.getByPlaceholderText('••••••••••••'), 'NewPassword123!')
    await user.click(screen.getByRole('button', { name: /set new password/i }))

    // Back on the login view with an unmissable confirmation
    const banner = await screen.findByText('Password reset successfully. You can now sign in.')
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()

    // The banner must come BEFORE the email field in document order,
    // so it cannot hide below the fold on a phone.
    const emailInput = screen.getByPlaceholderText('you@example.com')
    expect(
      banner.compareDocumentPosition(emailInput) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    // Email is pre-filled with the address that was just reset
    expect(emailInput).toHaveValue('deb@example.com')
  })
})

describe('AppErrorBoundary', () => {
  it('renders the branded fallback instead of a blank page when a child crashes', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    function Bomb(): never {
      throw new Error('boom')
    }

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('renders children normally when nothing crashes', () => {
    render(
      <AppErrorBoundary>
        <p>all good</p>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })
})
