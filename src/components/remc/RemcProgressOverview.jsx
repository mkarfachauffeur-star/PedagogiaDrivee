import { REMC_COMPETENCY_ORDER, REMC_COMPETENCIES } from '../../data/remcCompetencies'
import { competencyStatusIcon } from '../../services/remcProgress'

function CompetencyProgressBar({ percent }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">Progression</span>
        <span className="text-xs font-semibold text-blue-700">{percent} %</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-300 transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  )
}

export default function RemcProgressOverview({
  unlockState,
  globalProgress,
  itemProgress,
  compact = false,
  showGlobalPercent = true,
}) {
  if (!unlockState) return null

  const byCompetency = itemProgress?.byCompetency || {}
  const showCompetencyBars = Boolean(itemProgress)

  return (
    <section className={compact ? 'space-y-3' : 'rounded-xl border border-slate-200 bg-white p-5 sm:p-6'}>
      {!compact && (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Progression REMC</h2>
            <p className="mt-1 text-sm text-slate-500">
              Parcours progressif — compétences débloquées par votre enseignant.
            </p>
          </div>
          {showGlobalPercent && (
            <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-[#1769FF]">{globalProgress} %</p>
          )}
        </div>
      )}

      <div className={`grid gap-2 ${compact ? '' : 'mt-4'}`}>
        {REMC_COMPETENCY_ORDER.map((code) => {
          const entry = unlockState[code]
          const meta = REMC_COMPETENCIES[code]
          const icon = competencyStatusIcon(entry, code)
          const isUnlocked = entry?.unlocked || code === 'C1'
          const percent = entry?.validated
            ? 100
            : byCompetency[code] ?? (isUnlocked ? 0 : 0)

          return (
            <div
              key={code}
              className={`rounded-2xl border px-4 py-3 ${
                isUnlocked
                  ? 'border-slate-300 bg-slate-50'
                  : 'border-slate-100 bg-slate-50/60 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {code} · {meta?.shortTitle || meta?.title}
                  </p>
                  {!compact && entry?.validated && entry.validatedAt && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Validée le {new Date(entry.validatedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                {icon && (
                  <span className="shrink-0 text-xl" aria-hidden="true">
                    {icon}
                  </span>
                )}
              </div>
              {showCompetencyBars && isUnlocked && !entry?.validated && (
                <CompetencyProgressBar percent={percent} />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
