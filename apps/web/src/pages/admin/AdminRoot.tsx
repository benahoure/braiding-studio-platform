import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { PageMeta } from '../../components/seo/PageMeta'
import {
  adminIsAuthenticated,
  confirmPasswordReset,
  forgotPasswordRequest,
  loginWithPassword,
  setAdminToken,
} from '../../lib/auth'

function RibbonAccents() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#F5A8C2" stopOpacity="0"    />
          <stop offset="22%"  stopColor="#F5A8C2" stopOpacity="0.50" />
          <stop offset="74%"  stopColor="#F5A8C2" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#F5A8C2" stopOpacity="0"    />
        </linearGradient>
        <linearGradient id="rg2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#B34A75" stopOpacity="0"    />
          <stop offset="30%"  stopColor="#B34A75" stopOpacity="0.38" />
          <stop offset="78%"  stopColor="#B34A75" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#B34A75" stopOpacity="0"    />
        </linearGradient>
        <linearGradient id="rg3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#E8789F" stopOpacity="0"    />
          <stop offset="36%"  stopColor="#E8789F" stopOpacity="0.30" />
          <stop offset="66%"  stopColor="#E8789F" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#E8789F" stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Upper cluster */}
      <path d="M -180  92 C 280  54 640 126 1080  84 S 1440  48 1700  92"  stroke="url(#rg)"  strokeWidth="1.0" fill="none" opacity="0.44" />
      <path d="M -200 116 C 260  78 620 150 1060 108 S 1420  72 1680 116"  stroke="url(#rg3)" strokeWidth="0.7" fill="none" opacity="0.30" />
      <path d="M -120  70 C 340  34 700 104 1140  62 S 1500  26 1760  70"  stroke="url(#rg2)" strokeWidth="0.6" fill="none" opacity="0.20" />

      {/* Upper-mid cluster — skims above the card */}
      <path d="M -240 238 C 220 196 580 268 1020 226 S 1380 190 1660 234"  stroke="url(#rg)"  strokeWidth="1.2" fill="none" opacity="0.48" />
      <path d="M -160 262 C 300 218 660 290 1100 248 S 1460 212 1740 256"  stroke="url(#rg3)" strokeWidth="0.8" fill="none" opacity="0.32" />
      <path d="M -300 214 C 160 174 520 244  960 202 S 1320 166 1600 210"  stroke="url(#rg2)" strokeWidth="0.6" fill="none" opacity="0.18" />

      {/* Lower-mid cluster — below the card */}
      <path d="M -180 578 C 280 536 640 608 1080 566 S 1440 530 1720 574"  stroke="url(#rg)"  strokeWidth="1.0" fill="none" opacity="0.34" />
      <path d="M -260 556 C 200 516 560 586 1000 544 S 1360 508 1640 552"  stroke="url(#rg2)" strokeWidth="0.7" fill="none" opacity="0.22" />

      {/* Low accent */}
      <path d="M  -80 700 C 380 658 740 730 1180 688 S 1540 652 1820 696"  stroke="url(#rg3)" strokeWidth="0.7" fill="none" opacity="0.18" />
    </svg>
  )
}

type View = 'login' | 'forgot' | 'reset'

