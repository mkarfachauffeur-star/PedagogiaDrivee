import { useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import AppModal, { AppModalFooter } from '../../components/ui/AppModal'

const teachers = ['Tous']
const vehicles = ['Tous']
const categories = ['Toutes', 'Permis B', 'AAC', 'Supervisée', 'Boîte auto', 'Examen']
const students = []

const statusStyles = {
  confirmé: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  annulé: 'border-rose-200 bg-rose-50 text-rose-800',
  'en attente': 'border-amber-200 bg-amber-50 text-amber-800',
}

const initialSlots = []

const emptyForm = {
  date: '2026-05-18',
  start: '09:00',
  end: '10:00',
  duration: '60',
  student: '',
  teacher: '',
  vehicle: '',
  category: 'Permis B',
  status: 'en attente',
  type: 'Conduite',
}

export default function SecretaryPlanningPage() {
  const [view, setView] = useState('semaine')
  const [currentDate, setCurrentDate] = useState(new Date('2026-05-18T12:00:00'))
  const [slots, setSlots] = useState(initialSlots)
  const [selectedId, setSelectedId] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [teacherFilter, setTeacherFilter] = useState('Tous')
  const [vehicleFilter, setVehicleFilter] = useState('Tous')
  const [categoryFilter, setCategoryFilter] = useState('Toutes')
  const [showForm, setShowForm] = useState(false)

  const filteredSlots = useMemo(
    () =>
      slots.filter(
        (slot) =>
          (teacherFilter === 'Tous' || slot.teacher === teacherFilter) &&
          (vehicleFilter === 'Tous' || slot.vehicle === vehicleFilter) &&
          (categoryFilter === 'Toutes' || slot.category === categoryFilter),
      ),
    [categoryFilter, slots, teacherFilter, vehicleFilter],
  )

  const selectedSlot = filteredSlots.find((slot) => slot.id === selectedId) || filteredSlots[0]
  const confirmedCount = filteredSlots.filter((slot) => slot.status === 'confirmé').length
  const availabilityRate = Math.max(18, 100 - filteredSlots.length * 9)

  const visibleDays = useMemo(() => {
    if (view === 'jour') return [toDateKey(currentDate)]
    if (view === 'mois') return getMonthDays(currentDate)
    if (view === 'année') return getYearMonths(currentDate)
    return getWeekDays(currentDate)
  }, [currentDate, view])

  const periodLabel = useMemo(() => getPeriodLabel(currentDate, view), [currentDate, view])

  const openCreateForm = () => {
    setEditingId(null)
    setForm({ ...emptyForm, date: toDateKey(currentDate), student: students[0] || '' })
    setShowForm(true)
  }

  const openEditForm = (slot) => {
    setEditingId(slot.id)
    setForm({
      date: slot.date,
      start: slot.start,
      end: slot.end,
      duration: String(getDurationMinutes(slot.start, slot.end)),
      student: slot.student,
      teacher: slot.teacher,
      vehicle: slot.vehicle,
      category: slot.category,
      status: slot.status,
      type: slot.type,
    })
    setShowForm(true)
  }

  const saveSlot = (event) => {
    event.preventDefault()
    const slotPayload = {
      ...form,
      end: calculateEndTime(form.start, Number(form.duration || 60)),
    }

    if (editingId) {
      setSlots((current) =>
        current.map((slot) => (slot.id === editingId ? { ...slot, ...slotPayload } : slot)),
      )
      setSelectedId(editingId)
    } else {
      const nextSlot = { ...slotPayload, id: Date.now() }
      setSlots((current) => [nextSlot, ...current])
      setSelectedId(nextSlot.id)
    }
    setShowForm(false)
  }

  const deleteSlot = (slotId) => {
    setSlots((current) => current.filter((slot) => slot.id !== slotId))
    setSelectedId(filteredSlots[0]?.id || null)
  }

  const moveSlot = (slotId, direction) => {
    setSlots((current) =>
      current.map((slot) => {
        if (slot.id !== slotId) return slot
        const date = new Date(`${slot.date}T12:00:00`)
        date.setDate(date.getDate() + direction)
        return { ...slot, date: date.toISOString().slice(0, 10), status: 'en attente' }
      }),
    )
  }

  const changePeriod = (direction) => {
    setCurrentDate((current) => {
      const next = new Date(current)
      if (view === 'jour') next.setDate(next.getDate() + direction)
      if (view === 'semaine') next.setDate(next.getDate() + direction * 7)
      if (view === 'mois') next.setMonth(next.getMonth() + direction)
      if (view === 'année') next.setFullYear(next.getFullYear() + direction)
      return next
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="overflow-hidden rounded-[2rem] border-2 border-slate-300 bg-white shadow-[var(--shadow-card)]">
        <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-cyan-900 p-6 text-white md:p-8">
          <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-sm font-semibold text-cyan-100">
            Planning secrétariat
          </span>
          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Calendrier global auto-école
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-blue-50">
                Vue centralisée des élèves, enseignants, véhicules, créneaux et disponibilités.
              </p>
            </div>
            <button
              className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-navy-950 shadow-xl transition hover:-translate-y-0.5 hover:bg-white"
              onClick={openCreateForm}
              type="button"
            >
              + Nouveau créneau
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Créneaux visibles" value={filteredSlots.length} />
        <Kpi label="Confirmés" value={confirmedCount} tone="emerald" />
        <Kpi label="En attente" value={filteredSlots.filter((slot) => slot.status === 'en attente').length} tone="amber" />
        <Kpi label="Disponibilité globale" value={`${availabilityRate}%`} tone="cyan" />
      </section>

      <section className="rounded-[2rem] border-2 border-slate-300 bg-white/85 p-5 shadow-[var(--shadow-card)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-cyan-50"
                onClick={() => changePeriod(-1)}
                type="button"
              >
                ← Précédent
              </button>
              <button
                className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-cyan-50"
                onClick={() => setCurrentDate(new Date('2026-05-18T12:00:00'))}
                type="button"
              >
                Aujourd’hui
              </button>
              <button
                className="rounded-2xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-cyan-50"
                onClick={() => changePeriod(1)}
                type="button"
              >
                Suivant →
              </button>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950">{periodLabel}</h2>
              <p className="text-sm font-semibold text-slate-500">
                Calendrier global avec changement de période et créneaux cliquables.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['jour', 'semaine', 'mois', 'année'].map((mode) => (
                <button
                  className={`rounded-2xl px-4 py-2 text-sm font-extrabold capitalize transition ${
                    view === mode
                      ? 'bg-navy-950 text-white shadow-lg'
                      : 'border-2 border-slate-300 bg-white text-slate-600 hover:bg-cyan-50'
                  }`}
                  key={mode}
                  onClick={() => setView(mode)}
                  type="button"
                >
                  Vue {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:min-w-[620px]">
            <Filter label="Enseignant" onChange={setTeacherFilter} options={teachers} value={teacherFilter} />
            <Filter label="Véhicule" onChange={setVehicleFilter} options={vehicles} value={vehicleFilter} />
            <Filter label="Catégorie" onChange={setCategoryFilter} options={categories} value={categoryFilter} />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border-2 border-slate-300 bg-slate-50">
          <div className={`grid ${view === 'jour' ? 'grid-cols-1' : view === 'année' ? 'grid-cols-2 lg:grid-cols-4' : view === 'mois' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-7' : 'grid-cols-1 md:grid-cols-7'}`}>
            {visibleDays.map((day) => {
              const daySlots =
                view === 'année'
                  ? filteredSlots.filter((slot) => slot.date.startsWith(day.key))
                  : filteredSlots.filter((slot) => slot.date === day)

              return (
                <div className="min-h-56 border-b border-r-2 border-slate-300 bg-white/70 p-3" key={view === 'année' ? day.key : day}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-black text-slate-900">
                      {view === 'année' ? day.label : formatDay(day)}
                    </h2>
                    <span className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-700">
                      {daySlots.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {daySlots.map((slot) => (
                      <button
                        className={`w-full rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${statusStyles[slot.status]} ${
                          selectedSlot?.id === slot.id ? 'ring-4 ring-cyan-100' : ''
                        }`}
                        key={slot.id}
                        onClick={() => {
                          setSelectedId(slot.id)
                          openEditForm(slot)
                        }}
                        type="button"
                      >
                        <span className="block text-xs font-black uppercase tracking-wide">
                          {slot.start} - {slot.end} · {slot.status}
                        </span>
                        <span className="mt-1 block font-extrabold">{slot.student}</span>
                        <span className="mt-1 block text-xs opacity-80">
                          {slot.teacher} · {slot.vehicle}
                        </span>
                      </button>
                    ))}
                    {!daySlots.length && (
                      <button
                        className="w-full rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/50 p-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50"
                        onClick={() => {
                          setForm({ ...emptyForm, date: view === 'année' ? `${day.key}-01` : day, student: students[0] || '' })
                          setEditingId(null)
                          setShowForm(true)
                        }}
                        type="button"
                      >
                        + Disponible
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-2xl font-extrabold text-slate-950">Tous les enseignants, véhicules et élèves</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <ResourceList title="Enseignants" items={teachers.slice(1)} />
            <ResourceList title="Véhicules" items={vehicles.slice(1)} />
            <ResourceList title="Élèves visibles" items={[...new Set(filteredSlots.map((slot) => slot.student))]} />
          </div>
        </div>

        {selectedSlot && (
          <aside className="rounded-[2rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
            <p className="text-xs font-black uppercase tracking-wide text-cyan-700">Fiche rendez-vous</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-950">{selectedSlot.student}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {selectedSlot.date} · {selectedSlot.start}-{selectedSlot.end}
            </p>
            <div className="mt-5 grid gap-3">
              {[
                ['Enseignant', selectedSlot.teacher],
                ['Véhicule', selectedSlot.vehicle],
                ['Catégorie', selectedSlot.category],
                ['État', selectedSlot.status],
              ].map(([label, value]) => (
                <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-3" key={label}>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="font-extrabold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button className="rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50" onClick={() => moveSlot(selectedSlot.id, -1)} type="button">
                ← Déplacer
              </button>
              <button className="rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50" onClick={() => moveSlot(selectedSlot.id, 1)} type="button">
                Déplacer →
              </button>
              <button className="rounded-2xl bg-navy-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-700" onClick={() => openEditForm(selectedSlot)} type="button">
                Modifier
              </button>
              <button className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-rose-500" onClick={() => deleteSlot(selectedSlot.id)} type="button">
                Supprimer
              </button>
            </div>
          </aside>
        )}
      </section>

      <AppModal
        open={showForm}
        onClose={() => setShowForm(false)}
        eyebrow={editingId ? 'Modifier' : 'Nouveau créneau'}
        title="Créneau planning"
        size="xl"
        zIndex={100}
        footer={(
          <AppModalFooter
            onClose={() => setShowForm(false)}
            submitForm="planning-slot-form"
            submitLabel="Enregistrer le créneau"
          />
        )}
      >
        <form id="planning-slot-form" className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveSlot}>
          <Select label="Élève" onChange={(value) => setForm((current) => ({ ...current, student: value }))} options={students} value={form.student} />
          <Field label="Date" onChange={(value) => setForm((current) => ({ ...current, date: value }))} type="date" value={form.date} />
          <Field label="Heure" onChange={(value) => setForm((current) => ({ ...current, start: value }))} type="time" value={form.start} />
          <Select label="Durée" onChange={(value) => setForm((current) => ({ ...current, duration: value }))} options={['30', '45', '60', '90', '120']} value={form.duration} />
          <Select label="Enseignant" onChange={(value) => setForm((current) => ({ ...current, teacher: value }))} options={teachers.slice(1)} value={form.teacher} />
          <Select label="Véhicule" onChange={(value) => setForm((current) => ({ ...current, vehicle: value }))} options={vehicles.slice(1)} value={form.vehicle} />
          <Select label="Catégorie" onChange={(value) => setForm((current) => ({ ...current, category: value }))} options={categories.slice(1)} value={form.category} />
          <Select label="État" onChange={(value) => setForm((current) => ({ ...current, status: value }))} options={['confirmé', 'annulé', 'en attente']} value={form.status} />
          <Field label="Type de rendez-vous" onChange={(value) => setForm((current) => ({ ...current, type: value }))} value={form.type} />
        </form>
      </AppModal>
    </div>
  )
}

function Kpi({ label, tone = 'cyan', value }) {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-cyan-600'
  return (
    <article className="rounded-[1.5rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </article>
  )
}

function Filter({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <select className="mt-1 min-h-11 w-full rounded-2xl border-2 border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function ResourceList({ items, title }) {
  return (
    <div className="rounded-[1.5rem] border-2 border-slate-300 bg-slate-50 p-4">
      <h3 className="font-extrabold text-slate-950">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <EmptyState
            title="Aucune donnée"
            message="Aucune donnée disponible pour le moment."
            icon="📭"
            className="bg-white"
          />
        ) : (
          items.map((item) => (
            <button className="w-full rounded-2xl bg-white px-3 py-2 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:bg-cyan-50" key={item} type="button">
              {item}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function Field({ label, onChange, type = 'text', value }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  )
}

function Select({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function formatDay(day) {
  if (!day.includes('-')) return day
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${day}T12:00:00`))
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function getWeekDays(date) {
  const start = new Date(date)
  const day = start.getDay() || 7
  start.setDate(start.getDate() - day + 1)

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start)
    next.setDate(start.getDate() + index)
    return toDateKey(next)
  })
}

function getMonthDays(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, index) =>
    toDateKey(new Date(year, month, index + 1, 12)),
  )
}

function getYearMonths(date) {
  const year = date.getFullYear()

  return Array.from({ length: 12 }, (_, index) => ({
    key: `${year}-${String(index + 1).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(year, index, 1)),
  }))
}

function getPeriodLabel(date, view) {
  if (view === 'jour') {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date)
  }

  if (view === 'semaine') {
    const days = getWeekDays(date)
    return `Semaine du ${formatDay(days[0])} au ${formatDay(days[6])}`
  }

  if (view === 'mois') {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date)
  }

  return String(date.getFullYear())
}

function calculateEndTime(start, duration) {
  const [hours, minutes] = start.split(':').map(Number)
  const date = new Date(2026, 0, 1, hours, minutes)
  date.setMinutes(date.getMinutes() + duration)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getDurationMinutes(start, end) {
  const [startHours, startMinutes] = start.split(':').map(Number)
  const [endHours, endMinutes] = end.split(':').map(Number)
  return endHours * 60 + endMinutes - (startHours * 60 + startMinutes)
}
