import HeroSection from '@/components/sections/HeroSection'
import ServicesSection from '@/components/sections/ServicesSection'
import GallerySection from '@/components/sections/GallerySection'
import AboutSection from '@/components/sections/AboutSection'
import TestimonialsSection from '@/components/sections/TestimonialsSection'
import ContactSection from '@/components/sections/ContactSection'
import BookingCTA from '@/components/sections/BookingCTA'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <BookingCTA />
      <GallerySection />
      <AboutSection />
      <TestimonialsSection />
      <ContactSection />
    </>
  )
}
