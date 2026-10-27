import { APP_STORE_URL } from '../../config/appStores'
import { trackEvent } from '../../lib/analytics'

/** Badge officiel « App Store » menant à la fiche de l'application iPhone. */
export default function AppStoreBadge({ className = '', source = 'footer' }) {
  return (
    <a
      aria-label="Télécharger Pedagogia Drive sur l’App Store (nouvel onglet)"
      className={`inline-flex rounded-lg transition hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769FF] ${className}`}
      href={APP_STORE_URL}
      onClick={() => trackEvent('app_store_click', { source })}
      rel="noopener noreferrer"
      target="_blank"
    >
      <img alt="Télécharger dans l’App Store" className="h-11 w-auto" height="44" src="/brand/badge-app-store.svg" width="132" />
    </a>
  )
}
