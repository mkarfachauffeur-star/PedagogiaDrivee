import { useCallback, useEffect, useMemo, useState } from 'react'
import PageShell from '../../components/ui/PageShell'
import PageHero from '../../components/ui/PageHero'
import EmptyState from '../../components/ui/EmptyState'
import PracticeExamDetail from '../../components/practice-exam/PracticeExamDetail'
import PracticeExamEvolutionChart from '../../components/practice-exam/PracticeExamEvolutionChart'
import { readinessEmoji, readinessLabel } from '../../data/practiceExamGrid'
import { useAuth } from '../../context/AuthContext'
import { useRemcUnlock } from '../../hooks/useRemcUnlock'
import { listPracticeExamsForStudent } from '../../services/practiceExams'
import {
  computeStudentPracticeExamStats,
  determineReadinessLevel,
  estimateSuccessProbability,
} from '../../services/practiceExamScoring'
import { resolveStudentRecordId } from '../../services/remcProgress'

export default function StudentPracticeExamsPage() {
  const { profileId } = useAuth()
  const { studentId, isCompetencyValidated } = useRemcUnlock(profileId)
  const [resolvedStudentId, setResolvedStudentId] = useState(studentId)
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedExamId, setSelectedExamId] = useState(null)

  useEffect(() => {
    if (studentId) {
      setResolvedStudentId(studentId)
      return
    }
    resolveStudentRecordId(profileId).then(setResolvedStudentId)
  }, [studentId, profileId])

  const refresh = useCallback(async () => {
    if (!resolvedStudentId) {
      setExams([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { exams: rows } = await listPracticeExamsForStudent(resolvedStudentId)
    setExams(rows)
    setSelectedExamId(rows[0]?.id || null)
    setLoading(false)
  }, [resolvedStudentId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const stats = useMemo(() => computeStudentPracticeExamStats(exams), [exams])
  const remcValidatedCount = ['C1', 'C2', 'C3', 'C4'].filter((code) => isCompetencyValidated(code)).length
  const latestExam = exams[0]
  const readiness = latestExam
    ? determineReadinessLevel({
        scoreTotal: Number(latestExam.score_total),
        hasEliminatoryError: latestExam.has_eliminatory_error,
      })
    : 'insufficient'
  const probability = estimateSuccessProbability(exams, remcValidatedCount)
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) || exams[0]

  return (
    <PageShell>
      <PageHero
        eyebrow="Examen blanc permis B"
        subtitle="Consultez vos examens blancs, votre progression et le bilan pédagogique généré après chaque épreuve."
        title="Examens blancs"
      />

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Chargement de vos examens blancs…</p>
      ) : exams.length === 0 ? (
        <section className="pd-section-card pd-section-card-body">
          <EmptyState
            icon="🎯"
            message="Votre enseignant enregistrera ici vos examens blancs après chaque épreuve pratique simulée."
            title="Aucun examen blanc pour le moment"
          />
        </section>
      ) : (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Dernier score', value: stats.lastScore != null ? `${stats.lastScore}/31` : '—' },
              { label: 'Meilleur score', value: stats.bestScore != null ? `${stats.bestScore}/31` : '—' },
              { label: 'Examens réalisés', value: stats.count },
              { label: 'Progression', value: `${stats.progressionRate >= 0 ? '+' : ''}${stats.progressionRate} %` },
            ].map((item) => (
              <article className="card-panel" key={item.label}>
                <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{item.value}</p>
              </article>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-5">
              <p className="text-sm font-semibold text-blue-700">Préparation à l&apos;examen</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {readinessEmoji(readiness)} {readinessLabel(readiness)}
              </p>
              {probability !== null && (
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Probabilité estimée de réussite : <strong>{probability} %</strong>
                </p>
              )}
              {stats.nextSuggestedDate && (
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  Prochain examen blanc conseillé : {new Date(stats.nextSuggestedDate).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
            <PracticeExamEvolutionChart exams={exams} />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="card-panel">
              <h2 className="text-lg font-semibold text-slate-900">Historique</h2>
              <div className="mt-4 grid gap-2">
                {exams.map((exam) => (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selectedExam?.id === exam.id
                        ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-200'
                    }`}
                    key={exam.id}
                    onClick={() => setSelectedExamId(exam.id)}
                    type="button"
                  >
                    <p className="font-semibold text-slate-900">
                      {new Date(exam.exam_date).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{exam.score_total}/31</p>
                  </button>
                ))}
              </div>
            </aside>

            <div className="card-panel-lg">
              {selectedExam ? (
                <PracticeExamDetail
                  exam={selectedExam}
                  exams={exams}
                  readOnly
                  remcValidatedCount={remcValidatedCount}
                  showLessonLinks
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
