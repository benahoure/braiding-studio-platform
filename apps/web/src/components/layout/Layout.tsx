import { Outlet, useLocation } from 'react-router-dom'

import { defaultBusinessSettings } from '../../lib/mockData'
import { LocalBusinessSchema } from '../seo/LocalBusinessSchema'
import { useBusinessSettings } from '../../hooks/useBusinessSettings'
import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  const { data } = useBusinessSettings()
  const settings = data ?? defaultBusinessSettings
  const { pathname } = useLocation()

  return (
    <>
      <a href="#main-content" className="skip-link sr-only">
        Skip to main content
      </a>
      <LocalBusinessSchema settings={settings} />
      <Header settings={settings} />
      {settings.announcementBanner && (
        <div
          className="fixed left-0 right-0 z-40 flex items-center justify-center px-4 py-2 text-center text-xs font-semibold"
          style={{
            top: 'var(--header-height)',
            background: 'linear-gradient(90deg, #b8912a, #D4A843)',
            color: '#1C0F09',
            letterSpacing: '0.03em',
          }}
        >
          {settings.announcementBanner}
        </div>
      )}
      {/* Header is position:fixed — inner pages need padding-top so content
          starts below it. Homepage has no padding; the hero fills from y=0. */}
      <main
        id="main-content"
        style={
          pathname === '/'
            ? settings.announcementBanner ? { paddingTop: '2rem' } : undefined
            : { paddingTop: settings.announcementBanner ? 'calc(var(--header-height) + 2rem)' : 'var(--header-height)' }
        }
      >
        <Outlet />
      </main>
      <Footer settings={settings} />
    </>
  )
}
