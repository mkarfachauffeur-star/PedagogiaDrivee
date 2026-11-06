import { motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandLogo from '../../BrandLogo'
import MarketingThemeToggle from '../MarketingThemeToggle'
import { useMarketingTheme } from '../../../hooks/useMarketingTheme'
import { trackDemoRequestClick } from '../../../lib/analytics'
import { BTN_PRIMARY } from './landingStyles'
import { isLandingHome, LANDING_HOME_LINK, LANDING_MENU_LINKS, scrollToLandingSection } from './landingNav'

function NavItem({ item, className, onNavigate, isHome, active = false }) {
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
      aria-current={active ? 'true' : undefined}
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

/** Section de la page d'accueil actuellement à l'écran, pour surligner le lien du menu. */
function useActiveSection(enabled) {
  const [active, setActive] = useState('')

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return undefined
    const sections = LANDING_MENU_LINKS.map((item) => document.getElementById(item.href.slice(1))).filter(Boolean)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length) setActive(`#${visible[0].target.id}`)
        else if (window.scrollY < 200) setActive('')
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [enabled])

  return enabled ? active : ''
}

export default function LandingHeader() {
  const { pathname } = useLocation()
  const isHome = isLandingHome(pathname)
  const { isDark, toggleTheme } = useMarketingTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuPath, setMenuPath] = useState(pathname)
  const [scrolled, setScrolled] = useState(false)
  const activeSection = useActiveSection(isHome)

  // Le menu mobile se referme quand on change de page.
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const navClass = (href) =>
    `inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
      activeSection === href
        ? 'bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]'
        : 'text-[var(--lp-muted)] hover:bg-[var(--lp-bg-alt)] hover:text-[var(--lp-ink)]'
    }`
  const mobileNavClass = (href) =>
    `flex min-h-12 items-center justify-between rounded-lg px-3 text-base font-medium transition ${
      activeSection === href ? 'bg-[var(--lp-accent-soft)] text-[var(--lp-accent)]' : 'text-[var(--lp-ink)] hover:bg-[var(--lp-bg-alt)]'
    }`
  const toggleClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--lp-muted)] transition hover:bg-[var(--lp-bg-alt)] hover:text-[var(--lp-ink)]'
  const loginClass =
    'inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-semibold text-[var(--lp-ink)] transition hover:bg-[var(--lp-bg-alt)]'
  const demoClass = BTN_PRIMARY.replace('h-11', 'h-10').replace('px-5', 'px-4')

  const logo = <BrandLogo animated={false} idPrefix="landing-nav" lightMark={!isDark} variant={isDark ? 'marketing' : 'light'} />

  const demoLink = (className, source) =>
    isHome ? (
      <a
        className={className}
        href="#demonstration"
        onClick={() => {
          trackDemoRequestClick(source)
          setMobileOpen(false)
        }}
      >
        Demander une démonstration
      </a>
    ) : (
      <Link
        className={className}
        onClick={() => {
          trackDemoRequestClick(source)
          setMobileOpen(false)
        }}
        to="/#demonstration"
      >
        Demander une démonstration
      </Link>
    )

  return (
    <header
      className={`sticky top-0 z-50 border-b pt-[env(safe-area-inset-top,0px)] backdrop-blur-lg transition-[background-color,border-color,box-shadow] ${
        scrolled || mobileOpen
          ? 'border-[var(--lp-border)] bg-[var(--lp-bg)]/90 shadow-[0_8px_24px_-20px_rgba(2,8,23,0.35)]'
          : 'border-transparent bg-[var(--lp-bg)]'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        {isHome ? (
          <a aria-label="PEDAGOGIA DRIVE - Accueil" className="inline-flex shrink-0 items-center" href="#accueil">
            {logo}
          </a>
        ) : (
          <Link aria-label="PEDAGOGIA DRIVE - Accueil" className="inline-flex shrink-0 items-center" to="/">
            {logo}
          </Link>
        )}

        <nav aria-label="Navigation principale" className="ml-6 hidden min-w-0 items-center gap-1 lg:flex xl:ml-10">
          {LANDING_MENU_LINKS.map((item) => (
            <NavItem active={activeSection === item.href} className={navClass(item.href)} isHome={isHome} item={item} key={item.href} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <MarketingThemeToggle className={toggleClass} isDark={isDark} onToggle={toggleTheme} />
          <div className="hidden items-center gap-2 lg:flex">
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-[var(--lp-border-strong)]" />
            <Link className={loginClass} to="/login">
              Se connecter
            </Link>
            {demoLink(demoClass, 'header')}
          </div>
          <button
            aria-controls="landing-mobile-menu"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--lp-border)] text-[var(--lp-ink)] transition hover:bg-[var(--lp-bg-alt)] lg:hidden"
            onClick={() => setMobileOpen((value) => !value)}
            type="button"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--lp-border)] bg-[var(--lp-bg)] lg:hidden" id="landing-mobile-menu">
          <motion.nav
            animate={{ opacity: 1, y: 0 }}
            aria-label="Menu"
            className="mx-auto grid max-w-[1200px] gap-1 px-4 pb-5 pt-3 sm:px-6"
            initial={{ opacity: 0, y: -6 }}
          >
            <NavItem
              className={mobileNavClass('/')}
              isHome={isHome}
              item={LANDING_HOME_LINK}
              onNavigate={() => setMobileOpen(false)}
            />
            {LANDING_MENU_LINKS.map((item) => (
              <NavItem
                active={activeSection === item.href}
                className={mobileNavClass(item.href)}
                isHome={isHome}
                item={item}
                key={item.href}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
            <div className="mt-4 grid gap-2 border-t border-[var(--lp-border)] pt-4 sm:grid-cols-2">
              <Link
                className="flex h-11 items-center justify-center rounded-lg border border-[var(--lp-border-strong)] text-sm font-semibold text-[var(--lp-ink)]"
                onClick={() => setMobileOpen(false)}
                to="/login"
              >
                Se connecter
              </Link>
              {demoLink(BTN_PRIMARY, 'mobile_menu')}
            </div>
          </motion.nav>
        </div>
      )}
    </header>
  )
}
