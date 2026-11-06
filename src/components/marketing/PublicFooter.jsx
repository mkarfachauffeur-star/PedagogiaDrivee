import { Link } from 'react-router-dom'
import BrandLogo from '../BrandLogo'
import { LEGAL_ENTITY } from '../../config/legal'

const LEGAL_LINKS = [
  { label: 'Livret numérique auto-école', to: '/livret-numerique-auto-ecole' },
  { label: 'Mentions légales', to: '/mentions-legales' },
  { label: 'Politique de confidentialité', to: '/politique-confidentialite' },
  { label: 'CGU', to: '/cgu' },
  { label: 'CGV', to: '/cgv' },
  { label: 'Politique de cookies', to: '/cookies' },
  { label: 'Contact', to: '/contact' },
]

export default function PublicFooter({ isDark = true, compact = false }) {
  const linkClass = isDark
    ? 'text-sm font-semibold text-slate-400 transition hover:text-white'
    : 'text-sm font-semibold text-slate-600 transition hover:text-slate-900'
  const copyClass = isDark ? 'text-xs text-slate-600' : 'text-xs text-slate-500'
  const borderClass = isDark ? 'border-white/10' : 'border-slate-300'
  const shellClass = isDark
    ? 'border-t border-white/10 bg-[#020817] px-4 py-10 sm:px-6 lg:px-8'
    : 'border-t-2 border-slate-300 bg-slate-100 px-4 py-10 sm:px-6 lg:px-8'

  return (
    <footer className={shellClass}>
      <div className={`mx-auto flex w-full max-w-7xl flex-col gap-8 ${compact ? '' : 'sm:flex-row sm:items-start sm:justify-between'}`}>
        {!compact && (
          <div className="shrink-0">
            <BrandLogo animated={false} />
          </div>
        )}
        <nav
          aria-label="Liens légaux et contact"
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          {LEGAL_LINKS.map((item) => (
            <Link className={linkClass} key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={`mx-auto mt-8 max-w-7xl border-t pt-6 text-center ${borderClass}`}>
        <p className={copyClass}>
          © {new Date().getFullYear()} {LEGAL_ENTITY.tradeName} — {LEGAL_ENTITY.companyName}
        </p>
      </div>
    </footer>
  )
}
