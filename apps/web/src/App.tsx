import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { AdminLayout } from './components/layout/AdminLayout'
import { Layout } from './components/layout/Layout'
import { ScrollToTop } from './components/ScrollToTop'
import { adminIsAuthenticated } from './lib/auth'
import { About } from './pages/About'
import { Book } from './pages/Book'
import { Contact } from './pages/Contact'
import { Gallery } from './pages/Gallery'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { Reviews } from './pages/Reviews'
import { Services } from './pages/Services'
import { AppointmentPortal } from './pages/AppointmentPortal'
import { BookingSuccess } from './pages/BookingSuccess'
import { AdminAppointments } from './pages/admin/AdminAppointments'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminMessages } from './pages/admin/AdminMessages'
import { AdminPortfolio } from './pages/admin/AdminPortfolio'
import { AdminReviews } from './pages/admin/AdminReviews'
import { AdminRoot } from './pages/admin/AdminRoot'
import { AdminServices } from './pages/admin/AdminServices'
import { AdminSettings } from './pages/admin/AdminSettings'

function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!adminIsAuthenticated()) {
    return <Navigate to="/admin" replace state={{ from: location }} />
  }
  return children
}

// Preserves the query string when forwarding legacy /book links to /booking.
function BookRedirect() {
  const location = useLocation()
  return <Navigate to={{ pathname: '/booking', search: location.search }} replace />
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ── Public pages — shared Header + Footer ── */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="booking" element={<Book />} />
          <Route path="book" element={<BookRedirect />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="appointment/:token" element={<AppointmentPortal />} />
          <Route path="booking/success" element={<BookingSuccess />} />

          {/* Standalone pages — home keeps preview sections of each. */}
          <Route path="services" element={<Services />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="portfolio" element={<Navigate to="/gallery" replace />} />
          <Route path="products" element={<Navigate to="/services" replace />} />
          <Route path="appointments" element={<Navigate to="/booking" replace />} />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ── Admin login — standalone, no sidebar ── */}
        <Route path="admin" element={<AdminRoot />} />

        {/* ── Admin pages — no public Header or Footer ── */}
        <Route element={<AdminLayout />}>
          <Route
            path="admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/appointments"
            element={
              <ProtectedAdminRoute>
                <AdminAppointments />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/messages"
            element={
              <ProtectedAdminRoute>
                <AdminMessages />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/services"
            element={
              <ProtectedAdminRoute>
                <AdminServices />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/gallery"
            element={
              <ProtectedAdminRoute>
                <AdminPortfolio />
              </ProtectedAdminRoute>
            }
          />
          <Route path="admin/portfolio" element={<Navigate to="/admin/gallery" replace />} />
          <Route
            path="admin/reviews"
            element={
              <ProtectedAdminRoute>
                <AdminReviews />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="admin/settings"
            element={
              <ProtectedAdminRoute>
                <AdminSettings />
              </ProtectedAdminRoute>
            }
          />
        </Route>
      </Routes>
    </>
  )
}
