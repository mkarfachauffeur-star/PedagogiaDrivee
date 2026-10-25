import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { ui } from './styles'

/** Champ de recherche des listes. */
export function SearchInput({ value, onChange, placeholder = 'Rechercher…' }) {
  return (
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        aria-label={placeholder}
        className={`${ui.input} mt-0 pl-9`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  )
}

/** Case « Afficher les comptes de test ». */
export function TestDataToggle({ checked, onChange, count }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
      <input checked={checked} className={ui.checkbox} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      Afficher les comptes de test{typeof count === 'number' ? ` (${count})` : ''}
    </label>
  )
}

/** Pagination simple : « 1 à 25 sur 132 ». */
export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
      <span className="tabular-nums">
        {from} à {to} sur {total}
      </span>
      <div className="flex gap-2">
        <button aria-label="Page précédente" className={ui.btnSmall} disabled={page <= 1} onClick={() => onChange(page - 1)} type="button">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button aria-label="Page suivante" className={ui.btnSmall} disabled={page >= pages} onClick={() => onChange(page + 1)} type="button">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
