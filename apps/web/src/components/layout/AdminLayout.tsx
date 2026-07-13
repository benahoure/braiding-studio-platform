import { motion } from 'framer-motion'
import { CalendarDays, Image, Inbox, LayoutDashboard, LogOut, Scissors, Settings, Sparkles, Star } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import { logoutFromCognito } from '../../lib/auth'
import '../../styles/admin-theme.css'

// Rose Noir admin shell — a cinematic "backstage vanity" look: deep plum
// canvas, glass sidebar with glowing rose nav pills, floating glass dock on
// mobile. Same routes and functionality, entirely different skin from the
// public site (and from any other salon dashboard).

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Appointments', to: '/admin/appointments', icon: CalendarDays },
  { label: 'Messages', to: '/admin/messages', icon: Inbox },
  { label: 'Services', to: '/admin/services', icon: Scissors },
  { label: 'Gallery', to: '/admin/gallery', icon: Image },
  { label: 'Reviews', to: '/admin/reviews', icon: Star },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
]

const SIDEBAR_BG = [
  'radial-gradient(ellipse 90% 30% at 50% -4%, rgba(232,120,159,0.16) 0%, transparent 62%)',
  'radial-gradient(ellipse 70% 26% at 50% 106%, rgba(120,46,92,0.2) 0%, transparent 60%)',
  'linear-gradient(178deg, #1d0c17 0%, #160a11 52%, #1a0b14 100%)',
].join(', ')

const PILL_SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const