export function AdminRoot() {
  const navigate = useNavigate()
  const [view, setView]           = useState<View>('login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [failCount, setFailCount] = useState(0)
  const [locked, setLocked]       = useState(false)
  const [emailFocused, setEmailFocused]       = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  // forgot / reset flow
  const [forgotEmail, setForgotEmail]       = useState('')
  const [resetCode, setResetCode]           = useState('')
  const [newPassword, setNewPassword]       = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [forgotEmailFocused, setForgotEmailFocused] = useState(false)
  const [resetCodeFocused, setResetCodeFocused]     = useState(false)
  const [newPasswordFocused, setNewPasswordFocused] = useState(false)

  if (adminIsAuthenticated()) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await loginWithPassword(email.trim(), password)
    if (result.success) {
      setAdminToken(result.token)
      navigate('/admin/dashboard', { replace: true })
    } else {
      const isLocked =
        result.error.toLowerCase().includes('too many') ||
        result.error.toLowerCase().includes('locked') ||
        result.error.toLowerCase().includes('limit')
      if (isLocked) {
        setLocked(true)
        setError(null)
      } else {
        const next = failCount + 1
        setFailCount(next)
        setError(result.error)
      }
      setLoading(false)
    }
  }

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await forgotPasswordRequest(forgotEmail.trim())
    setLoading(false)
    if (result.success) {
      setView('reset')
    } else {
      setError(result.error)
    }
  }

  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await confirmPasswordReset(forgotEmail.trim(), resetCode.trim(), newPassword)
    setLoading(false)
    if (result.success) {
      setSuccess('Password reset successfully. You can now sign in.')
      setView('login')
      setEmail(forgotEmail)
      setForgotEmail('')
      setResetCode('')
      setNewPassword('')
    } else {
      setError(result.error)
    }
  }

  const goToForgot = () => {
    setError(null)
    setSuccess(null)
    setForgotEmail(email)
    setFailCount(0)
    setLocked(false)
    setView('forgot')
  }

  const goToLogin = () => {
    setError(null)
    setSuccess(null)
    setView('login')
  }

  const inputBase: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(232,120,159,0.30)',
    color: 'rgba(255,240,247,0.94)',
    borderRadius: '10px',
    width: '100%',
    padding: '14px 14px 14px 44px',
    fontSize: '0.925rem',
    outline: 'none',
    transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
  }

  const inputFocused: React.CSSProperties = {
    ...inputBase,
    background: 'rgba(255,255,255,0.09)',
    border: '1px solid rgba(232,120,159,0.68)',
    boxShadow: '0 0 0 3px rgba(232,120,159,0.12), inset 0 1px 0 rgba(255,211,228,0.04)',
  }

  const iconCol = (focused: boolean) =>
    focused ? 'rgba(245,168,194,0.92)' : 'rgba(255,240,247,0.36)'

  return (
    <>
      <PageMeta
        title="Admin Sign In | Braids by Deb"
        description="Admin sign in for Braids by Deb."
        canonical="https://braidsbydeb.com/admin"
      />

      {/* ── Page shell ── */}
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10"
        style={{ background: 'linear-gradient(160deg, #120911 0%, #170B12 38%, #1D0E16 65%, #140A10 100%)' }}
      >
        <RibbonAccents />

        {/* Ambient warmth — narrow 52% ellipse, rose-copper, no full-page wash */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: [
              'radial-gradient(ellipse 52% 56% at 50% 45%,',
              '  rgba(232,120,159,0.17) 0%,',
              '  rgba(179,74,117,0.08) 40%,',
              '  rgba(179,74,117,0.02) 62%,',
              '  transparent 76%)',
            ].join(' '),
          }}
        />

        {/* Card-vicinity — extra soft warmth right behind the card */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 30% 34% at 50% 46%, rgba(232,120,159,0.07) 0%, transparent 62%)',
          }}
        />

        {/* Vignette — pushes corners to near-black */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 62% 62% at 50% 48%, transparent 22%, rgba(0,0,0,0.80) 100%)',
          }}
        />

        {/* ── Content column ── */}
        <div className="relative z-10 flex w-full max-w-[600px] flex-col items-center">

          {/* Brand area */}
          <div className="mb-5 flex flex-col items-center gap-3">
            <img
              src="/brand/Braids-by-deb-logo.png"
              alt="Braids by Deb"
              style={{
                height: '96px',
                width: 'auto',
                objectFit: 'contain',
                filter: [
                  'drop-shadow(0 6px 28px rgba(245,168,194,0.42))',
                  'drop-shadow(0 1px 8px rgba(0,0,0,0.64))',
                ].join(' '),
              }}
            />
            <div className="flex flex-col items-center gap-1.5 text-center">
              <p
                className="font-display text-[0.82rem] font-bold uppercase"
                style={{ color: '#F5A8C2', letterSpacing: '0.28em' }}
              >
                Braids by Deb
              </p>
              {/* "— ADMIN PORTAL —" with side rules */}
              <div className="flex items-center gap-2.5">
                <div style={{ width: '22px', height: '1px', background: 'rgba(232,120,159,0.52)' }} />
                <p
                  className="text-[0.60rem] font-semibold uppercase"
                  style={{ color: 'rgba(255,240,247,0.40)', letterSpacing: '0.21em' }}
                >
                  Admin Portal
                </p>
                <div style={{ width: '22px', height: '1px', background: 'rgba(232,120,159,0.52)' }} />
              </div>
            </div>
          </div>

          {/* ── Glass card ── */}
          <div
            className="w-full rounded-3xl"
            style={{
              background: 'linear-gradient(160deg, rgba(17,17,17,0.86) 0%, rgba(13,13,13,0.93) 100%)',
              backdropFilter: 'blur(44px)',
              WebkitBackdropFilter: 'blur(44px)',
              border: '1px solid rgba(232,120,159,0.46)',
              boxShadow: [
                '0 -18px 52px rgba(216,86,140,0.20)',    // glow bleeding upward from card top
                '0 52px 120px rgba(0,0,0,0.84)',         // deep drop shadow
                '0 0 0 1px rgba(200,80,130,0.18)',        // faint outer ring
                'inset 0 2px 0 rgba(255,211,228,0.88)',   // hot inner top rim
                'inset 0 -1px 0 rgba(0,0,0,0.38)',       // inner bottom shadow
                'inset 1px 0 0 rgba(232,120,159,0.08)',    // side rims
                'inset -1px 0 0 rgba(232,120,159,0.08)',
              ].join(', '),
            }}
          >
            {/* Top shimmer bar — the "hot line" at the card edge */}
            <div
              style={{
                height: '2px',
                borderRadius: '24px 24px 0 0',
                background: [
                  'linear-gradient(90deg,',
                  '  transparent 5%,',
                  '  rgba(245,168,194,0.62) 34%,',
                  '  rgba(255,211,228,0.92) 50%,',
                  '  rgba(245,168,194,0.62) 66%,',
                  '  transparent 95%)',
                ].join(' '),
              }}
            />

            {/* Inner top warmth fade */}
            <div
              style={{
                height: '54px',
                pointerEvents: 'none',
                background: 'linear-gradient(180deg, rgba(232,120,159,0.05) 0%, transparent 100%)',
              }}
            />

            <div className="px-10 pb-11 pt-0 sm:px-12 sm:pb-12">

              {/* Heading */}
              <div className="mb-8">
                <h1
                  className="font-display text-[2.8rem] font-light leading-tight"
                  style={{ color: 'rgba(255,244,250,0.97)' }}
                >
                  {view === 'login' ? 'Welcome back' : view === 'forgot' ? 'Reset password' : 'New password'}
                </h1>
                <div
                  className="my-3 h-px"
                  style={{
                    width: '46px',
                    background: 'linear-gradient(90deg, rgba(232,120,159,0.82), rgba(232,120,159,0.22), transparent)',
                  }}
                />
                <p className="text-[0.875rem] leading-relaxed" style={{ color: 'rgba(255,240,247,0.52)' }}>
                  {view === 'login' && 'Sign in to manage Braids by Deb.'}
                  {view === 'forgot' && "Enter your email and we'll send you a reset code."}
                  {view === 'reset' && `Enter the code sent to ${forgotEmail} and choose a new password.`}
                </p>
              </div>

              {/* Success — pinned above the form so it can't hide below the
                  fold on mobile after a password reset. */}
              {success && view === 'login' && (
                <div className="mb-6 flex items-start gap-3 rounded-xl p-4" style={{ background: 'rgba(20,80,40,0.22)', border: '1px solid rgba(50,160,80,0.30)' }}>
                  <CheckCircle size={15} className="mt-0.5 shrink-0" style={{ color: '#4ade80' }} />
                  <p className="text-sm leading-snug" style={{ color: '#86efac' }}>{success}</p>
                </div>
              )}

              {/* ── LOGIN VIEW ── */}
              {view === 'login' && (
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[0.68rem] font-semibold uppercase" style={{ color: 'rgba(255,240,247,0.58)', letterSpacing: '0.14em' }}>
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={15} aria-hidden="true" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: iconCol(emailFocused), transition: 'color 0.18s', pointerEvents: 'none' }} />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={loading} style={emailFocused ? inputFocused : inputBase} onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)} />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-[0.68rem] font-semibold uppercase" style={{ color: 'rgba(255,240,247,0.58)', letterSpacing: '0.14em' }}>
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={15} aria-hidden="true" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: iconCol(passwordFocused), transition: 'color 0.18s', pointerEvents: 'none' }} />
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" autoComplete="current-password" required disabled={loading} style={passwordFocused ? { ...inputFocused, paddingRight: '46px' } : { ...inputBase, paddingRight: '46px' }} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70" style={{ color: 'rgba(255,240,247,0.44)' }} tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Locked state */}
                  {locked && (
                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(140,28,28,0.22)', border: '1px solid rgba(200,55,55,0.36)' }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: '#f87171' }} />
                        <p className="text-sm leading-snug" style={{ color: '#fca5a5' }}>
                          Your account has been temporarily locked after too many failed attempts.
                        </p>
                      </div>
                      <button type="button" onClick={goToForgot} className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[0.82rem] font-semibold transition-opacity hover:opacity-80"
                        style={{ background: 'rgba(220,80,80,0.18)', border: '1px solid rgba(220,80,80,0.32)', color: '#fca5a5' }}>
                        Reset your password to unlock
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* Progressive error with hints */}
                  {!locked && error && (
                    <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(140,28,28,0.18)', border: '1px solid rgba(200,55,55,0.30)' }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: '#f87171' }} />
                        <p className="text-sm leading-snug" style={{ color: '#fca5a5' }}>{error}</p>
                      </div>
                      {failCount >= 2 && (
                        <button type="button" onClick={goToForgot}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[0.78rem] font-medium transition-opacity hover:opacity-80"
                          style={{ background: 'rgba(200,55,55,0.12)', border: '1px solid rgba(200,55,55,0.22)', color: '#fca5a5' }}>
                          {failCount >= 3 ? 'Having trouble? Reset your password →' : 'Forgot your password?'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Submit */}
                  {!locked && (
                    <div className="pt-2">
                      <button type="submit" disabled={loading || !email || !password} className="group flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[0.875rem] font-semibold transition-all duration-200 disabled:opacity-40"
                        style={{
                          background: loading || !email || !password ? 'linear-gradient(135deg, #E8789F 0%, #B34A75 100%)' : 'linear-gradient(135deg, #FFD3E4 0%, #F5A8C2 50%, #B34A75 100%)',
                          color: '#170B12', letterSpacing: '0.05em',
                          boxShadow: loading || !email || !password ? 'none' : ['0 8px 32px rgba(232,120,159,0.44)', '0 2px 8px rgba(0,0,0,0.34)', 'inset 0 1.5px 0 rgba(255,228,168,0.40)'].join(', '),
                        }}
                      >
                        {loading ? 'Signing in…' : <><span>Sign in</span><ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" /></>}
                      </button>
                    </div>
                  )}

                  {/* Quiet forgot link — always visible when not locked */}
                  {!locked && (
                    <div className="text-center pt-1">
                      <button type="button" onClick={goToForgot} className="text-[0.78rem] transition-opacity hover:opacity-80" style={{ color: 'rgba(245,168,194,0.72)' }}>
                        Forgot your password?
                      </button>
                    </div>
                  )}

                </form>
              )}

              {/* ── FORGOT VIEW ── */}
              {view === 'forgot' && (
                <form onSubmit={handleForgotRequest} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[0.68rem] font-semibold uppercase" style={{ color: 'rgba(255,240,247,0.58)', letterSpacing: '0.14em' }}>
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={15} aria-hidden="true" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: iconCol(forgotEmailFocused), transition: 'color 0.18s', pointerEvents: 'none' }} />
                      <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required disabled={loading} style={forgotEmailFocused ? inputFocused : inputBase} onFocus={() => setForgotEmailFocused(true)} onBlur={() => setForgotEmailFocused(false)} />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'rgba(140,28,28,0.18)', border: '1px solid rgba(200,55,55,0.30)' }}>
                      <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: '#f87171' }} />
                      <p className="text-sm leading-snug" style={{ color: '#fca5a5' }}>{error}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button type="submit" disabled={loading || !forgotEmail} className="group flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[0.875rem] font-semibold transition-all duration-200 disabled:opacity-40"
                      style={{
                        background: loading || !forgotEmail ? 'linear-gradient(135deg, #E8789F 0%, #B34A75 100%)' : 'linear-gradient(135deg, #FFD3E4 0%, #F5A8C2 50%, #B34A75 100%)',
                        color: '#170B12', letterSpacing: '0.05em',
                        boxShadow: loading || !forgotEmail ? 'none' : ['0 8px 32px rgba(232,120,159,0.44)', '0 2px 8px rgba(0,0,0,0.34)', 'inset 0 1.5px 0 rgba(255,228,168,0.40)'].join(', '),
                      }}
                    >
                      {loading ? 'Sending…' : <><span>Send reset code</span><ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" /></>}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button type="button" onClick={goToLogin} className="flex items-center gap-1.5 mx-auto text-[0.78rem] transition-opacity hover:opacity-80" style={{ color: 'rgba(245,168,194,0.72)' }}>
                      <ArrowLeft size={12} />
                      Back to sign in
                    </button>
                  </div>
                </form>
              )}

              {/* ── RESET VIEW ── */}
              {view === 'reset' && (
                <form onSubmit={handleResetConfirm} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[0.68rem] font-semibold uppercase" style={{ color: 'rgba(255,240,247,0.58)', letterSpacing: '0.14em' }}>
                      Reset code
                    </label>
                    <div className="relative">
                      <input type="text" value={resetCode} onChange={e => setResetCode(e.target.value)} placeholder="123456" autoComplete="one-time-code" inputMode="numeric" required disabled={loading} style={resetCodeFocused ? { ...inputFocused, paddingLeft: '14px' } : { ...inputBase, paddingLeft: '14px' }} onFocus={() => setResetCodeFocused(true)} onBlur={() => setResetCodeFocused(false)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.68rem] font-semibold uppercase" style={{ color: 'rgba(255,240,247,0.58)', letterSpacing: '0.14em' }}>
                      New password
                    </label>
                    <div className="relative">
                      <Lock size={15} aria-hidden="true" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: iconCol(newPasswordFocused), transition: 'color 0.18s', pointerEvents: 'none' }} />
                      <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••••••" autoComplete="new-password" required disabled={loading} style={newPasswordFocused ? { ...inputFocused, paddingRight: '46px' } : { ...inputBase, paddingRight: '46px' }} onFocus={() => setNewPasswordFocused(true)} onBlur={() => setNewPasswordFocused(false)} />
                      <button type="button" onClick={() => setShowNewPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70" style={{ color: 'rgba(255,240,247,0.44)' }} tabIndex={-1} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[0.72rem] leading-relaxed" style={{ color: 'rgba(255,240,247,0.32)' }}>
                      Min. 12 characters · uppercase · lowercase · number · symbol (e.g. !@#$)
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'rgba(140,28,28,0.18)', border: '1px solid rgba(200,55,55,0.30)' }}>
                      <AlertCircle size={15} className="mt-0.5 shrink-0" style={{ color: '#f87171' }} />
                      <p className="text-sm leading-snug" style={{ color: '#fca5a5' }}>{error}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button type="submit" disabled={loading || !resetCode || !newPassword} className="group flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[0.875rem] font-semibold transition-all duration-200 disabled:opacity-40"
                      style={{
                        background: loading || !resetCode || !newPassword ? 'linear-gradient(135deg, #E8789F 0%, #B34A75 100%)' : 'linear-gradient(135deg, #FFD3E4 0%, #F5A8C2 50%, #B34A75 100%)',
                        color: '#170B12', letterSpacing: '0.05em',
                        boxShadow: loading || !resetCode || !newPassword ? 'none' : ['0 8px 32px rgba(232,120,159,0.44)', '0 2px 8px rgba(0,0,0,0.34)', 'inset 0 1.5px 0 rgba(255,228,168,0.40)'].join(', '),
                      }}
                    >
                      {loading ? 'Resetting…' : <><span>Set new password</span><ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" /></>}
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button type="button" onClick={() => { setError(null); setView('forgot') }} className="flex items-center gap-1.5 mx-auto text-[0.78rem] transition-opacity hover:opacity-80" style={{ color: 'rgba(245,168,194,0.72)' }}>
                      <ArrowLeft size={12} />
                      Resend code
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>

          {/* Footer note */}
          <p
            className="mt-5 flex items-center gap-1.5 text-[0.60rem] font-semibold uppercase"
            style={{ color: 'rgba(255,240,247,0.40)', letterSpacing: '0.13em' }}
          >
            <Lock size={9} aria-hidden="true" />
            Secure admin access
          </p>

        </div>
      </div>
    </>
  )
}
