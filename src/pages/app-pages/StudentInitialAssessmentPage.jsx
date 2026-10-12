import { useEffect, useMemo, useState } from 'react'
import InitialAssessmentStudentResults from '../../components/initial-assessment/InitialAssessmentStudentResults'
import EmptyState from '../../components/ui/EmptyState'
import PageHero from '../../components/ui/PageHero'
import PageShell from '../../components/ui/PageShell'
import { useAuth } from '../../context/AuthContext'
import { useStudentTrack } from '../../hooks/useStudentTrack'
import {
  formatRecommendedHours,
  normalizeInitialAssessment,
  toDisplayText,
} from '../../lib/initialAssessmentUtils'
import {
  formatAssessmentStatus,
  getInitialAssessmentForStudent,
} from '../../services/initialAssessment'

function formatDateFr(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return '—'
  }
}

export default function StudentInitialAssessmentPage() {
  const { profileId } = useAuth()
  const { student, isPermisB, loading: trackLoading } = useStudentTrack(profileId)
  const [assessment, setAssessment] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!student?.id) {
      setAssessment(null)
      setFetchError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getInitialAssessmentForStudent(student.id).then(({ assessment: row, error }) => {
      setAssessment(normalizeInitialAssessment(row))
      setFetchError(error ? toDisplayText(error.message, 'Erreur de chargement') : null)
      setLoading(false)
    })
  }, [student?.id])

  const statCards = useMemo(() => {
    const completed = assessment?.status === 'completed'
    return [
      { label: 'Statut', value: formatAssessmentStatus(assessment?.status || 'pending') },
      ...(completed ? [
        { label: 'Date de réalisation', value: formatDateFr(assessment?.completed_at) },
        { label: 'Heures préconisées', value: formatRecommendedHours(assessment) },
        ...(assessment?.teacherName ? [{ label: 'Enseignant', value: assessment.teacherName }] : []),
      ] : []),
    ]
  }, [assessment])

  if (trackLoading || loading) {
    return (
      <PageShell>
        <p className="text-sm font-semibold text-slate-500">Chargement de votre évaluation…</p>
      </PageShell>
    )
  }

  if (!isPermisB) {
    return (
      <PageShell>
        <EmptyState
          icon="🏍️"
          message="L'évaluation de départ concerne uniquement les parcours Permis B."
          title="Rubrique non disponible"
        />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Permis B"
        subtitle="Consultez les résultats de votre évaluation de départ, le commentaire de votre enseignant et le volume horaire préconisé."
        title="Mon évaluation de départ"
      />

      {fetchError && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {fetchError}
        </p>
      )}

      {statCards.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((item) => (
            <article className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm" key={item.label}>
              <p className="text-sm font-semibold text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-black text-slate-950">{toDisplayText(item.value)}</p>
            </article>
          ))}
        </section>
      )}

      <InitialAssessmentStudentResults
        assessment={assessment}
        onAssessmentChange={(saved) => setAssessment(normalizeInitialAssessment(saved))}
      />
    </PageShell>
  )
}
