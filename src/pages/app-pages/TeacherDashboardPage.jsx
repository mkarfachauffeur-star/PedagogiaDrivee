import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageShell from '../../components/ui/PageShell'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { formatDate } from '../../lib/format'
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

  const show = (value) => (loading ? '…' : value)

  return (
    <PageShell>
      <PageHeader
        description="Vos élèves et leur préparation à l’épreuve pratique du permis."
        title="Tableau de bord"
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          accent="emerald"
          detail="Résultat favorable aux examens blancs"
          icon={CheckCircle2}
          label="Élèves prêts"
          value={show(stats?.readyCount ?? 0)}
        />
        <StatCard
          accent="rose"
          detail="À accompagner en priorité"
          icon={AlertTriangle}
          label="Élèves à risque"
          tone={stats?.riskCount ? 'danger' : 'default'}
          value={show(stats?.riskCount ?? 0)}
        />
        <StatCard
          accent="sky"
          detail="Sur l’ensemble des examens blancs"
          icon={BarChart3}
          label="Score moyen"
          value={show(stats?.average ? `${stats.average} / 31` : '—')}
        />
        <StatCard
          accent="violet"
          icon={ClipboardList}
          label="Examens blancs passés"
          value={show(stats?.totalExams ?? 0)}
        />
      </section>

      <section className={`${ui.card} ${ui.cardBody}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={ui.sectionTitle}>Derniers examens blancs</h2>
            <p className={ui.sectionText}>Les dernières épreuves simulées de vos élèves.</p>
          </div>
          <Link className={ui.btnSecondary} to="/teacher/students">
            Gérer les examens blancs
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Chargement…</p>
        ) : !stats?.recent?.length ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            Aucun examen blanc enregistré pour le moment.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {stats.recent.map((exam) => (
              <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={exam.id}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{formatPersonName(exam.student)}</p>
                  <p className="text-sm text-slate-500">
                    {formatDate(exam.exam_date)} · {exam.score_total} / 31 · {resultLabel(exam.result)}
                  </p>
                </div>
                {exam.has_eliminatory_error && <StatusBadge tone="danger">Erreur éliminatoire</StatusBadge>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
