import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Car, CheckCircle2, Flag, Hourglass } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { AAC_KM_TARGET, daysBetween, formatDateFr } from '../../lib/aacRules'
import { buildRvpMilestones, journeyProgress, orderedRvpMilestones } from '../../lib/aacJourney'

const KM_TICKS = [1000, 2000]

const wholeKm = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const preciseKm = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
/** 3 000 pour les repères, 35,5 pour les kilomètres parcourus. */
const formatKm = (value, precise = false) => (precise ? preciseKm : wholeKm).format(Number(value) || 0)

const STATES = {
  realise: { label: 'Réalisé', tone: 'success', icon: CheckCircle2 },
  en_retard: { label: 'En retard', tone: 'danger', icon: Hourglass },
  a_effectuer: { label: 'À effectuer', tone: 'info', icon: null },
}

function RvpMilestone({ icon: Icon, title, detail, state, due = false }) {
  const meta = STATES[state] || STATES.a_effectuer
  return (
    <li className={`flex items-start gap-3 px-4 py-3 ${due ? 'bg-amber-50/70' : ''}`}>
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          state === 'realise' ? 'bg-emerald-50 text-emerald-600' : due ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-[#1769FF]'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <StatusBadge tone={due && state !== 'realise' ? 'warning' : meta.tone}>{due && state !== 'realise' ? 'À planifier' : meta.label}</StatusBadge>
        </div>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p>
      </div>
    </li>
  )
}

function KeyFact({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium tabular-nums text-slate-900">{value}</dd>
      {hint ? <dd className="text-xs text-slate-500">{hint}</dd> : null}
    </div>
  )
}

/**
 * Parcours visuel AAC vers les 3 000 km. Aucune carte : les kilomètres
 * affichés viennent uniquement des trajets validés (agrégat serveur).
 */
export default function AacJourneyCard({
  progress,
  startedAt,
  examEligibleAt,
  examEligibleReason = null,
  seventeenAt = null,
  statusText,
  tripCount = 0,
  rvpCompleted = 0,
  rvpRequired = 2,
  rvp = [],
  ffiAt = null,
  tripActive = false,
  showRvp = true,
}) {
  const km = Math.max(0, Number(progress?.km) || 0)
  const target = Number(progress?.target) || AAC_KM_TARGET
  const { remaining, percentDisplay, finished } = journeyProgress(km, target)
  const fillPercent = Math.min(100, (km / target) * 100)

  const [displayKm, setDisplayKm] = useState(km)
  const [pulse, setPulse] = useState(false)
  const prevKmRef = useRef(km)

  useEffect(() => {
    const from = prevKmRef.current
    const to = km
    prevKmRef.current = km
    if (to === from) return undefined
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const start = performance.now()
    const duration = 900
    let raf = 0
    let timeout = null
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - p) ** 3
      setDisplayKm(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    if (to > from && !reduceMotion) timeout = setTimeout(() => setPulse(false), 1700)
    raf = requestAnimationFrame(() => {
      setPulse(to > from && !reduceMotion)
      if (reduceMotion) setDisplayKm(to)
      else step(performance.now())
    })
    return () => {
      cancelAnimationFrame(raf)
      if (timeout) clearTimeout(timeout)
    }
  }, [km])

  const daysElapsed = useMemo(() => (startedAt ? daysBetween(startedAt) : null), [startedAt])
  const daysToEligible = useMemo(
    () => (examEligibleAt ? daysBetween(new Date(), examEligibleAt) : null),
    [examEligibleAt],
  )

  const milestones = useMemo(
    () => buildRvpMilestones({ rvp, km, target, ffiAt }),
    [rvp, km, target, ffiAt],
  )
  const [rvp1] = milestones.mandatory
  const rvp1Detail = rvp1.deadline
    ? `Entre le ${formatDateFr(rvp1.windowStart)} et le ${formatDateFr(rvp1.deadline)} (d’après la FFI du ${formatDateFr(ffiAt)})`
    : rvp1.requirement
  const orderedMilestones = useMemo(() => orderedRvpMilestones(milestones), [milestones])

  const eligibleHint = [
    daysToEligible == null ? null : daysToEligible > 0 ? `Dans ${daysToEligible} jour${daysToEligible > 1 ? 's' : ''}` : 'Date atteinte',
    examEligibleReason === 'age'
      ? `Date fixée par ses 17 ans`
      : seventeenAt
        ? `17 ans atteints le ${formatDateFr(seventeenAt)}`
        : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <section aria-label="Parcours de conduite accompagnée" className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#1769FF]">
            <Car className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Objectif {formatKm(target)} km</h2>
            <p className="mt-0.5 hidden text-sm text-slate-500 sm:block">Kilomètres des trajets validés de la conduite accompagnée.</p>
          </div>
        </div>
        {statusText ? <StatusBadge tone="info">{statusText}</StatusBadge> : null}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="flex items-baseline gap-1.5">
          <span className={`text-4xl font-semibold tabular-nums tracking-[-0.03em] text-slate-900 sm:text-5xl ${pulse ? 'aac-journey-number-pulse' : ''}`}>
            {formatKm(displayKm, true)}
          </span>
          <span className="text-base text-slate-400">/ {formatKm(target)} km</span>
        </p>
        <p className="text-2xl font-semibold tabular-nums text-[#1769FF]">{percentDisplay} %</p>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {tripCount} trajet{tripCount > 1 ? 's' : ''} validé{tripCount > 1 ? 's' : ''}
        {' · '}
        {finished ? 'objectif atteint' : `encore ${formatKm(remaining, true)} km`}
        {tripActive ? ' · trajet en cours, ajouté à l’arrivée' : ''}
      </p>

      <div className="mt-5">
        <div className="relative h-2.5 rounded-full bg-slate-100">
          <div
            className={`absolute inset-y-0 left-0 rounded-full bg-[#1769FF] transition-[width] duration-700 ease-out ${pulse ? 'aac-journey-fill-pulse' : ''}`}
            style={{ width: `${Math.max(fillPercent, km > 0 ? 1.5 : 0)}%` }}
          />
          {KM_TICKS.map((tick) => (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-0.5 bg-white"
              key={tick}
              style={{ left: `${(tick / target) * 100}%` }}
            />
          ))}
        </div>
        <div className="relative mt-1.5 h-4 text-xs tabular-nums text-slate-500">
          <span className="absolute left-0">0 km</span>
          {KM_TICKS.map((tick) => (
            <span className="absolute -translate-x-1/2" key={tick} style={{ left: `${(tick / target) * 100}%` }}>
              {formatKm(tick)}
            </span>
          ))}
          <span className="absolute right-0 font-medium text-slate-700">{formatKm(target)} km</span>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KeyFact label="Début" value={formatDateFr(startedAt)} />
        <KeyFact label="Jours écoulés" value={daysElapsed ?? '—'} />
        <KeyFact label="RVP obligatoires" value={`${rvpCompleted} / ${rvpRequired} réalisés`} />
        <KeyFact hint={eligibleHint} label="Examen possible le" value={formatDateFr(examEligibleAt)} />
      </dl>

      {showRvp ? (
        <>
          <h3 className="mt-6 text-sm font-semibold text-slate-900">Rendez-vous pédagogiques</h3>
          <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
            {orderedMilestones.map((item) => {
              if (item.sequence === 1) {
                return (
                  <RvpMilestone
                    detail={rvp1Detail}
                    icon={CalendarClock}
                    key="rvp-1"
                    state={item.state}
                    title="RVP 1 · obligatoire"
                  />
                )
              }
              if (item.sequence === 2) {
                return (
                  <RvpMilestone
                    detail={item.requirement}
                    due={item.due}
                    icon={Flag}
                    key="rvp-2"
                    state={item.state}
                    title={`RVP 2 · obligatoire · ${formatKm(target)} km`}
                  />
                )
              }
              const { row } = item
              return (
                <RvpMilestone
                  detail={row.heldOn ? `Prévu le ${formatDateFr(row.heldOn)}` : 'Date à définir avec l’enseignant'}
                  icon={Flag}
                  key={row.id || row.sequence}
                  state={item.state}
                  title={`${row.label || `Rendez-vous ${row.sequence}`} · facultatif`}
                />
              )
            })}
          </ul>
        </>
      ) : null}
    </section>
  )
}
