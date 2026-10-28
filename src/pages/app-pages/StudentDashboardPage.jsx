import { createElement, useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, ChevronRight, Clock, ClipboardCheck, Hourglass, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageShell from '../../components/ui/PageShell'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { ui } from '../../components/ui/styles'
import { navigationIconFor } from '../../config/navigationIcons'
import { formatDate } from '../../lib/format'
import RemcProgressOverview from '../../components/remc/RemcProgressOverview'
import { useAuth } from '../../context/AuthContext'
import { useRemcUnlock } from '../../hooks/useRemcUnlock'
import { useStudentTrack } from '../../hooks/useStudentTrack'
import { getStudentNavItems } from '../../config/navigation'
import {
  getStudentHoursSummary,
} from '../../services/initialAssessment'
import { listPracticeExamsForStudent } from '../../services/practiceExams'
import {
  computeStudentPracticeExamStats,
  estimateSuccessProbability,
} from '../../services/practiceExamScoring'
import { supabase } from '../../lib/supabase'

export default function StudentDashboardPage() {
  const { profile, profileId } = useAuth()
  const { student, track, isPermisB, loading: trackLoading } = useStudentTrack(profileId)
  const { studentId, unlockState, globalProgress, itemProgress, isCompetencyValidated, loading: remcLoading } = useRemcUnlock(profileId)
  const [teacherName, setTeacherName] = useState('non assigné')
  const [hoursSummary, setHoursSummary] = useState(null)
  const [practiceExamStats, setPracticeExamStats] = useState(null)
  const [practiceExams, setPracticeExams] = useState([])

  useEffect(() => {
    if (!student?.id) return
    getStudentHoursSummary(student.id).then(setHoursSummary)
  }, [student?.id])

  useEffect(() => {
    if (!profileId) return
    supabase
      .from('students')
      .select(`
        student_assignments(is_referent, teacher:teacher_id(full_name))
      `)
      .eq('profile_id', profileId)
      .maybeSingle()
      .then(async ({ data }) => {
        const referent = data?.student_assignments?.find((row) => row.is_referent)?.teacher
        if (referent?.full_name) {
          setTeacherName(referent.full_name)
          return
        }
        // Repli : l'enseignant de la dernière leçon programmée.
        const { data: lastLesson } = await supabase
          .from('appointments')
          .select('teacher:teacher_id(full_name)')
          .not('teacher_id', 'is', null)
          .order('starts_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        setTeacherName(lastLesson?.teacher?.full_name || 'non assigné')
      })
  }, [profileId])

  useEffect(() => {
    const resolvedId = studentId || student?.id
    if (!resolvedId || !isPermisB) {
      setPracticeExams([])
      setPracticeExamStats(null)
      return
    }
    listPracticeExamsForStudent(resolvedId).then(({ exams }) => {
      setPracticeExams(exams)
      setPracticeExamStats(computeStudentPracticeExamStats(exams))
    })
  }, [studentId, student?.id, isPermisB])

  const firstName = useMemo(() => {
    const fromStudent = student?.first_name?.trim()
    if (fromStudent) return fromStudent
    return profile?.full_name?.trim().split(/\s+/)[0] || ''
  }, [student, profile])

  const navLinks = getStudentNavItems(track, student).filter((item) => item.href !== '/student/dashboard')
  const assessment = hoursSummary?.assessment
  const assessmentDone = assessment?.status === 'completed'
  const remcValidatedCount = ['C1', 'C2', 'C3', 'C4'].filter((code) => isCompetencyValidated(code)).length
  const practiceExamProbability = estimateSuccessProbability(practiceExams, remcValidatedCount)

  if (trackLoading || remcLoading) {
    return (
      <PageShell>
        <EmptyState icon="⏳" title="Chargement" message="Récupération de vos données pédagogiques…" />
      </PageShell>
    )
  }

  const hasTeacher = teacherName && teacherName !== 'non assigné'

  return (
    <PageShell>
      <PageHeader
        description={hasTeacher ? `Votre enseignant référent : ${teacherName}.` : 'Votre enseignant référent n’est pas encore désigné.'}
        title={firstName ? `Bonjour ${firstName}` : 'Bonjour'}
      />

      {isPermisB ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              accent={assessmentDone ? 'emerald' : 'amber'}
              detail={assessmentDone && assessment?.completed_at ? `Le ${formatDate(assessment.completed_at)}` : 'Lors de votre première heure de conduite'}
              icon={ClipboardCheck}
              label="Évaluation de départ"
              value={assessmentDone ? 'Réalisée' : 'À venir'}
            />
            <StatCard
              accent="sky"
              detail="Préconisées par l’évaluation"
              icon={Target}
              label="Heures recommandées"
              value={hoursSummary?.recommendedHours ? `${hoursSummary.recommendedHours} h` : '—'}
            />
            <StatCard
              accent="emerald"
              detail="Leçons de conduite réalisées"
              icon={CheckCircle2}
              label="Heures effectuées"
              value={`${hoursSummary?.completedHours ?? 0} h`}
            />
            <StatCard
              accent="violet"
              detail={
                hoursSummary?.acceptedTargetHours != null
                  ? `Sur ${hoursSummary.acceptedTargetHours} h préconisées`
                  : assessmentDone && assessment?.recommended_hours_response === 'pending'
                    ? 'Acceptez la proposition pour activer le suivi'
                    : null
              }
              icon={Hourglass}
              label="Heures restantes"
              value={hoursSummary?.remainingHours != null ? `${hoursSummary.remainingHours} h` : '—'}
            />
          </section>

          {!assessmentDone && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Votre évaluation de départ sera réalisée par votre enseignant lors de la première heure de conduite.
              <Link className="ml-2 font-medium underline" to="/student/initial-assessment">
                En savoir plus
              </Link>
            </p>
          )}

          {unlockState && (
            <RemcProgressOverview
              globalProgress={globalProgress}
              itemProgress={itemProgress}
              unlockState={unlockState}
            />
          )}

          {practiceExamStats?.count > 0 && (
            <section className={`${ui.card} ${ui.cardBody}`}>
              <h2 className={ui.sectionTitle}>Examens blancs</h2>
              <p className={ui.sectionText}>Votre préparation à l’épreuve pratique du permis.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Dernier score" value={`${practiceExamStats.lastScore} / 31`} />
                <StatCard label="Meilleur score" value={`${practiceExamStats.bestScore} / 31`} />
                <StatCard label="Examens blancs passés" value={practiceExamStats.count} />
                <StatCard
                  label="Chances de réussite estimées"
                  value={practiceExamProbability != null ? `${practiceExamProbability} %` : '—'}
                />
              </div>
            </section>
          )}
        </>
      ) : (
        <Link className={`${ui.card} flex items-center justify-between gap-4 p-5 transition hover:border-slate-300`} to="/student/next-lesson">
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-[#1769FF]">
              <CalendarClock className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-medium text-slate-500">Prochaine leçon</span>
              <span className="block text-base font-semibold text-slate-900">Voir le détail</span>
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="h-5 w-5 text-slate-400" />
        </Link>
      )}

      <section>
        <h2 className={ui.sectionTitle}>Accès rapide</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navLinks.map((link) => {
            const Icon = navigationIconFor(link.href) || Clock
            return (
              <Link className={`${ui.card} group flex items-center gap-3 p-4 transition hover:border-slate-300`} key={link.href} to={link.href}>
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-[#1769FF]">
                  {createElement(Icon, { className: 'h-4 w-4' })}
                </span>
                <span className="flex-1 text-sm font-medium text-slate-900">{link.label}</span>
                <ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-400" />
              </Link>
            )
          })}
        </div>
      </section>
    </PageShell>
  )
}
