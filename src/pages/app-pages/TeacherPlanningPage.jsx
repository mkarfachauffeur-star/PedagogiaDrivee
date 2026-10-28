import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import PageShell from '../../components/ui/PageShell'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { useAuth } from '../../context/AuthContext'
import { listAppointments } from '../../services/appointments'

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

const STATUS_TONES = {
  Planifié: 'info',
  Confirmé: 'success',
  Terminé: 'neutral',
  Réalisé: 'neutral',
  Annulé: 'danger',
}

function startOfDay(date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(date, days) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Lundi de la semaine contenant `date`. */
function startOfWeek(date) {
  const day = startOfDay(date)
  return addDays(day, -((day.getDay() + 6) % 7))
}

/** AAAA-MM-JJ dans le fuseau du navigateur. */
function toIsoDay(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function formatHours(minutes) {
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace('.', ',')} h`
}

function isCancelled(appointment) {
  return appointment.status === 'Annulé'
}

function AppointmentItem({ appointment }) {
  const start = new Date(appointment.starts_at)
  const end = new Date(start.getTime() + Number(appointment.duration_minutes || 60) * 60000)

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="w-24 shrink-0 text-sm font-medium tabular-nums text-slate-900">
          {timeFormatter.format(start)} – {timeFormatter.format(end)}
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-medium ${isCancelled(appointment) ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
            {appointment.kind || 'Leçon'} · {appointment.studentLabel}
          </p>
          {appointment.notes ? <p className="mt-0.5 text-sm text-slate-500">{appointment.notes}</p> : null}
          {appointment.vehicle ? <p className="mt-0.5 text-xs text-slate-500">{appointment.vehicleLabel}</p> : null}
        </div>
      </div>
      {appointment.status ? (
        <span className="pl-27 sm:pl-0">
          <StatusBadge tone={STATUS_TONES[appointment.status] || 'neutral'}>{appointment.status}</StatusBadge>
        </span>
      ) : null}
    </li>
  )
}

export default function TeacherPlanningPage() {
  const { profileId } = useAuth()
  const [period, setPeriod] = useState('semaine')
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()))
  const [result, setResult] = useState({ key: '', appointments: [], error: null })
  const [now] = useState(() => Date.now())

  const rangeStart = period === 'semaine' ? startOfWeek(anchor) : anchor
  const rangeEnd = period === 'semaine' ? addDays(rangeStart, 6) : anchor
  const dateFrom = toIsoDay(rangeStart)
  const dateTo = toIsoDay(rangeEnd)
  const requestKey = `${profileId}|${dateFrom}|${dateTo}`

  useEffect(() => {
    if (!profileId) return undefined
    let cancelled = false
    // Le serveur compare en UTC : on élargit d'un jour, puis on garde les leçons du jour local.
    listAppointments({
      dateFrom: toIsoDay(addDays(new Date(`${dateFrom}T12:00:00`), -1)),
      dateTo: toIsoDay(addDays(new Date(`${dateTo}T12:00:00`), 1)),
      teacherId: profileId,
    }).then(({ appointments, error }) => {
      if (cancelled) return
      const inRange = appointments.filter((row) => {
        const day = toIsoDay(new Date(row.starts_at))
        return day >= dateFrom && day <= dateTo
      })
      setResult({ key: requestKey, appointments: inRange, error })
    })
    return () => {
      cancelled = true
    }
  }, [profileId, dateFrom, dateTo, requestKey])

  const loading = result.key !== requestKey
  const appointments = useMemo(() => (loading ? [] : result.appointments), [loading, result.appointments])

  const { days, activeMinutes, activeCount, nextAppointment } = useMemo(() => {
    const byDay = new Map()
    let minutes = 0
    let count = 0
    let next = null
    for (const appointment of appointments) {
      const key = toIsoDay(new Date(appointment.starts_at))
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key).push(appointment)
      if (!isCancelled(appointment)) {
        minutes += Number(appointment.duration_minutes || 60)
        count += 1
        if (!next && new Date(appointment.starts_at).getTime() >= now) next = appointment
      }
    }
    return {
      days: [...byDay.entries()].map(([key, items]) => ({
        key,
        date: new Date(`${key}T12:00:00`),
        items,
        minutes: items.filter((item) => !isCancelled(item)).reduce((sum, item) => sum + Number(item.duration_minutes || 60), 0),
      })),
      activeMinutes: minutes,
      activeCount: count,
      nextAppointment: next,
    }
  }, [appointments, now])

  const step = period === 'semaine' ? 7 : 1
  const periodLabel =
    period === 'semaine'
      ? `Semaine du ${shortFormatter.format(rangeStart)} au ${shortFormatter.format(rangeEnd)}`
      : capitalize(dayFormatter.format(anchor))
  const scopeLabel = period === 'semaine' ? 'cette semaine' : 'ce jour'

  const toggleClass = (active) =>
    `inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition ${
      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
    }`

  return (
    <PageShell>
      <PageHeader description="Vos leçons, jour par jour ou semaine par semaine." title="Mon planning" />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          accent="blue"
          icon={Clock}
          label="Heures de conduite"
          value={loading ? '…' : formatHours(activeMinutes)}
          detail={capitalize(scopeLabel)}
        />
        <StatCard
          accent="emerald"
          icon={CalendarDays}
          label="Leçons"
          value={loading ? '…' : activeCount}
          detail={`Hors annulations, ${scopeLabel}`}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            accent="violet"
            icon={CalendarClock}
            label="Prochaine leçon"
            value={
              loading ? '…' : nextAppointment ? timeFormatter.format(new Date(nextAppointment.starts_at)) : '—'
            }
            detail={
              nextAppointment
                ? `${capitalize(dayFormatter.format(new Date(nextAppointment.starts_at)))} · ${nextAppointment.studentLabel}`
                : `Aucune leçon à venir ${scopeLabel}`
            }
          />
        </div>
      </section>

      <section className={`${ui.card} ${ui.cardBody}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              aria-label={period === 'semaine' ? 'Semaine précédente' : 'Jour précédent'}
              className={ui.btnSmall}
              onClick={() => setAnchor((current) => addDays(current, -step))}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label={period === 'semaine' ? 'Semaine suivante' : 'Jour suivant'}
              className={ui.btnSmall}
              onClick={() => setAnchor((current) => addDays(current, step))}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className={`${ui.sectionTitle} ml-1`}>{periodLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className={ui.btnSmall} onClick={() => setAnchor(startOfDay(new Date()))} type="button">
              Aujourd’hui
            </button>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Affichage">
              <button aria-pressed={period === 'jour'} className={toggleClass(period === 'jour')} onClick={() => setPeriod('jour')} type="button">
                Jour
              </button>
              <button aria-pressed={period === 'semaine'} className={toggleClass(period === 'semaine')} onClick={() => setPeriod('semaine')} type="button">
                Semaine
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <p className="text-sm text-slate-500">Chargement du planning…</p>
          ) : result.error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Le planning n’a pas pu être chargé. Réessayez dans un instant.
            </p>
          ) : days.length === 0 ? (
            <EmptyState icon="📅" message={`Aucune leçon programmée ${scopeLabel}.`} title="Aucune leçon" />
          ) : (
            <div className="space-y-4">
              {days.map((day) => (
                <section key={day.key}>
                  {period === 'semaine' ? (
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">{capitalize(dayFormatter.format(day.date))}</h3>
                      <span className="text-xs text-slate-500">{formatHours(day.minutes)} de conduite</span>
                    </div>
                  ) : null}
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {day.items.map((appointment) => (
                      <AppointmentItem appointment={appointment} key={appointment.id} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  )
}
