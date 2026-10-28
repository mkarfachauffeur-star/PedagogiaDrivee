import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText, Users, GraduationCap, Car, CreditCard, FileCheck, BookOpen } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'
import PageHero from '../../components/ui/PageHero'
import { useAuth } from '../../context/AuthContext'
import {
  REGULATORY_EXPORTS,
  REGULATORY_EXPORT_RUNNERS,
} from '../../services/regulatoryExport'
import { getUserFacingError } from '../../lib/userFacingError'

function defaultDateFrom() {
  return `${new Date().getFullYear()}-01-01`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function clampExportDate(value, { min, max } = {}) {
  if (!value) return value
  let next = value
  if (max && next > max) next = max
  if (min && next < min) next = min
  return next
}

function applyDateFromChange(nextFrom, currentTo) {
  const today = todayIso()
  const from = clampExportDate(nextFrom, { max: today })
  let to = currentTo
  if (from && to && from > to) to = from
  if (to && to > today) to = today
  return { from, to }
}

function applyDateToChange(currentFrom, nextTo) {
  const today = todayIso()
  const to = clampExportDate(nextTo, { max: today })
  let from = currentFrom
  if (from && to && to < from) from = to
  return { from, to }
}

function validateExportDates(dateFrom, dateTo) {
  const today = todayIso()
  if (!dateFrom || !dateTo) return 'Indiquez une période complète (Du et Au).'
  if (dateFrom > today || dateTo > today) return 'Les dates ne peuvent pas être postérieures à aujourd\'hui.'
  if (dateFrom > dateTo) return 'La date « Du » doit être antérieure ou égale à la date « Au ».'
  return null
}

function ExportDateInput({ label, value, onChange, min, max }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="pd-input mt-2 w-full"
        max={max}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        type="date"
        value={value}
      />
    </label>
  )
}

const EXPORT_ICONS = {
  students: Users,
  teachers: GraduationCap,
  lessons: BookOpen,
  payments: CreditCard,
  contracts: FileCheck,
  vehicles: Car,
}

function RegulatoryExportCard({
  config,
  disabled,
  busyKey,
  onExport,
}) {
  const Icon = EXPORT_ICONS[config.id] || FileSpreadsheet
  const csvBusy = busyKey === `${config.id}-csv`
  const xlsxBusy = busyKey === `${config.id}-xlsx`

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-slate-950">{config.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{config.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="pd-btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || csvBusy || xlsxBusy}
              onClick={() => onExport(config.id, 'csv')}
              type="button"
            >
              <Download className="h-4 w-4" />
              {csvBusy ? 'Génération…' : 'CSV'}
            </button>
            <button
              className="pd-btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || csvBusy || xlsxBusy}
              onClick={() => onExport(config.id, 'xlsx')}
              type="button"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {xlsxBusy ? 'Génération…' : 'Excel (.xlsx)'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function ManagerExportsPage() {
  const { profileId } = useAuth()
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(todayIso)
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState(null)

  const filters = useMemo(() => ({
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  }), [dateFrom, dateTo])

  const dateRangeError = useMemo(
    () => validateExportDates(dateFrom, dateTo),
    [dateFrom, dateTo],
  )

  const handleDateFromChange = (value) => {
    const { from, to } = applyDateFromChange(value, dateTo)
    setDateFrom(from)
    setDateTo(to)
    setError(null)
  }

  const handleDateToChange = (value) => {
    const { from, to } = applyDateToChange(dateFrom, value)
    setDateFrom(from)
    setDateTo(to)
    setError(null)
  }

  const runExport = async (exportId, format) => {
    const validationError = validateExportDates(dateFrom, dateTo)
    if (validationError) {
      setError(validationError)
      return
    }

    const runner = REGULATORY_EXPORT_RUNNERS[exportId]
    if (!runner) return

    setBusyKey(`${exportId}-${format}`)
    setError(null)
    try {
      if (exportId === 'pdf') {
        await runner(filters)
      } else {
        await runner(filters, format)
      }
    } catch (err) {
      setError(getUserFacingError(err, 'export'))
    } finally {
      setBusyKey(null)
    }
  }

  const today = todayIso()
  const dateFromMax = dateTo && dateTo < today ? dateTo : today
  const exportsDisabled = Boolean(dateRangeError) || Boolean(busyKey)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        subtitle="Fichiers CSV et Excel prêts pour les contrôles administratifs (DDTM, préfecture)."
        title="Exports réglementaires"
      />

      {!profileId ? (
        <EmptyState
          icon="📤"
          message="Connectez-vous avec votre compte gérant pour accéder aux exports réglementaires."
          title="Connexion requise"
        />
      ) : (
        <>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4 md:px-6">
              <h2 className="text-base font-semibold text-slate-900">Période d&apos;export</h2>
              <p className="mt-1 text-sm text-slate-500">
                Les registres élèves, leçons, paiements et contrats sont filtrés sur la période choisie.
              </p>
            </div>
            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ExportDateInput
                  label="Du"
                  max={dateFromMax}
                  onChange={handleDateFromChange}
                  value={dateFrom}
                />
                <ExportDateInput
                  label="Au"
                  max={today}
                  min={dateFrom || undefined}
                  onChange={handleDateToChange}
                  value={dateTo}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Période limitée à aujourd&apos;hui. Le parc véhicules est exporté en totalité (état courant).
              </p>
              {dateRangeError && (
                <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  {dateRangeError}
                </p>
              )}
              {error && (
                <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {error}
                </p>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Object.values(REGULATORY_EXPORTS).map((config) => (
              <RegulatoryExportCard
                busyKey={busyKey}
                config={config}
                disabled={exportsDisabled}
                key={config.id}
                onExport={runExport}
              />
            ))}
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4 md:px-6">
              <h2 className="text-lg font-semibold text-slate-950">Dossier PDF réglementaire</h2>
              <p className="mt-1 text-sm text-slate-500">
                Synthèse imprimable : identité de l&apos;auto-école, SIRET, agrément, tableaux élèves, enseignants, véhicules, paiements et signature numérique.
              </p>
            </div>
            <div className="p-5 md:p-6">
              <button
                className="pd-btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={exportsDisabled}
                onClick={() => runExport('pdf', 'pdf')}
                type="button"
              >
                <FileText className="h-4 w-4" />
                {busyKey === 'pdf-pdf' ? 'Génération…' : 'Télécharger le dossier PDF (.pdf)'}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
