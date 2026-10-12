import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { REMC_COMPETENCY_ORDER, REMC_COMPETENCIES } from '../../data/remcCompetencies'
import {
  areAllSubCompetenciesValidated,
  buildEffectiveUnlockState,
  computeGlobalRemcProgress,
  competencyStatusIcon,
  fetchCompetencyValidations,
  isCompetencyEffectivelyValidated,
  syncAutoCompetencyValidations,
} from '../../services/remcProgress'
import { subscribePostgresChanges } from '../../services/realtime'
import RemcProgressOverview from './RemcProgressOverview'

const REMC_SUB_STATUSES = ['Non commencé', 'En cours', 'Validé']

function computeSubCompetencyProgress(items = []) {
  if (!items.length) return 0
  const validated = items.filter((item) => item.status === 'Validé').length
  return Math.round((validated / items.length) * 100)
}

function RemcCompetencyCard({
  code,
  entry,
  competency,
  expanded,
  onToggle,
  onRemcStatusChange,
  studentId,
}) {
  const meta = REMC_COMPETENCIES[code]
  const effectivelyValidated = isCompetencyEffectivelyValidated(entry, competency)
  const icon = competencyStatusIcon(entry, code, competency)
  const unlocked = entry?.unlocked || code === 'C1'
  const items = competency?.items || []
  const subProgress = computeSubCompetencyProgress(items)
  const allSubsValidated = areAllSubCompetenciesValidated(competency)

  return (
    <article
      className={`overflow-hidden rounded-2xl border transition-colors ${
        expanded && unlocked
          ? 'border-cyan-200 bg-cyan-50/60 shadow-sm'
          : unlocked
            ? 'border-slate-300 bg-white hover:border-cyan-100'
            : 'border-slate-100 bg-slate-50/80'
      }`}
    >
      <button
        aria-expanded={expanded}
        className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-start sm:justify-between"
        disabled={!unlocked}
        onClick={() => unlocked && onToggle(code)}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {icon && (
              <span aria-hidden="true" className="text-xl">
                {icon}
              </span>
            )}
            <p className="text-sm font-black text-slate-900 sm:text-base">
              {code} · {meta?.shortTitle}
            </p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{meta?.title}</p>
          {unlocked && items.length > 0 && (
            <>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {items.length} sous-compétences · {subProgress}% validées
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                  style={{ width: `${subProgress}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2 sm:text-right">
          {!unlocked ? (
            <p className="text-xs font-semibold text-slate-500">
              🔒 Validez la compétence précédente
            </p>
          ) : effectivelyValidated && entry?.validatedAt ? (
            <>
              <p className="text-xs font-extrabold text-emerald-700">✅ Compétence validée</p>
              <p className="text-xs font-semibold text-slate-500">
                Validée le {new Date(entry.validatedAt).toLocaleDateString('fr-FR')}
                {entry.teacherName ? ` · ${entry.teacherName}` : ''}
              </p>
            </>
          ) : allSubsValidated ? (
            <p className="text-xs font-semibold text-cyan-700">Validation en cours…</p>
          ) : (
            <p className="text-xs font-bold text-cyan-800">
              {expanded ? 'Masquer les sous-compétences' : 'Ouvrir les sous-compétences'}
            </p>
          )}
          {unlocked && (
            <span
              aria-hidden="true"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm transition-all ${
                expanded
                  ? 'rotate-180 border-cyan-400 bg-cyan-100 text-cyan-800'
                  : 'border-cyan-300 bg-cyan-50 text-cyan-700'
              }`}
            >
              <ChevronDown className="h-5 w-5 stroke-[2.5]" />
            </span>
          )}
        </div>
      </button>

      {unlocked && expanded && items.length > 0 && (
        <div className="border-t border-cyan-100 px-4 pb-4 pt-3">
          <p className="mb-3 text-xs font-semibold text-slate-500">
            Passez chaque sous-compétence en « Validé » — la compétence {code} sera validée
            automatiquement lorsque toutes le seront.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((item) => (
              <div className="rounded-xl border-2 border-slate-300 bg-white p-3" key={item.id}>
                <p className="text-sm font-bold text-slate-700">
                  {item.code ? (
                    <>
                      <span className="text-cyan-700">{item.code}</span> · {item.label}
                    </>
                  ) : (
                    item.label
                  )}
                </p>
                <select
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) =>
                    onRemcStatusChange?.(studentId, code, item.id, event.target.value)
                  }
                  value={item.status}
                >
                  {REMC_SUB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

export default function RemcTeacherValidationPanel({
  studentId,
  organizationId,
  teacherId,
  remcCompetencies = [],
  onRemcStatusChange,
  onUnlockStateChange,
  embedded = false,
}) {
  const [unlockState, setUnlockState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedCode, setExpandedCode] = useState(null)

  const remcByCode = useMemo(
    () => Object.fromEntries((remcCompetencies || []).map((row) => [row.code, row])),
    [remcCompetencies],
  )

  const applyUnlockState = useCallback((nextState) => {
    setUnlockState(nextState)
    onUnlockStateChange?.(nextState)
  }, [onUnlockStateChange])

  const refresh = useCallback(async () => {
    if (!studentId) {
      applyUnlockState(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { unlockState: fetched } = await fetchCompetencyValidations(studentId)
    let nextState = fetched

    if (remcCompetencies.length && organizationId && teacherId) {
      const { unlockState: synced } = await syncAutoCompetencyValidations({
        studentId,
        organizationId,
        teacherId,
        remcCompetencies,
        unlockState: fetched,
      })
      nextState = synced || fetched
    }

    applyUnlockState(nextState)
    setLoading(false)
  }, [studentId, organizationId, teacherId, remcCompetencies, applyUnlockState])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    setExpandedCode(null)
  }, [studentId])

  useEffect(() => {
    if (!studentId) return undefined
    return subscribePostgresChanges({
      topicBase: `remc-teacher:${studentId}`,
      listeners: [
        {
          config: {
            event: '*',
            schema: 'public',
            table: 'student_remc_item_progress',
            filter: `student_id=eq.${studentId}`,
          },
          callback: refresh,
        },
        {
          config: {
            event: '*',
            schema: 'public',
            table: 'student_competency_validations',
            filter: `student_id=eq.${studentId}`,
          },
          callback: refresh,
        },
      ],
    })
  }, [studentId, refresh])

  const globalProgress = useMemo(
    () => (unlockState ? computeGlobalRemcProgress(unlockState, remcCompetencies) : 0),
    [unlockState, remcCompetencies],
  )

  const effectiveUnlockState = useMemo(
    () => buildEffectiveUnlockState(unlockState, remcCompetencies),
    [unlockState, remcCompetencies],
  )

  const toggleCompetency = (code) => {
    setExpandedCode((current) => (current === code ? null : code))
  }

  if (!studentId) return null

  const title = embedded
    ? 'Compétences travaillées pendant la leçon'
    : 'Validation des compétences REMC'
  const description = embedded
    ? 'Validez manuellement les sous-compétences abordées avec l\'élève. Les changements sont enregistrés immédiatement.'
    : 'Cliquez une compétence pour afficher ses sous-compétences. Lorsque toutes sont « Validé », la compétence est validée automatiquement.'

  return (
    <section className={embedded ? 'rounded-2xl border border-cyan-200 bg-white p-4 sm:p-5' : 'card-panel-lg'}>
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className={`font-extrabold text-slate-900 ${embedded ? 'text-lg' : 'text-2xl'}`}>{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {!loading && (
          <p className={`font-black text-cyan-700 ${embedded ? 'text-2xl' : 'text-3xl'}`}>{globalProgress} %</p>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">Chargement de la progression…</p>
      ) : (
        <>
          <div className="mt-4">
            <RemcProgressOverview compact globalProgress={globalProgress} unlockState={effectiveUnlockState} />
          </div>

          <div className="mt-4 grid gap-3">
            {REMC_COMPETENCY_ORDER.map((code) => (
              <RemcCompetencyCard
                code={code}
                competency={remcByCode[code]}
                entry={effectiveUnlockState?.[code]}
                expanded={expandedCode === code}
                key={code}
                onRemcStatusChange={onRemcStatusChange}
                onToggle={toggleCompetency}
                studentId={studentId}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
