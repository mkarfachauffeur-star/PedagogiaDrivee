import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../../components/ui/PageShell'
import EmptyState from '../../components/ui/EmptyState'
import RemcProgressOverview from '../../components/remc/RemcProgressOverview'
import { useAuth } from '../../context/AuthContext'
import { useRemcUnlock } from '../../hooks/useRemcUnlock'
import { useStudentTrack } from '../../hooks/useStudentTrack'
import { getStudentNavItems } from '../../config/navigation'
import { getTrackLabel } from '../../lib/studentTrack'
import {
  getStudentHoursSummary,
} from '../../services/initialAssessment'
import { listPracticeExamsForStudent } from '../../services/practiceExams'
import {
  computeStudentPracticeExamStats,
  estimateSuccessProbability,
} from '../../services/practiceExamScoring'
import { supabase } from '../../lib/supabase'

function formatDateFr(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return '—'
  }
}

function StatCard({ detail, label, value }) {
  return (
    <article className="rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-2xl font-black text-slate-950">{value}</p>
        {detail ? <p className="text-sm font-semibold text-slate-500">{detail}</p> : null}
      </div>
    </article>
  )
}

export default function StudentDashboardPage() {
  const { profile, profileId, user } = useAuth()
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

  useEffect(() => {
    if (!trackLoading && !remcLoading) {
      console.info('[StudentDashboard] Chargement terminé', {
        userId: user?.id ?? profileId,
        userEmail: user?.email ?? profile?.email ?? null,
        profile,
        student,
        track,
        remcStudentId: studentId,
      })
    }
  }, [user, profileId, profile, student, track, studentId, trackLoading, remcLoading])

  const displayName = useMemo(() => {
    const fromStudent = [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim()
    if (fromStudent) return fromStudent
    if (profile?.full_name?.trim()) return profile.full_name.trim()
    return 'Élève'
  }, [student, profile])

  const formationName = student?.package_name || student?.formation_type || ''
  const identityLine = [...new Set([getTrackLabel(track), formationName, student?.status].filter(Boolean))].join(' · ')
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

  return (
    <PageShell>
      <section className="pd-section-card">
        <div className="grid gap-6 bg-gradient-to-br from-navy-950 via-navy-900 to-cyan-900 p-6 text-white md:grid-cols-[1fr_280px] md:p-8">
          <div>
            <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-sm font-semibold text-cyan-100">
              {getTrackLabel(track)}
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Bonjour {displayName}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-cyan-50/85">
              {identityLine} · Moniteur {teacherName}
            </p>
          </div>
          {isPermisB ? (
            <aside className="rounded-[1.5rem] border border-white/15 bg-white p-5 text-slate-900 shadow-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Progression REMC</p>
              <p className="mt-1 text-5xl font-black text-cyan-600">{globalProgress}%</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>
            </aside>
          ) : (
            <aside className="rounded-[1.5rem] border border-white/15 bg-white p-5 text-slate-900 shadow-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Prochaine leçon</p>
              <p className="mt-2 text-lg font-black text-slate-900">À venir</p>
              <Link className="mt-4 inline-flex text-sm font-bold text-cyan-700" to="/student/next-lesson">
                Voir le détail →
              </Link>
            </aside>
          )}
        </div>
      </section>

      {isPermisB && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              detail={
                assessmentDone && assessment?.completed_at
                  ? `· ${formatDateFr(assessment.completed_at)}`
                  : null
              }
              label="Évaluation de départ"
              value={assessmentDone ? 'Oui' : 'Non'}
            />
            <StatCard
              label="Recommandées"
              value={hoursSummary?.recommendedHours ? `${hoursSummary.recommendedHours} h` : '—'}
            />
            <StatCard label="Effectuées" value={`${hoursSummary?.completedHours ?? 0} h`} />
            <StatCard
              detail={
                hoursSummary?.acceptedTargetHours != null
                  ? `Sur ${hoursSummary.acceptedTargetHours} h préconisées`
                  : assessmentDone && assessment?.recommended_hours_response === 'pending'
                    ? 'Acceptez la proposition pour activer le suivi'
                    : null
              }
              label="Restantes"
              value={
                hoursSummary?.remainingHours != null ? `${hoursSummary.remainingHours} h` : '—'
              }
            />
          </section>

          {!assessmentDone && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Votre évaluation de départ sera réalisée par votre enseignant lors de la première heure de conduite.
              <Link className="ml-2 font-black text-amber-950 underline" to="/student/initial-assessment">
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
            <section className="pd-section-card pd-section-card-body">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-cyan-700">Examen blanc</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">Préparation à l&apos;épreuve pratique</h2>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Dernier score', value: `${practiceExamStats.lastScore}/31` },
                  { label: 'Meilleur score', value: `${practiceExamStats.bestScore}/31` },
                  { label: 'Examens blancs', value: practiceExamStats.count },
                  {
                    label: 'Probabilité estimée',
                    value: practiceExamProbability != null ? `${practiceExamProbability} %` : '—',
                  },
                ].map((item) => (
                  <article className="card-muted" key={item.label}>
                    <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {navLinks.map((link) => (
          <Link className="group card-tile" key={link.href} to={link.href}>
            <p className="text-base font-black text-slate-950 group-hover:text-cyan-800">{link.label}</p>
          </Link>
        ))}
      </section>
    </PageShell>
  )
}
