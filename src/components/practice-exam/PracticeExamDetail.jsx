import { Link } from 'react-router-dom'
import {
  ELIMINATORY_ERRORS,
  PRACTICE_EXAM_MAX_SCORE,
  PRACTICE_EXAM_SECTIONS,
  readinessEmoji,
  readinessLabel,
  resultLabel,
} from '../../data/practiceExamGrid'
import {
  determineReadinessLevel,
  estimateSuccessProbability,
} from '../../services/practiceExamScoring'
import { scoresArrayToMap } from '../../services/practiceExams'
import PracticeExamEvolutionChart from './PracticeExamEvolutionChart'

function eliminatoryLabel(id) {
  return ELIMINATORY_ERRORS.find((item) => item.id === id)?.label || id
}

export default function PracticeExamDetail({ exam, exams = [], remcValidatedCount = 0, showLessonLinks = false, readOnly = false }) {
  if (!exam) return null

  const scores = scoresArrayToMap(exam.item_scores || [])
  const report = exam.pedagogical_report || {}
  const readiness = determineReadinessLevel({
    scoreTotal: Number(exam.score_total),
    hasEliminatoryError: exam.has_eliminatory_error,
  })
  const probability = estimateSuccessProbability(exams, remcValidatedCount)

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">Examen blanc</p>
            {readOnly && (
              <p className="mt-1 text-xs font-semibold text-slate-400">Consultation — lecture seule</p>
            )}
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">
              {new Date(exam.exam_date).toLocaleDateString('fr-FR')} · {exam.score_total}/{PRACTICE_EXAM_MAX_SCORE}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {resultLabel(exam.result)}
              {exam.teacher?.full_name ? ` · ${exam.teacher.full_name}` : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            {readinessEmoji(readiness)} {readinessLabel(readiness)}
          </div>
        </div>
        {probability !== null && (
          <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
            Probabilité estimée de réussite : <strong>{probability} %</strong>
          </p>
        )}
      </section>

      {exams.length > 1 && <PracticeExamEvolutionChart exams={exams} />}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h4 className="text-lg font-semibold text-slate-950">Points forts</h4>
          <ul className="mt-3 space-y-2">
            {(report.strengths || []).map((item) => (
              <li className="text-sm font-semibold text-slate-700" key={item}>✅ {item}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
          <h4 className="text-lg font-semibold text-slate-950">Axes d&apos;amélioration</h4>
          <ul className="mt-3 space-y-2">
            {(report.weaknesses || []).map((item) => (
              <li className="text-sm font-semibold text-slate-700" key={item}>⚠ {item}</li>
            ))}
          </ul>
        </article>
      </section>

      {(report.recommendedLessons || []).length > 0 && showLessonLinks && (
        <section className="rounded-xl border border-blue-200 bg-white p-5">
          <h4 className="text-lg font-semibold text-slate-950">Leçons recommandées</h4>
          <div className="mt-3 grid gap-2">
            {report.recommendedLessons.map((lesson) => (
              <Link
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:border-blue-200 hover:bg-blue-50"
                key={lesson.moduleId}
                to={lesson.href}
              >
                ➡ Revoir la leçon : {lesson.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      {exam.has_eliminatory_error && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <h4 className="text-lg font-semibold text-rose-900">Erreurs éliminatoires</h4>
          <ul className="mt-3 space-y-2">
            {(exam.eliminatory_errors || []).map((id) => (
              <li className="text-sm font-semibold text-rose-800" key={id}>• {eliminatoryLabel(id)}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-slate-300 bg-white p-5">
        <h4 className="text-lg font-semibold text-slate-950">Grille détaillée</h4>
        <div className="mt-4 space-y-4">
          {PRACTICE_EXAM_SECTIONS.map((section) => (
            <div key={section.id}>
              <p className="text-sm font-semibold text-blue-800">{section.title}</p>
              <div className="mt-2 grid gap-2">
                {section.items.map((item) => (
                  <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm" key={item.id}>
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-semibold text-slate-900">{scores[item.id] || 'E'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {exam.comment && (
        <section className="rounded-xl border border-slate-300 bg-slate-50 p-5">
          <h4 className="text-lg font-semibold text-slate-950">Commentaire enseignant</h4>
          <p className="mt-3 text-sm leading-7 text-slate-700">{exam.comment}</p>
        </section>
      )}
    </div>
  )
}
