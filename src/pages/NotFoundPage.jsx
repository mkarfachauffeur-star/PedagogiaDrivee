import { Link, useLocation } from 'react-router-dom'
import LandingHeader from '../components/marketing/landing/LandingHeader'
import { LandingFooter } from '../components/marketing/landing/LandingSections'
import PageSeo from '../components/seo/PageSeo'
import { useMarketingTheme } from '../hooks/useMarketingTheme'

export default function NotFoundPage() {
  const { pathname } = useLocation()
  const { theme } = useMarketingTheme()

  return (
    <div className="landing-page flex min-h-screen flex-col overflow-x-clip" data-theme={theme}>
      <PageSeo
        description="Cette adresse ne correspond à aucune page de Pedagogia Drive."
        noindex
        path={pathname}
        title="Page introuvable | Pedagogia Drive"
      />
      <LandingHeader />
      <main className="flex flex-1 items-center px-4 py-20 sm:px-6" id="main-content">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold tracking-[0.16em] text-[#1769FF]">404</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[var(--lp-ink)]">Page introuvable</h1>
          <p className="mt-4 text-base leading-7 text-[var(--lp-muted)]">
            Cette adresse ne correspond à aucune page de Pedagogia Drive.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1769FF] px-5 text-sm font-semibold text-white transition hover:bg-[#0f5ef0]"
              to="/"
            >
              Retour à l’accueil
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--lp-border)] px-5 text-sm font-semibold text-[var(--lp-ink)] transition hover:border-[#1769FF]/40"
              to="/contact"
            >
              Contact
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
