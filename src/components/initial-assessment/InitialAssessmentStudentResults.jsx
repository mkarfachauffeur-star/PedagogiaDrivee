import { useMemo, useState } from 'react'
import EmptyState from '../ui/EmptyState'
import HoursProposalStatusBadge from './HoursProposalStatusBadge'
import {
  FSB_OPTIONS,
  ASSESSMENT_MODULES,
  computeAssessmentScores,
} from '../../data/initialAssessmentForm'
import {
  formatRecommendedHours,
  getHoursProposalStatus,
  toDisplayText,
} from '../../lib/initialAssessmentUtils'
import { formatAssessmentStatus, respondToRecommendedHours } from '../../services/initialAssessment'

function formatDateFr(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return '—'
  }
}

function formatRatingValue(value) {
  if (!value) return '—'
  const entry = FSB_OPTIONS.find((option) => option.value === value)
  return entry ? `${entry.value} — ${entry.label.split(' — ')[1] || entry.label}` : value
}

export default function InitialAssessmentStudentResults({ assessment, onAssessmentChange }) {
  const [responding, setResponding] = useState(false)
  const [responseError, setResponseError] = useState(null)
  const completed = assessment?.status === 'completed'
  const answers = assessment?.answers || {}
  const proposalStatus = getHoursProposalStatus(assessment)

  const scores = useMemo(
    () => (completed ? computeAssessmentScores(answers) : null),
    [completed, answers],
  )

  const moduleRows = useMemo(
    () => Object.values(scores?.moduleScores || {}).sort((a, b) => a.moduleNumber - b.moduleNumber),
    [scores],
  )

  const teacherComment = (answers.teacher_comment || '').trim()

  const handleRespond = async (response) => {
    if (!assessment?.id) return
    setResponding(true)
    setResponseError(null)
    const { assessment: saved, error } = await respondToRecommendedHours(assessment.id, response)
    setResponding(false)
    if (error) {
      setResponseError(toDisplayText(error.message, 'Enregistrement impossible'))
      return
    }
    onAssessmentChange?.(saved)
  }

  if (!assessment) {
    return (
      <EmptyState
        icon="📋"
        message="Votre évaluation de départ sera disponible ici une fois réalisée par votre enseignant."
        title="Évaluation non disponible"
      />
    )
  }

  if (!completed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="text-sm font-semibold text-amber-800">En attente</p>
        <h2 className="mt-2 text-xl font-semibold text-amber-950">
          Évaluation {formatAssessmentStatus(assessment.status).toLowerCase()}
        </h2>
        <p className="mt-3 text-sm leading-7 text-amber-900">
          Votre enseignant réalisera l&apos;évaluation de départ lors de votre première heure de conduite.
          Vous pourrez ensuite consulter ici vos résultats, le commentaire pédagogique et le volume horaire recommandé.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-700">Score total</p>
          <p className="mt-1 text-4xl font-semibold text-blue-950">{scores.finalScore} %</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-700">Heures préconisées</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-2xl font-semibold text-emerald-950">{formatRecommendedHours(assessment)}</p>
            <HoursProposalStatusBadge assessment={assessment} />
          </div>
          {proposalStatus.tone === 'pending' && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                disabled={responding}
                onClick={() => handleRespond('accepted')}
                type="button"
              >
                J&apos;accepte cette proposition
              </button>
              <button
                className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                disabled={responding}
                onClick={() => handleRespond('declined')}
                type="button"
              >
                Je refuse cette proposition
              </button>
            </div>
          )}
          {responseError && (
            <p className="mt-3 text-sm font-semibold text-rose-700">{responseError}</p>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold text-blue-700">Commentaire de l&apos;enseignant</p>
        {teacherComment ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{teacherComment}</p>
        ) : (
          <p className="mt-3 text-sm font-medium text-slate-500">Aucun commentaire n&apos;a été ajouté par votre enseignant.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
          <span>Enseignant : {toDisplayText(assessment.teacherName, '—')}</span>
          <span>Date : {formatDateFr(assessment.completed_at)}</span>
        </div>
      </section>

      {moduleRows.length > 0 && (
        <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Résultats par module</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-300">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Max</th>
                </tr>
              </thead>
              <tbody>
                {moduleRows.map((row) => (
                  <tr className="border-t border-slate-200" key={row.moduleNumber}>
                    <td className="px-4 py-3 font-semibold">{row.moduleNumber}. {row.title}</td>
                    <td className="px-4 py-3">{row.score}</td>
                    <td className="px-4 py-3 text-slate-500">{row.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-300 bg-slate-50 p-5">
        <h2 className="text-lg font-semibold text-slate-950">Détail de votre évaluation</h2>
        <p className="mt-1 text-sm text-slate-500">Réponses enregistrées par votre enseignant lors de la première heure.</p>
        <div className="mt-4 space-y-4">
          {ASSESSMENT_MODULES.filter((module) => !module.readOnly && module.available).map((module) => {
            const fieldRows = (module.fields || [])
              .map((field) => ({ label: field.label, value: answers[field.id] || '—' }))
              .filter((row) => row.value !== '—')
            const ratingRows = (module.ratings || [])
              .map((rating) => ({ label: rating.label, value: formatRatingValue(answers[rating.id]) }))
              .filter((row) => row.value !== '—')

            if (!fieldRows.length && !ratingRows.length) return null

            return (
              <article className="rounded-2xl border border-slate-300 bg-white p-4" key={module.id}>
                <h3 className="font-semibold text-slate-900">Module {module.moduleNumber} — {module.title}</h3>
                <dl className="mt-3 space-y-2">
                  {[...fieldRows, ...ratingRows].map((row) => (
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[1fr_auto]" key={row.label}>
                      <dt className="text-sm text-slate-600">{row.label}</dt>
                      <dd className="text-sm font-semibold text-slate-900 sm:text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
