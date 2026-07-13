import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scrolls to top on every route change.
// Hash navigation (#anchor) is left to the browser to handle naturally.
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      window.setTimeout(() => {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)))
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
