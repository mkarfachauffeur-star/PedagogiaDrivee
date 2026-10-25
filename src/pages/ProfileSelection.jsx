import { useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import DemoRequestForm from '../components/marketing/DemoRequestForm'
import LandingHeader from '../components/marketing/landing/LandingHeader'
import {
  LandingComparison,
  LandingFaq,
  LandingFeatures,
  LandingFooter,
  LandingHero,
  LandingPricing,
  LandingReassurance,
  LandingRoles,
} from '../components/marketing/landing/LandingSections'
import PageSeo from '../components/seo/PageSeo'
import { useMarketingTheme } from '../hooks/useMarketingTheme'
import { buildHomeJsonLd, SEO_PAGES } from '../lib/seo'

export default function ProfileSelection() {
  const shouldReduceMotion = useReducedMotion()
  const { theme, isDark } = useMarketingTheme()
  const homeJsonLd = useMemo(() => buildHomeJsonLd(), [])
  const [selectedOfferId, setSelectedOfferId] = useState(null)

  const selectOffer = (offerId) => {
    setSelectedOfferId(offerId)
    window.setTimeout(() => {
      document.getElementById('demonstration')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  useEffect(() => {
    if (window.location.hash !== '#demonstration') return
    const timer = window.setTimeout(() => {
      document.getElementById('demonstration')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="landing-page min-h-screen overflow-x-clip" data-theme={theme}>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-xl focus:bg-[#1769FF] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        href="#main-content"
      >
        Aller au contenu principal
      </a>
      <PageSeo {...SEO_PAGES.home} jsonLd={homeJsonLd} />

      <LandingHeader />

      <main id="main-content">
        <LandingHero shouldReduceMotion={shouldReduceMotion} />
        <LandingFeatures shouldReduceMotion={shouldReduceMotion} />
        <LandingRoles shouldReduceMotion={shouldReduceMotion} />
        <LandingComparison shouldReduceMotion={shouldReduceMotion} />
        <LandingPricing
          onSelectOffer={selectOffer}
          selectedOfferId={selectedOfferId}
          shouldReduceMotion={shouldReduceMotion}
        />
        <LandingReassurance shouldReduceMotion={shouldReduceMotion} />
        <LandingFaq />

        <section className="border-t border-[var(--lp-border)] bg-[var(--lp-section)] px-4 py-20 sm:px-6 lg:px-8 lg:py-28" id="contact">
          <DemoRequestForm
            isDark={isDark}
            onSelectOffer={setSelectedOfferId}
            selectedOfferId={selectedOfferId}
          />
        </section>
      </main>

      <LandingFooter isDark={isDark} />
    </div>
  )
}
