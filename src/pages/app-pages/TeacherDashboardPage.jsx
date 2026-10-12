import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../../components/ui/PageShell'
import PageHero from '../../components/ui/PageHero'
import { resultLabel } from '../../data/practiceExamGrid'
import { useAuth } from '../../context/AuthContext'
import { listPracticeExamsForOrganization } from '../../services/practiceExams'
import { computeTeacherPracticeExamStats } from '../../services/practiceExamScoring'
import { listStudents } from '../../services/students'
import { formatPersonName } from '../../lib/staffAccounts'

export default function TeacherDashboardPage() {
  const { profileId } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [{ exams }, { students }] = await Promise.all([
      listPracticeExamsForOrganization(),
      listStudents(),
    ])
    setStats(computeTeacherPracticeExamStats(exams, students))
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <PageShell>
      <PageHero
        eyebrow="Espace enseignant"
        subtitle="Vue d'ensemble de vos élèves, examens blancs et préparation à l'épreuve pratique."
        title="Tableau de bord"
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Élèves prêts', value: stats?.readyCount ?? 0 },
          { label: 'Élèves à risque', value: stats?.riskCount ?? 0 },
          { label: 'Moyenne examens blancs', value: stats?.average ?? 0 },
          { label: 'Examens enregistrés', value: stats?.totalExams ?? 0 },
        ].map((item) => (
          <article className="card-panel" key={item.label}>
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {loading ? '…' : item.value}
              {item.label.includes('Moyenne') ? '/31' : ''}
            </p>
          </article>
        ))}
      </section>

      <section className="card-panel-lg">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Derniers examens blancs</h2>
            <p className="mt-1 text-sm text-slate-500">Suivi rapide des dernières épreuves simulées.</p>
          </div>
          <Link
            className="rounded-xl bg-navy-950 px-4 py-2 text-sm font-extrabold text-white"
            to="/teacher/students"
          >
            Gérer les examens blancs
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm font-semibold text-slate-500">Chargement…</p>
        ) : !stats?.recent?.length ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm font-semibold text-slate-500">
            Aucun examen blanc enregistré pour le moment.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {stats.recent.map((exam) => (
              <article className="card-muted flex flex-wrap items-center justify-between gap-3" key={exam.id}>
                <div>
                  <p className="font-extrabold text-slate-900">
                    {formatPersonName(exam.student)}
                  </p>
                  <p className="text-sm text-slate-600">
                    {new Date(exam.exam_date).toLocaleDateString('fr-FR')} · {exam.score_total}/31 · {resultLabel(exam.result)}
                  </p>
                </div>
                {exam.has_eliminatory_error && (
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800">
                    Erreur éliminatoire
                  </span>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  )
}
