import { motion } from 'framer-motion'
import { Home, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from '../../BrandLogo'
import MarketingThemeToggle from '../MarketingThemeToggle'
import { useMarketingTheme } from '../../../hooks/useMarketingTheme'
import { trackDemoRequestClick } from '../../../lib/analytics'
import { isLandingHome, LANDING_HOME_LINK, LANDING_MENU_LINKS, LANDING_NAV_LINKS, scrollToLandingSection } from './landingNav'

function NavItem({ item, className, onNavigate, isHome }) {
  if (item.href === '/') {
    return (
      <Link
        className={className}
        onClick={() => {
          onNavigate?.()
          if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        to="/"
      >
        {item.label}
      </Link>
    )
  }

  if (item.route) {
    return (
      <Link className={className} onClick={onNavigate} to={item.href}>
        {item.label}
      </Link>
    )
  }

  if (!isHome) {
    return (
      <Link className={className} onClick={onNavigate} to={`/${item.href}`}>
        {item.label}
      </Link>
    )
  }

  return (
    <a
      className={className}
      href={item.href}
      onClick={(event) => {
        const id = item.href.startsWith('#') ? item.href.slice(1) : ''
        if (!id || !document.getElementById(id)) return
        event.preventDefault()
        onNavigate?.()
        window.setTimeout(() => {
          scrollToLandingSection(item.href)
          window.history.replaceState(null, '', item.href)
        }, 0)
      }}
    >
      {item.label}
    </a>
  )
}

export default function LandingHeader() {
  const { pathname } = useLocation()
  const isHome = isLandingHome(pathname)
  const { isDark, toggleTheme } = useMarketingTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const navClass = 'text-sm font-medium text-[var(--lp-muted)] transition hover:text-[var(--lp-ink)]'
  const toggleClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[var(--lp-border)] text-[var(--lp-ink)] transition hover:bg-[var(--lp-bg-alt)] lg:h-10 lg:w-10'
  const loginClass =
    'inline-flex h-10 items-center justify-center rounded-[12px] border-2 border-[var(--lp-ink)] bg-[var(--lp-card)] px-4 text-sm font-semibold text-[var(--lp-ink)] shadow-sm transition hover:bg-[var(--lp-bg-alt)]'
  const demoClass =
    'inline-flex h-10 items-center justify-center rounded-[12px] bg-[#EF3340] px-5 text-sm font-semibold text-white transition hover:bg-[#d92b38]'

  const logo = <BrandLogo animated={false} idPrefix="landing-nav" variant={isDark ? 'marketing' : 'light'} />

  return (
    <header
      className={`sticky top-0 z-50 border-b pt-[max(2.75rem,env(safe-area-inset-top,0px),var(--pd-safe-top,0px))] backdrop-blur-xl transition lg:pt-0 ${
        scrolled ? 'border-[var(--lp-border)] bg-[var(--lp-bg)]/80' : 'border-transparent bg-[var(--lp-bg)]/55'
      }`}
    >
      <div className="mx-auto grid h-14 max-w-[1280px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 lg:h-16 lg:gap-10 lg:px-8">
        {isHome ? (
          <a aria-label="PEDAGOGIA DRIVE - Accueil" className="inline-flex shrink-0 items-center" href="#accueil">
            {logo}
          </a>
        ) : (
          <Link aria-label="PEDAGOGIA DRIVE - Accueil" className="inline-flex shrink-0 items-center" to="/">
            {logo}
          </Link>
        )}
        <nav
          aria-label="Navigation principale"
          className="hidden min-w-0 items-center justify-center gap-5 lg:flex xl:gap-7"
        >
          {LANDING_NAV_LINKS.map((item) => (
            <NavItem className={navClass} isHome={isHome} item={item} key={item.href} />
          ))}
        </nav>
        <div className="flex items-center justify-end gap-3">
          <div className="hidden items-center gap-3 lg:flex">
            <Link className={loginClass} to="/login">
              Se connecter
            </Link>
            {isHome ? (
              <a className={demoClass} href="#demonstration" onClick={() => trackDemoRequestClick('header')}>
                Demander une démonstration
              </a>
            ) : (
              <Link className={demoClass} onClick={() => trackDemoRequestClick('header')} to="/#demonstration">
                Demander une démonstration
              </Link>
            )}
          </div>
          <MarketingThemeToggle className={toggleClass} isDark={isDark} onToggle={toggleTheme} />
          <button
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[var(--lp-border)] lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            type="button"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-[var(--lp-border)] bg-[var(--lp-bg)]/95 px-4 py-5 backdrop-blur-xl lg:hidden">
          <motion.div animate={{ opacity: 1, y: 0 }} className="grid gap-1" initial={{ opacity: 0, y: -6 }}>
            <Link
              className="mb-1 flex min-h-11 items-center gap-3 rounded-xl border border-[var(--lp-border)] bg-[var(--lp-card)]/70 px-3 text-sm font-semibold text-[var(--lp-ink)] transition hover:border-sky-400/60 hover:bg-[var(--lp-card)]"
              onClick={() => {
                setMobileOpen(false)
                if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              to="/"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0b2a52] via-[#1d4ed8] to-[#7c3aed] text-white">
                <Home className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {LANDING_HOME_LINK.label}
            </Link>
            {LANDING_MENU_LINKS.map((item) => (
              <NavItem
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-[var(--lp-ink)]"
                isHome={isHome}
                item={item}
                key={item.href}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
            <Link
              className="mt-3 flex h-11 items-center justify-center rounded-[12px] border-2 border-[var(--lp-ink)] bg-[var(--lp-card)] text-sm font-semibold text-[var(--lp-ink)] shadow-sm"
              onClick={() => setMobileOpen(false)}
              to="/login"
            >
              Se connecter
            </Link>
            {isHome ? (
              <a
                className="flex h-11 items-center justify-center rounded-[12px] bg-[#EF3340] text-sm font-semibold text-white"
                href="#demonstration"
                onClick={() => {
                  trackDemoRequestClick('mobile_menu')
                  setMobileOpen(false)
                }}
              >
                Demander une démonstration
              </a>
            ) : (
              <Link
                className="flex h-11 items-center justify-center rounded-[12px] bg-[#EF3340] text-sm font-semibold text-white"
                onClick={() => {
                  trackDemoRequestClick('mobile_menu')
                  setMobileOpen(false)
                }}
                to="/#demonstration"
              >
                Demander une démonstration
              </Link>
            )}
          </motion.div>
        </div>
      )}
    </header>
  )
}
