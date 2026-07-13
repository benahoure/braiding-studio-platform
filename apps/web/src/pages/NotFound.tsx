import { Link } from 'react-router-dom'

import { PageMeta } from '../components/seo/PageMeta'

export function NotFound() {
  return (
    <>
      <PageMeta
        title="Page Not Found | Braids by Deb"
        description="This Braids by Deb page could not be found."
        canonical="https://braidsbydeb.com/404"
      />
      <section className="section-pad">
        <div className="container-page max-w-2xl">
          <p className="eyebrow">404</p>
          <h1 className="display-heading mt-3 text-6xl font-semibold">Page Not Found</h1>
          <p className="mt-5 leading-8 text-espresso">
            The page you are looking for is not available.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="btn btn-gold" to="/book">
              Book Appointment
            </Link>
            <Link className="btn btn-outline" to="/">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
