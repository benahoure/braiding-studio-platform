import { safeSessionStorage } from './safeStorage'

const tokenKey = 'braids-by-deb-admin-token'
const codeVerifierKey = 'braids-by-deb-pkce-verifier'

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = base64urlEncode(array.buffer)
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier))
  const challenge = base64urlEncode(digest)
  return { verifier, challenge }
}

// safeSessionStorage falls back to in-memory storage when privacy modes block
// storage access — so login still works for the session (the token would
// otherwise vanish between setAdminToken and the ProtectedAdminRoute check,
// silently bouncing a successful login back to the sign-in form).
export function getAdminToken(): string | null {
  return safeSessionStorage.getItem(tokenKey)
}

export function setAdminToken(token: string): void {
  safeSessionStorage.setItem(tokenKey, token)
}

export function clearAdminToken(): void {
  safeSessionStorage.removeItem(tokenKey)
  safeSessionStorage.removeItem(codeVerifierKey)
}

export function adminIsAuthenticated(): boolean {
  const token = getAdminToken()
  if (!token) return false

  try {
    const [, payload] = token.split('.')
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    )
    const decoded = JSON.parse(window.atob(paddedPayload))
    if (typeof decoded.exp !== 'number') return false
    return decoded.exp * 1000 > Date.now()
  } catch {
    clearAdminToken()
    return false
  }
}

type LoginResult = { success: true; token: string } | { success: false; error: string }

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
  if (!clientId || !poolId) return { success: false, error: 'Auth is not configured.' }

  const region = poolId.split('_')[0]

  try {
    const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      const code: string = data.__type ?? ''
      if (code === 'NotAuthorizedException' || code === 'UserNotFoundException') {
        return { success: false, error: 'Incorrect email or password.' }
      }
      if (code === 'TooManyRequestsException' || code === 'LimitExceededException') {
        return { success: false, error: 'Too many attempts. Please wait a moment and try again.' }
      }
      if (code === 'UserNotConfirmedException') {
        return { success: false, error: 'Account not confirmed. Contact your administrator.' }
      }
      if (code === 'PasswordResetRequiredException') {
        return { success: false, error: 'Password reset required. Use "Forgot your password?" on the sign-in page.' }
      }
      return { success: false, error: 'Sign in failed. Please try again.' }
    }

    const token: string | undefined =
      data.AuthenticationResult?.IdToken ?? data.AuthenticationResult?.AccessToken
    if (!token) return { success: false, error: 'Sign in failed. Please try again.' }

    return { success: true, token }
  } catch {
    return { success: false, error: 'Connection error. Check your internet and try again.' }
  }
}

export async function forgotPasswordRequest(email: string): Promise<{ success: true } | { success: false; error: string }> {
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
  if (!clientId || !poolId) return { success: false, error: 'Auth is not configured.' }
  const region = poolId.split('_')[0]
  try {
    const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.ForgotPassword',
      },
      body: JSON.stringify({ ClientId: clientId, Username: email }),
    })
    if (!response.ok) {
      const data = await response.json()
      const code: string = data.__type ?? ''
      if (code === 'UserNotFoundException') return { success: false, error: 'No account found with that email.' }
      if (code === 'LimitExceededException') return { success: false, error: 'Too many attempts. Please wait and try again.' }
      if (code === 'InvalidParameterException') return { success: false, error: 'This account is not yet set up for password reset. Contact your administrator.' }
      return { success: false, error: 'Could not send reset code. Try again.' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Connection error. Check your internet and try again.' }
  }
}

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
  if (!clientId || !poolId) return { success: false, error: 'Auth is not configured.' }
  const region = poolId.split('_')[0]
  try {
    const response = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
      },
      body: JSON.stringify({ ClientId: clientId, Username: email, ConfirmationCode: code, Password: newPassword }),
    })
    if (!response.ok) {
      const data = await response.json()
      const code2: string = data.__type ?? ''
      if (code2 === 'CodeMismatchException') return { success: false, error: 'Incorrect code. Check your email and try again.' }
      if (code2 === 'ExpiredCodeException') return { success: false, error: 'Code expired. Request a new one.' }
      if (code2 === 'InvalidPasswordException') return { success: false, error: data.message ?? 'Password does not meet requirements.' }
      return { success: false, error: 'Could not reset password. Try again.' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Connection error. Check your internet and try again.' }
  }
}

export function logoutFromCognito(): void {
  clearAdminToken()
  const domain = import.meta.env.VITE_COGNITO_DOMAIN
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  if (!domain || !clientId) return
  const logoutUri = encodeURIComponent(`${window.location.origin}/admin`)
  window.location.assign(`https://${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`)
}

export async function redirectToCognito(): Promise<void> {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  if (!domain || !clientId) return

  const { verifier, challenge } = await generatePKCE()
  safeSessionStorage.setItem(codeVerifierKey, verifier)

  const redirectUri = encodeURIComponent(`${window.location.origin}/admin`)
  const url = `https://${domain}/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid%20profile%20email&code_challenge=${challenge}&code_challenge_method=S256`
  window.location.assign(url)
}

export async function exchangeCodeForToken(code: string): Promise<string | null> {
  const domain = import.meta.env.VITE_COGNITO_DOMAIN
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  const verifier = safeSessionStorage.getItem(codeVerifierKey)
  if (!domain || !clientId || !verifier) return null

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: `${window.location.origin}/admin`,
    code_verifier: verifier,
  })

  try {
    const response = await fetch(`https://${domain}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!response.ok) return null
    const data = await response.json()
    safeSessionStorage.removeItem(codeVerifierKey)
    return (data.id_token ?? data.access_token) || null
  } catch {
    return null
  }
}
