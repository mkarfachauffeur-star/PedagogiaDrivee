import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from '../../BrandLogo'
import MarketingThemeToggle from '../MarketingThemeToggle'
import { useMarketingTheme } from '../../../hooks/useMarketingTheme'
import { trackDemoRequestClick } from '../../../lib/analytics'
import { BTN_PRIMARY } from './landingStyles'
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
    'inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--lp-muted)] transition hover:bg-[var(--lp-bg-alt)] hover:text-[var(--lp-ink)]'
  const loginClass =
    'inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-[var(--lp-ink)] transition hover:bg-[var(--lp-bg-alt)]'
  const demoClass = BTN_PRIMARY.replace('h-11', 'h-10').replace('px-5', 'px-4')

  const logo = <BrandLogo animated={false} idPrefix="landing-nav" lightMark={!isDark} variant={isDark ? 'marketing' : 'light'} />

  return (
    <header
      className={`sticky top-0 z-50 border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-lg transition ${
        scrolled ? 'border-[var(--lp-border)] bg-[var(--lp-bg)]/90' : 'border-transparent bg-[var(--lp-bg)]'
      }`}
    >
      <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
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
          className="hidden min-w-0 items-center justify-center gap-7 lg:flex"
        >
          {LANDING_NAV_LINKS.filter((item) => item.href !== '/').map((item) => (
            <NavItem className={navClass} isHome={isHome} item={item} key={item.href} />
          ))}
        </nav>
        <div className="flex items-center justify-end gap-3">
          <div className="hidden items-center gap-2 lg:flex">
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--lp-border)] text-[var(--lp-ink)] lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            type="button"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-[var(--lp-border)] bg-[var(--lp-bg)] px-4 py-4 lg:hidden">
          <motion.div animate={{ opacity: 1, y: 0 }} className="grid gap-1" initial={{ opacity: 0, y: -6 }}>
            <Link
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--lp-ink)]"
              onClick={() => {
                setMobileOpen(false)
                if (isHome) window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              to="/"
            >
              {LANDING_HOME_LINK.label}
            </Link>
            {LANDING_MENU_LINKS.map((item) => (
              <NavItem
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[var(--lp-ink)]"
                isHome={isHome}
                item={item}
                key={item.href}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
            <Link
              className="mt-3 flex h-11 items-center justify-center rounded-lg border border-[var(--lp-border-strong)] text-sm font-semibold text-[var(--lp-ink)]"
              onClick={() => setMobileOpen(false)}
              to="/login"
            >
              Se connecter
            </Link>
            {isHome ? (
              <a
                className={`mt-2 ${BTN_PRIMARY}`}
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
                className={`mt-2 ${BTN_PRIMARY}`}
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
