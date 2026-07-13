import { AboutSection } from '../components/home/AboutSection'
import { BookingCTA } from '../components/home/BookingCTA'
import { ContactSection } from '../components/home/ContactSection'
import { GallerySection } from '../components/home/GallerySection'
import { HeroSection } from '../components/home/HeroSection'
import { ServicesSection } from '../components/home/ServicesSection'
import { TestimonialsSection } from '../components/home/TestimonialsSection'
import { PageMeta } from '../components/seo/PageMeta'
import { defaultBusinessSettings } from '../lib/mockData'
import { useBusinessSettings } from '../hooks/useBusinessSettings'

// One-page home — same section order as the original Next.js site
// (braiding-studio-webapp/app/page.tsx): Hero → Services → BookingCTA →
// Gallery → About → Testimonials → Contact.
export function Home() {
  const { data } = useBusinessSettings()
  const settings = data ?? defaultBusinessSettings

  return (
    <>
      <PageMeta
        title="Braids by Deb | Dallas, TX"
        description="Premier natural hair braiding in Dallas. Box braids, knotless braids, cornrows, twists, and more. Protective styles that celebrate your crown. Book online."
        canonical="https://braidsbydeb.com/"
      />
      <HeroSection />
      <ServicesSection />
      <BookingCTA settings={settings} />
      <GallerySection settings={settings} />
      <AboutSection />
      <TestimonialsSection settings={settings} />
      <ContactSection settings={settings} />
    </>
  )
}
