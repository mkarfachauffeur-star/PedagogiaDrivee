import { ACCENTS } from './accents'

const VALUE_TONES = {
  default: 'text-slate-900',
  danger: 'text-rose-700',
  warning: 'text-amber-800',
  success: 'text-emerald-700',
}

/** Indicateur chiffré : libellé, valeur, précision facultative et icône teintée. */
export default function StatCard({ label, value, detail, tone = 'default', icon: Icon, accent = 'blue' }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon ? (
          <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${ACCENTS[accent] || ACCENTS.blue}`}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <p className={`mt-1 text-xl font-semibold tracking-[-0.02em] tabular-nums sm:text-2xl ${VALUE_TONES[tone] || VALUE_TONES.default}`}>
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </article>
  )
}
