import { useEffect, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import PageHero from '../../components/ui/PageHero'
import PageShell from '../../components/ui/PageShell'
import { useAuth } from '../../context/AuthContext'
import { useStudentTrack } from '../../hooks/useStudentTrack'
import { listLessonObservationsForStudent } from '../../services/studentLessonObservations'

function formatDateFr(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return value
  }
}

export default function StudentObservationsPage() {
  const { profileId } = useAuth()
  const { student, loading: trackLoading } = useStudentTrack(profileId)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student?.id) {
      setLessons([])
      setLoading(false)
      return
    }
    setLoading(true)
    listLessonObservationsForStudent(student.id).then(({ lessons: rows }) => {
      setLessons(rows)
      setLoading(false)
    })
  }, [student?.id])

  if (trackLoading || loading) {
    return (
      <PageShell>
        <p className="text-sm font-semibold text-slate-500">Chargement des observations…</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Espace élève"
        subtitle="Retours pédagogiques et points de vigilance partagés par votre enseignant."
        title="Observations"
      />

      {lessons.length === 0 ? (
        <EmptyState
          icon="💬"
          message="Aucune observation partagée pour le moment. Votre enseignant peut rendre une leçon visible en activant « Partagé »."
          title="Observations"
        />
      ) : (
        <section className="grid gap-4">
          {lessons.map((lesson) => (
            <article className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm" key={lesson.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-blue-700">Leçon partagée</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {lesson.date ? `Le ${formatDateFr(lesson.date)}` : 'Leçon'}
                    {lesson.time ? ` · ${lesson.time}` : ''}
                  </h2>
                  {lesson.teacherName && (
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Enseignant : {lesson.teacherName}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {lesson.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-700">
                {lesson.observations || 'Aucune observation.'}
              </p>
              {lesson.skills?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {lesson.skills.map((skill) => (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </PageShell>
  )
}
