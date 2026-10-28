import { useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, Copy, Phone } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { REMC_COMPETENCIES, REMC_COMPETENCY_ORDER } from '../../data/remcCompetencies'
import { normalizeRemcStatus } from '../../data/remcTemplate'
import { formatDate } from '../../lib/format'

/** Une couleur par compétence REMC, reprise partout dans la fiche élève. */
const COMPETENCY_COLORS = {
  C1: '#1769FF',
  C2: '#059669',
  C3: '#d97706',
  C4: '#7c3aed',
}

function initials(student) {
  const first = String(student?.firstName || student?.first_name || '').trim()
  const last = String(student?.lastName || student?.last_name || '').trim()
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?'
}

function formatHoursValue(value) {
  const number = Number(value || 0)
  return `${Number.isInteger(number) ? number : number.toFixed(1).replace('.', ',')} h`
}

/** Heures préconisées retenues, sinon heures du contrat. */
function targetHours(hours) {
  if (!hours) return null
  if (hours.acceptedTargetHours != null) return Number(hours.acceptedTargetHours)
  return hours.contractHours > 0 ? Number(hours.contractHours) : null
}

export function StudentAvatar({ student, size = 'md' }) {
  const sizes = size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-slate-100 font-semibold text-slate-600 ${sizes}`}>
      {initials(student)}
    </span>
  )
}

/** 06 12 34 56 78 */
function formatPhone(phone) {
  const digits = String(phone).replace(/\D/g, '')
  return digits.length === 10 ? digits.replace(/(\d{2})(?=\d)/g, '$1 ') : phone
}

/** Un téléphone (écran tactile) sait composer un numéro ; sur ordinateur, on l'affiche. */
function canDial() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

/**
 * Bouton d'appel : lance l'appel sur iPhone, et sur ordinateur affiche le numéro
 * avec un bouton pour le copier.
 */
export function CallButton({ phone }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!phone) return null
  const display = formatPhone(phone)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(phone).replace(/\s+/g, ''))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span className="relative shrink-0" ref={wrapperRef}>
      <a
        aria-expanded={open}
        aria-label={`Appeler le ${display}`}
        className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-emerald-600 transition hover:bg-emerald-50"
        href={`tel:${String(phone).replace(/\s+/g, '')}`}
        onClick={(event) => {
          event.stopPropagation()
          if (canDial()) return
          event.preventDefault()
          setOpen((value) => !value)
        }}
        title={display}
      >
        <Phone className="h-4 w-4" />
      </a>
      {open ? (
        <span className="absolute right-0 top-11 z-20 flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 shadow-lg">
          <span className="text-sm font-medium tabular-nums text-slate-900">{display}</span>
          <button
            aria-label="Copier le numéro"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
            onClick={(event) => {
              event.stopPropagation()
              void copy()
            }}
            type="button"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
        </span>
      ) : null}
    </span>
  )
}

/** Barre « heures effectuées / heures prévues », orange au-delà de l'objectif. */
export function HoursBar({ hours, compact = false }) {
  const done = Number(hours?.completedHours || 0)
  const target = targetHours(hours)
  const ratio = target ? Math.min(done / target, 1) : 0
  const over = target != null && done > target

  return (
    <div className={compact ? 'mt-2' : ''}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-500">{compact ? 'Heures de conduite' : 'Effectuées / prévues'}</span>
        <span className="tabular-nums text-slate-900">
          <span className="font-semibold">{hours ? formatHoursValue(done) : '…'}</span>
          <span className="text-slate-400"> / {target != null ? formatHoursValue(target) : '—'}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-amber-500' : 'bg-[#1769FF]'}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}

export function StudentListItem({ active, hours, isAac, onSelect, phone, student }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition ${
        active ? 'border-[#1769FF] bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <button className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={onSelect} type="button">
        <StudentAvatar student={student} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">
            {student.lastName} {student.firstName}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {student.permisSummary}
            {isAac ? <StatusBadge tone="info">AAC</StatusBadge> : null}
          </span>
          <HoursBar compact hours={hours} />
        </span>
      </button>
      <CallButton phone={phone} />
    </div>
  )
}

/** Anneau de progression d'une compétence REMC. */
function CompetencyRing({ code, percent, validated, total }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const color = COMPETENCY_COLORS[code]
  const started = percent > 0

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-16 w-16">
        <svg aria-hidden="true" className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" fill="none" r={radius} stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            fill="none"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.min(percent, 100) / 100)}
            strokeLinecap="round"
            strokeWidth="6"
            style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center">
          <span className="text-sm font-semibold" style={{ color: started ? color : '#64748b' }}>{code}</span>
        </span>
      </div>
      <p className="mt-1.5 text-xs font-medium tabular-nums text-slate-900">
        {validated}/{total}
      </p>
      <p className="text-[11px] leading-4 text-slate-500">{REMC_COMPETENCIES[code]?.shortTitle}</p>
    </div>
  )
}

export function CompetencyOverview({ progress, remc }) {
  const byCode = Object.fromEntries((remc || []).map((competency) => [competency.code, competency]))
  return (
    <div className="grid grid-cols-4 gap-2">
      {REMC_COMPETENCY_ORDER.map((code) => {
        const items = byCode[code]?.items || []
        const validated = items.filter((item) => normalizeRemcStatus(item.status) === 'Validé').length
        return (
          <CompetencyRing
            code={code}
            key={code}
            percent={progress?.byCompetency?.[code] ?? 0}
            total={items.length}
            validated={validated}
          />
        )
      })}
    </div>
  )
}

function SummaryRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm text-slate-900">{children}</dd>
    </div>
  )
}

/** Synthèse de la fiche : inscription, heures, évaluation de départ, compétences. */
export function StudentSummary({ apiStudent, assessment, hours, isPermisB, onOpenAssessment, progress, remc, teacherName }) {
  const assessmentDone = assessment?.status === 'completed'
  const recommended = hours?.recommendedHours

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Formation</h3>
        <dl className="mt-1 divide-y divide-slate-100">
          <SummaryRow label="Inscrit le">{formatDate(apiStudent?.registration_date)}</SummaryRow>
          <SummaryRow label="Enseignant référent">{teacherName || '—'}</SummaryRow>
          <SummaryRow label="Formule">{apiStudent?.package_name || apiStudent?.formation_type || '—'}</SummaryRow>
        </dl>
        <div className="mt-3">
          <HoursBar hours={hours} />
        </div>
      </section>

      {isPermisB ? (
        <section className="rounded-lg border border-slate-200 p-4">
          <button
            className="group flex w-full items-center justify-between gap-2 text-left"
            onClick={onOpenAssessment}
            type="button"
          >
            <h3 className="text-sm font-semibold text-slate-900">Évaluation de départ</h3>
            <ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
          </button>
          {assessmentDone ? (
            <dl className="mt-1 divide-y divide-slate-100">
              <SummaryRow label="Réalisée le">{formatDate(assessment.completed_at)}</SummaryRow>
              <SummaryRow label="Volume préconisé">{recommended ? `${recommended} h` : '—'}</SummaryRow>
              <SummaryRow label="Volume retenu">
                {hours?.acceptedTargetHours != null ? (
                  <StatusBadge tone="success">{formatHoursValue(hours.acceptedTargetHours)} · acceptées</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">En attente de l’élève</StatusBadge>
                )}
              </SummaryRow>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              {assessment?.status === 'in_progress' ? 'Évaluation commencée, à terminer.' : 'À réaliser lors de la première heure de conduite.'}
            </p>
          )}
        </section>
      ) : null}

      {isPermisB ? (
        <section className="rounded-lg border border-slate-200 p-4 lg:col-span-2">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Compétences REMC</h3>
            <span className="text-xs text-slate-500">
              {progress?.itemCounts?.validated ?? 0}/{progress?.itemCounts?.total ?? 0} sous-compétences validées
            </span>
          </div>
          <div className="mt-3">
            <CompetencyOverview progress={progress} remc={remc} />
          </div>
        </section>
      ) : null}
    </div>
  )
}
