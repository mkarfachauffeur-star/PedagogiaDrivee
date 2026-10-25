import { createElement } from 'react'
import { useLocation } from 'react-router-dom'
import { navigationIconFor } from '../../config/navigationIcons'

/** En-tête de page des espaces connectés : icône de la rubrique, titre, phrase d'aide, actions. */
export default function PageHeader({ title, description, actions }) {
  const { pathname } = useLocation()
  const Icon = navigationIconFor(pathname)

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {Icon ? (
          <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#1769FF] text-white shadow-sm shadow-blue-600/20">
            {createElement(Icon, { className: 'h-5 w-5', strokeWidth: 2 })}
          </span>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
