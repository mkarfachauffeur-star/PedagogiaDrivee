import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Section repliable des sous-compétences : en-tête toujours visible (zone
 * tactile confortable), contenu déplié par défaut pour préserver la règle
 * de lecture complète ; le repli reste une commodité d'affichage.
 */
export default function CollapsibleSection({ kicker, title, defaultOpen = true, children, className = '' }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm ${className}`}>
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-blue-50/60 sm:px-5"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0 flex-1">
          {kicker ? (
            <span className="block text-[11px] font-semibold text-blue-700">{kicker}</span>
          ) : null}
          <span className="mt-0.5 block text-base font-semibold text-slate-950">{title}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-blue-700 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="border-t border-blue-100/80">{children}</div> : null}
    </section>
  )
}
