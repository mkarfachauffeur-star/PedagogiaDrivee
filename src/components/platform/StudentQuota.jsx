import { formatDate } from '../../lib/format'

const BAR = { ok: 'bg-[#1769FF]', warning: 'bg-amber-500', full: 'bg-rose-500' }
const TEXT = { ok: 'text-slate-900', warning: 'text-amber-800', full: 'text-rose-700', unlimited: 'text-slate-900' }

/** Compteur d'élèves inscrits sur l'année d'abonnement : « 37 / 50 » avec une jauge. */
export default function StudentQuota({ quota, showPeriod = false }) {
  if (!quota) return <span className="text-slate-400">—</span>
  const { used, max, level, period } = quota
  return (
    <div className="min-w-[7.5rem]">
      <p className={`text-sm font-medium tabular-nums ${TEXT[level]}`}>
        {used}
        {max !== null ? <span className="text-slate-400"> / {max}</span> : <span className="text-xs font-normal text-slate-500"> élèves, illimité</span>}
      </p>
      {max !== null ? (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${BAR[level]}`} style={{ width: `${Math.min(100, (used / max) * 100)}%` }} />
        </div>
      ) : null}
      {level === 'warning' ? <p className="mt-1 text-[11px] text-amber-700">Seuil de 40 atteint</p> : null}
      {level === 'full' ? <p className="mt-1 text-[11px] text-rose-700">Limite atteinte : inscriptions bloquées</p> : null}
      {showPeriod && period ? (
        <p className="mt-1 text-[11px] text-slate-500">
          {period.isTrial ? 'Essai' : 'Année'} du {formatDate(period.start)} au {formatDate(new Date(period.end.getTime() - 86400000))}
        </p>
      ) : null}
    </div>
  )
}
