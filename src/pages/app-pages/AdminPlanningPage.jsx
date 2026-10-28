import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import { ui } from '../../components/ui/styles'
import { useSecretaryDuties } from '../../hooks/useSecretaryDuties'
import AppModal, { AppModalFooter } from '../../components/ui/AppModal'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { getUserFacingError } from '../../lib/userFacingError'
import { createAppointment, listAppointments, loadPlanningOptions } from '../../services/appointments'

const STATUS_STYLES = {
  Planifié: 'border-blue-300 bg-blue-50 text-blue-800',
  Confirmé: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Annulé: 'border-rose-200 bg-rose-50 text-rose-800',
  Effectué: 'border-slate-300 bg-slate-100 text-slate-700',
}

const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  time: '09:00',
  durationMinutes: '60',
  studentId: '',
  teacherId: '',
  vehicleId: '',
  kind: 'Leçon',
  status: 'Planifié',
  notes: '',
})

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function getWeekRange(baseDate) {
  const date = new Date(baseDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  const start = new Date(date)
  const end = new Date(date)
  end.setDate(end.getDate() + 6)
  return { from: toDateKey(start), to: toDateKey(end), start, end }
}

function formatWeekLabel(start, end) {
  const fmt = (value) =>
    value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${fmt(start)} — ${fmt(end)}`
}

function formatSlotTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function AdminPlanningPage() {
  const { organizationId } = useAuth()
  const { canDoSecretaryTasks, managerCovers } = useSecretaryDuties()
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [appointments, setAppointments] = useState([])
  const [options, setOptions] = useState({ students: [], teachers: [], vehicles: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [form, setForm] = useState(() => emptyForm())
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const week = useMemo(() => getWeekRange(weekAnchor), [weekAnchor])

  const applyPlanningOptions = useCallback((planningOptions) => {
    setOptions({
      students: planningOptions.students || [],
      teachers: planningOptions.teachers || [],
      vehicles: planningOptions.vehicles || [],
    })
    if (planningOptions.error) {
      setFeedback({
        type: 'error',
        text: getUserFacingError(planningOptions.error, 'load')
          || 'Certaines listes (élèves, enseignants ou véhicules) n\'ont pas pu être chargées.',
      })
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const [{ appointments: rows, error }, planningOptions] = await Promise.all([
      listAppointments({
        dateFrom: week.from,
        dateTo: week.to,
        teacherId: teacherFilter || undefined,
        vehicleId: vehicleFilter || undefined,
      }),
      loadPlanningOptions(),
    ])
    if (error) setLoadError('Impossible de charger le planning.')
    else setLoadError(null)
    setAppointments(rows)
    applyPlanningOptions(planningOptions)
    setLoading(false)
  }, [applyPlanningOptions, teacherFilter, vehicleFilter, week.from, week.to])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openCreateModal = async () => {
    setForm(emptyForm())
    setModalOpen(true)
    setOptionsLoading(true)
    const planningOptions = await loadPlanningOptions()
    applyPlanningOptions(planningOptions)
    setOptionsLoading(false)
  }

  const hasPlanningChoices = options.students.length > 0 && options.teachers.length > 0

  const saveLesson = async (event) => {
    event.preventDefault()
    if (!canDoSecretaryTasks || !organizationId) return
    if (!form.studentId || !form.teacherId) {
      setFeedback({ type: 'error', text: 'Sélectionnez un élève et un enseignant.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    const { error } = await createAppointment({
      organizationId,
      studentId: form.studentId,
      teacherId: form.teacherId,
      vehicleId: form.vehicleId || null,
      kind: form.kind,
      startsAt: `${form.date}T${form.time}:00`,
      durationMinutes: Number(form.durationMinutes) || 60,
      status: form.status,
      notes: form.notes,
    })
    setSaving(false)

    if (error) {
      setFeedback({ type: 'error', text: getUserFacingError(error, 'save') })
      return
    }

    setModalOpen(false)
    setFeedback({ type: 'ok', text: 'Leçon planifiée.' })
    refresh()
  }

  const confirmedCount = appointments.filter((item) => item.status === 'Confirmé').length

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          canDoSecretaryTasks ? (
            <button className={ui.btnPrimary} disabled={loading || optionsLoading} onClick={openCreateModal} type="button">
              {loading || optionsLoading ? 'Chargement…' : 'Nouvelle leçon'}
            </button>
          ) : null
        }
        description={
          managerCovers
            ? 'Les créneaux de conduite par enseignant, élève et véhicule. Sans secrétaire, c’est vous qui planifiez.'
            : 'Vue d’ensemble des leçons par enseignant, élève et véhicule. La planification se fait par le secrétariat.'
        }
        title="Planning global"
      />

      {feedback && (
        <p
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            feedback.type === 'ok'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.text}
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Créneaux cette semaine" value={appointments.length} />
        <Kpi label="Confirmés" value={confirmedCount} tone="emerald" />
        <Kpi label="Enseignants actifs" value={options.teachers.length} tone="cyan" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  const next = new Date(weekAnchor)
                  next.setDate(next.getDate() - 7)
                  setWeekAnchor(next)
                }}
              >
                ← Semaine précédente
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setWeekAnchor(new Date())}
              >
                Cette semaine
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  const next = new Date(weekAnchor)
                  next.setDate(next.getDate() + 7)
                  setWeekAnchor(next)
                }}
              >
                Semaine suivante →
              </button>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">{formatWeekLabel(week.start, week.end)}</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FilterSelect
              label="Enseignant"
              value={teacherFilter}
              onChange={setTeacherFilter}
              options={[{ id: '', label: 'Tous' }, ...options.teachers]}
            />
            <FilterSelect
              label="Véhicule"
              value={vehicleFilter}
              onChange={setVehicleFilter}
              options={[{ id: '', label: 'Tous' }, ...options.vehicles]}
            />
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm font-medium text-slate-500">Chargement…</p>
          ) : loadError ? (
            <EmptyState title="Erreur" message={loadError} icon="⚠️" />
          ) : appointments.length === 0 ? (
            <EmptyState
              title="Aucune leçon programmée"
              message="Planifiez la première leçon de la semaine avec le bouton « Nouvelle leçon »."
              icon="📅"
            />
          ) : (
            <div className="space-y-3">
              {appointments.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500">{formatSlotTime(item.starts_at)}</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.studentLabel}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.teacherLabel} · {item.vehicleLabel} · {item.duration_minutes} min · {item.kind}
                    </p>
                    {item.notes && <p className="mt-2 text-sm text-slate-500">{item.notes}</p>}
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                      STATUS_STYLES[item.status] || STATUS_STYLES.Planifié
                    }`}
                  >
                    {item.status}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <AppModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        eyebrow="Planning"
        title="Nouvelle leçon"
        size="lg"
        disableClose={saving}
        footer={(
          <AppModalFooter
            onClose={() => setModalOpen(false)}
            submitForm="planning-lesson-form"
            submitLabel={saving ? 'Enregistrement…' : 'Planifier la leçon'}
            submitDisabled={saving || !canDoSecretaryTasks || optionsLoading || !hasPlanningChoices}
          />
        )}
      >
        {optionsLoading ? (
          <p className="text-sm font-medium text-slate-500">Chargement des élèves, enseignants et véhicules…</p>
        ) : !hasPlanningChoices ? (
          <EmptyState
            title="Listes indisponibles"
            message="Aucun élève ou enseignant actif n'a été trouvé. Vérifiez que des comptes sont bien créés dans votre auto-école, puis réessayez."
            icon="📋"
          />
        ) : null}
        <form id="planning-lesson-form" className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveLesson}>
          <Field label="Date *">
            <input className="pd-input mt-2 w-full" type="date" required value={form.date} onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))} />
          </Field>
          <Field label="Heure de début *">
            <input className="pd-input mt-2 w-full" type="time" required value={form.time} onChange={(e) => setForm((c) => ({ ...c, time: e.target.value }))} />
          </Field>
          <Field label="Durée">
            <select className="pd-input mt-2 w-full" value={form.durationMinutes} onChange={(e) => setForm((c) => ({ ...c, durationMinutes: e.target.value }))}>
              <option value="60">1 h</option>
              <option value="90">1 h 30</option>
              <option value="120">2 h</option>
            </select>
          </Field>
          <Field label="Type">
            <select className="pd-input mt-2 w-full" value={form.kind} onChange={(e) => setForm((c) => ({ ...c, kind: e.target.value }))}>
              <option>Leçon</option>
              <option>Code en salle</option>
              <option>RVP</option>
              <option>Rendez-vous</option>
              <option>Examen blanc</option>
            </select>
          </Field>
          <Field label="Élève *">
            <select
              className="pd-input mt-2 w-full"
              required
              disabled={optionsLoading || !options.students.length}
              value={form.studentId}
              onChange={(e) => setForm((c) => ({ ...c, studentId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {options.students.map((student) => (
                <option key={student.id} value={student.id}>{student.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Enseignant *">
            <select
              className="pd-input mt-2 w-full"
              required
              disabled={optionsLoading || !options.teachers.length}
              value={form.teacherId}
              onChange={(e) => setForm((c) => ({ ...c, teacherId: e.target.value }))}
            >
              <option value="">— Sélectionner —</option>
              {options.teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>{teacher.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Véhicule">
            <select
              className="pd-input mt-2 w-full"
              disabled={optionsLoading || !options.vehicles.length}
              value={form.vehicleId}
              onChange={(e) => setForm((c) => ({ ...c, vehicleId: e.target.value }))}
            >
              <option value="">— Aucun —</option>
              {options.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select className="pd-input mt-2 w-full" value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
              <option>Planifié</option>
              <option>Confirmé</option>
            </select>
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <textarea
              className="pd-input mt-2 min-h-24 w-full py-3"
              value={form.notes}
              onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
              placeholder="Point de rendez-vous, objectif pédagogique…"
            />
          </Field>
        </form>
      </AppModal>
    </div>
  )
}

function Kpi({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-700',
    cyan: 'text-blue-700',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tones[tone] || tones.slate}`}>{value}</p>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select className="pd-input mt-2 w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.id || 'all'} value={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  )
}