export function AdminLayout() {
  const reducedMotion = useReducedMotion()
  const { pathname } = useLocation()

  const handleLogout = () => {
    logoutFromCognito()
  }

  return (
    <div className="admin-theme flex min-h-screen">
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <nav
        aria-label="Admin navigation"
        className="hidden w-[15.5rem] shrink-0 flex-col md:flex"
        style={{
          background: SIDEBAR_BG,
          borderRight: '1px solid rgba(240,170,205,0.12)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Brand */}
        <div className="relative px-5 pb-6 pt-7">
          <div className="flex items-center gap-3.5">
            <span
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(232,120,159,0.3), rgba(120,46,92,0.2))',
                boxShadow: '0 0 24px rgba(232,120,159,0.35), inset 0 1px 0 rgba(255,214,232,0.25)',
              }}
            >
              <img
                src="/brand/Braids-by-deb-logo.png"
                alt=""
                aria-hidden="true"
                className="h-9 w-9 rounded-full object-cover"
              />
            </span>
            <div>
              <p
                className="font-display italic"
                style={{ fontSize: '1.22rem', color: '#fff2f8', lineHeight: 1.05 }}
              >
                Braids by Deb
              </p>
              <p
                className="mt-1 flex items-center gap-1 text-[0.53rem] font-semibold uppercase tracking-[0.26em]"
                style={{ color: '#f5a8c2' }}
              >
                <Sparkles size={9} aria-hidden="true" />
                Admin Studio
              </p>
            </div>
          </div>
          <div
            className="mt-6 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(245,168,194,0.45) 30%, rgba(245,168,194,0.45) 70%, transparent)',
            }}
          />
        </div>

        {/* Nav */}
        <div className="flex-1 px-3.5">
          <p
            className="mb-2.5 px-3 text-[0.55rem] font-semibold uppercase tracking-[0.26em]"
            style={{ color: 'rgba(255,228,240,0.3)' }}
          >
            The Studio
          </p>
          <div className="space-y-1">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
              const isActive = pathname.startsWith(to)
              return (
                <NavLink key={to} to={to} className={`adm-nav-pill ${isActive ? 'active' : ''}`}>
                  {/* Iridescent-ring pill glides between items */}
                  {isActive && (
                    <motion.span
                      layoutId="adm-side-pill"
                      className="absolute inset-0 rounded-full p-px"
                      transition={reducedMotion ? { duration: 0 } : PILL_SPRING}
                      style={{
                        background:
                          'linear-gradient(120deg, #FFD9A0 0%, #F5A8C2 32%, #B389F4 64%, #7FE3E0 100%)',
                        boxShadow: '0 4px 22px rgba(232,120,159,0.3)',
                      }}
                    >
                      <span
                        className="block h-full w-full rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, #2B1424 0%, #211020 100%)',
                          boxShadow: 'inset 0 1px 0 rgba(255,214,232,0.1)',
                        }}
                      />
                    </motion.span>
                  )}
                  <Icon size={15} aria-hidden="true" className="relative" />
                  <span className="relative">{label}</span>
                  {isActive && (
                    <Sparkles
                      size={11}
                      aria-hidden="true"
                      className="relative ml-auto"
                      style={{ color: 'rgba(255,211,228,0.75)' }}
                    />
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-4">
          <div
            className="mb-4 rounded-2xl p-4"
            style={{
              background: 'linear-gradient(150deg, rgba(232,120,159,0.12) 0%, rgba(120,46,92,0.08) 100%)',
              border: '1px solid rgba(240,170,205,0.16)',
            }}
          >
            <p
              className="font-display italic"
              style={{ fontSize: '0.82rem', color: 'rgba(255,228,240,0.78)', lineHeight: 1.55 }}
            >
              &ldquo;Every crown styled here leaves the room glowing.&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="adm-nav-pill w-full"
            style={{ color: 'rgba(255,228,240,0.4)' }}
          >
            <LogOut size={14} aria-hidden="true" />
            Log Out
          </button>
        </div>
      </nav>

      {/* ── Mobile: floating glass dock ─────────────────────────────── */}
      <div
        className="fixed inset-x-3 bottom-3 z-40 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="flex items-center rounded-full px-1.5 py-1.5"
          style={{
            background: 'rgba(24,11,18,0.88)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(240,170,205,0.22)',
            boxShadow:
              '0 14px 44px rgba(0,0,0,0.6), 0 0 30px rgba(232,120,159,0.14), inset 0 1px 0 rgba(255,214,232,0.08)',
          }}
        >
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
            const isActive = pathname.startsWith(to)
            return (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                className="relative flex h-11 items-center justify-center rounded-full transition-colors duration-200"
                style={{
                  // The active item blooms open to fit its label; the rest are
                  // even icon-only dots, so nothing ever truncates.
                  flex: isActive ? '0 0 auto' : '1 1 0',
                  paddingLeft: isActive ? 14 : 0,
                  paddingRight: isActive ? 14 : 0,
                  color: isActive ? '#FFF2F8' : 'rgba(255,228,240,0.5)',
                  minWidth: 34,
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="adm-dock-pill"
                    className="absolute inset-0 rounded-full p-[1.5px]"
                    transition={reducedMotion ? { duration: 0 } : PILL_SPRING}
                    style={{
                      // Holographic rim on a matte pill — the salon jewelry look
                      background:
                        'linear-gradient(120deg, #FFD9A0 0%, #F5A8C2 32%, #B389F4 64%, #7FE3E0 100%)',
                      boxShadow:
                        '0 6px 24px rgba(232,120,159,0.38), 0 0 18px rgba(179,137,244,0.22)',
                    }}
                  >
                    <span
                      className="block h-full w-full rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #2B1424 0%, #1E0F1C 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,214,232,0.12)',
                      }}
                    />
                  </motion.span>
                )}
                <Icon size={17} aria-hidden="true" className="relative shrink-0" />
                {isActive && (
                  <motion.span
                    initial={reducedMotion ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, delay: 0.08 }}
                    className="relative ml-1.5 whitespace-nowrap text-[0.7rem] font-bold"
                  >
                    {label}
                  </motion.span>
                )}
              </NavLink>
            )
          })}
          <span
            aria-hidden="true"
            className="mx-1 h-5 w-px shrink-0"
            style={{ background: 'rgba(240,170,205,0.22)' }}
          />
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 min-w-[34px] flex-1 items-center justify-center rounded-full"
            style={{ color: 'rgba(255,228,240,0.34)' }}
            aria-label="Log out"
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main id="main-content" className="min-w-0 flex-1 pb-28 md:pb-0">
        <Outlet />
      </main>
    </div>
  )
}
