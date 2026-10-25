export const LANDING_HOME_LINK = { label: 'Accueil', href: '/', route: true }

export const LANDING_NAV_LINKS = [
  LANDING_HOME_LINK,
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Pour qui\u00a0?', href: '#pour-qui' },
  { label: 'Tarifs', href: '#tarifs' },
  { label: 'FAQ', href: '#faq' },
]

export const LANDING_MENU_LINKS = LANDING_NAV_LINKS.filter((item) => item.href !== '/')

export function isLandingHome(pathname) {
  return pathname === '/'
}

export function landingHashPath(hash, pathname) {
  return isLandingHome(pathname) ? hash : `/${hash}`
}

export function scrollToLandingSection(hash) {
  const id = hash.startsWith('#') ? hash.slice(1) : ''
  if (!id) return false
  const target = document.getElementById(id)
  if (!target) return false
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}
