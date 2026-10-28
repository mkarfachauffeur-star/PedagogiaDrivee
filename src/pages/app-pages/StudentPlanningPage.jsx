import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import PageShell from '../../components/ui/PageShell'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

function AppointmentRow({ appointment }) {
  const start = new Date(appointment.starts_at)
  const end = new Date(start.getTime() + Number(appointment.duration_minutes || 60) * 60000)
  return (
    <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm font-semibold text-slate-900">{capitalize(dateFormatter.format(start))}</p>
      <p className="mt-0.5 text-sm text-slate-700">
        {timeFormatter.format(start)} – {timeFormatter.format(end)} · {appointment.kind || 'Leçon'}
        {appointment.teacher?.full_name ? ` avec ${appointment.teacher.full_name}` : ''}
      </p>
      {appointment.notes && <p className="mt-1 text-sm text-slate-500">{appointment.notes}</p>}
      <p className="mt-1 text-xs font-semibold text-slate-500">{appointment.status}</p>
    </li>
  )
}

export default function StudentPlanningPage() {
  const { profileId } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now] = useState(() => Date.now())

  useEffect(() => {
    if (!profileId) return undefined
    let cancelled = false
    ;(async () => {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profileId)
        .maybeSingle()
      if (!student?.id) {
        if (!cancelled) setLoading(false)
        return
      }
      const { data, error: loadError } = await supabase
        .from('appointments')
        .select('id, kind, starts_at, duration_minutes, status, notes, teacher:teacher_id(full_name)')
        .eq('student_id', student.id)
        .neq('status', 'Annulé')
        .order('starts_at', { ascending: true })
      if (cancelled) return
      if (loadError) setError('Le planning n’a pas pu être chargé. Réessayez plus tard.')
      setAppointments(data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [profileId])

  const { upcoming, past } = useMemo(() => {
    return {
      upcoming: appointments.filter((row) => new Date(row.starts_at).getTime() >= now),
      past: appointments.filter((row) => new Date(row.starts_at).getTime() < now).reverse(),
    }
  }, [appointments, now])

  return (
    <PageShell>
      <PageHeader description="Vos leçons à venir et passées avec votre enseignant." title="Planning" />
      <section className="pd-section-card pd-section-card-body space-y-6">
        {loading ? (
          <p className="text-sm text-slate-500">Chargement du planning…</p>
        ) : error ? (
          <p className="text-sm font-semibold text-red-700">{error}</p>
        ) : appointments.length === 0 ? (
          <EmptyState icon="📅" message="Vos prochaines leçons et rendez-vous apparaîtront ici." title="Planning" />
        ) : (
          <>
            <div>
              <h2 className="text-base font-semibold text-slate-900">À venir</h2>
              {upcoming.length ? (
                <ul className="mt-3 space-y-2">
                  {upcoming.map((row) => <AppointmentRow appointment={row} key={row.id} />)}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Aucune séance programmée pour le moment.</p>
              )}
            </div>
            {past.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-slate-900">Séances passées</h2>
                <ul className="mt-3 space-y-2">
                  {past.map((row) => <AppointmentRow appointment={row} key={row.id} />)}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </PageShell>
  )
}
