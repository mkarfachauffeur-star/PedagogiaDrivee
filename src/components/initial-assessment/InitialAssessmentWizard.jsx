import { useEffect, useMemo, useState } from 'react'
import {
  ASSESSMENT_MODULES,
  FSB_LEGEND,
  FSB_OPTIONS,
  computeAssessmentScores,
  recommendHoursFromScore,
} from '../../data/initialAssessmentForm'
import { saveInitialAssessmentStep } from '../../services/initialAssessment'
import { exportInitialAssessmentPdf } from '../../services/initialAssessmentPdf'
import { getUserFacingError } from '../../lib/userFacingError'
import { normalizeAssessmentAnswers } from '../../lib/initialAssessmentUtils'

import HoursProposalStatusBadge from './HoursProposalStatusBadge'

const PLACEHOLDER_MESSAGE = 'Cette section sera disponible prochainement.'

function ModuleProgress({ modules, currentIndex }) {
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {modules.map((step, index) => {
        const active = index === currentIndex
        const done = index < currentIndex
        return (
          <li
            className={`rounded-2xl border px-3 py-2 text-xs font-semibold ${
              active
                ? 'border-blue-300 bg-blue-50 text-blue-900'
                : done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-300 bg-white text-slate-500'
            }`}
            key={step.id}
          >
            <span className="block text-[10px] opacity-70">
              Module {step.moduleNumber}
            </span>
            {step.title}
          </li>
        )
      })}
    </ol>
  )
}

function SelectFields({ fields, answers, onChange, readOnly }) {
  if (!fields?.length) return null
  return (
    <div className="grid gap-3">
      {fields.map((field) => (
        <label className="block text-sm font-semibold text-slate-700" key={field.id}>
          {field.label}
          <select
            className="pd-input mt-1 w-full"
            disabled={readOnly}
            onChange={(e) => onChange(field.id, e.target.value)}
            value={answers[field.id] || ''}
          >
            <option disabled value="">— Sélectionner —</option>
            {field.options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

function RatingFields({ ratings, answers, onChange, readOnly, teacherOnly }) {
  if (!ratings?.length) return null
  return (
    <div className="mt-5 space-y-3">
      {teacherOnly && (
        <p className="text-xs font-semibold text-slate-400">
          Appréciation enseignant
        </p>
      )}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">Notation F / S / B</p>
        <ul className="mt-1 space-y-0.5">
          {Object.entries(FSB_LEGEND).map(([key, text]) => (
            <li key={key}><span className="font-semibold">{key}</span> — {text}</li>
          ))}
        </ul>
      </div>
      {ratings.map((rating) => (
        <div className="rounded-2xl border border-slate-300 bg-white px-4 py-3" key={rating.id}>
          <p className="text-sm font-semibold text-slate-800">{rating.label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FSB_OPTIONS.map((opt) => {
              const selected = answers[rating.id] === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onChange(rating.id, opt.value)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-blue-200'
                  } ${readOnly ? 'cursor-default opacity-90' : ''}`}
                >
                  {opt.value}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ModulePlaceholder() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-600">{PLACEHOLDER_MESSAGE}</p>
    </div>
  )
}

function TeacherCommentField({ answers, editable, onChange }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      Commentaire enseignant (visible par l&apos;élève)
      <textarea
        className="pd-input mt-2 min-h-28 w-full"
        disabled={!editable}
        onChange={(event) => onChange('teacher_comment', event.target.value)}
        placeholder="Synthèse pédagogique, points forts, axes de travail…"
        value={answers.teacher_comment || ''}
      />
    </label>
  )
}

function ResultsPanel({ answers, student, assessment, onExportPdf, exportingPdf, teacherMode, onCommentChange, readOnly }) {
  const scores = useMemo(() => computeAssessmentScores(answers), [answers])
  const recommendation = useMemo(
    () => recommendHoursFromScore({ ...scores, moduleScores: scores.moduleScores }),
    [scores],
  )
  const moduleRows = useMemo(
    () => Object.values(scores.moduleScores || {}).sort((a, b) => a.moduleNumber - b.moduleNumber),
    [scores.moduleScores],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-700">Score total</p>
          <p className="mt-1 text-4xl font-semibold text-blue-950">{scores.finalScore} %</p>
        </article>
        <article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-700">Profil élève</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-950">{recommendation.profileLabel}</p>
        </article>
        <article className="rounded-2xl border border-slate-300 bg-white p-4">
          <p className="text-sm font-semibold text-slate-500">Volume horaire estimé</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-2xl font-semibold text-slate-950">{recommendation.label}</p>
            {assessment?.status === 'completed' && (
              <HoursProposalStatusBadge assessment={assessment} />
            )}
          </div>
        </article>
      </div>
      {moduleRows.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-300">
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
      )}
      {teacherMode && onCommentChange && (
        <TeacherCommentField
          answers={answers}
          editable={teacherMode}
          onChange={onCommentChange}
        />
      )}
      {onExportPdf && (
        <button
          className="pd-btn-secondary"
          disabled={exportingPdf}
          onClick={() => onExportPdf({ answers, student, assessment })}
          type="button"
        >
          {exportingPdf ? 'Génération du PDF…' : 'Télécharger le PDF d\'évaluation'}
        </button>
      )}
    </div>
  )
}

export default function InitialAssessmentWizard({
  assessment,
  student,
  studentId,
  organizationId,
  completedBy = null,
  readOnly = false,
  teacherMode = false,
  onSaved,
  onComplete,
}) {
  const navigableModules = useMemo(
    () => ASSESSMENT_MODULES.filter((m) => !m.readOnly),
    [],
  )
  const resultsIndex = ASSESSMENT_MODULES.findIndex((m) => m.id === 'results')

  const [answers, setAnswers] = useState(() => normalizeAssessmentAnswers(assessment?.answers))
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [exportError, setExportError] = useState(null)
  const [exportingPdf, setExportingPdf] = useState(false)

  const currentModule = ASSESSMENT_MODULES[stepIndex] ?? null
  const isResultsStep = currentModule?.readOnly === true
  const isLastNavStep = stepIndex >= resultsIndex - 1 && stepIndex < resultsIndex

  useEffect(() => {
    setAnswers(normalizeAssessmentAnswers(assessment?.answers))
    setError(null)
  }, [assessment?.id, assessment?.updated_at])

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  const canEditModule = (mod) => {
    if (readOnly) return false
    if (mod.teacherOnly && !teacherMode) return false
    return true
  }

  const persist = async (markCompleted = false) => {
    setSaving(true)
    setError(null)
    const alreadyCompleted = assessment?.status === 'completed'
    const { assessment: saved, error: saveError } = await saveInitialAssessmentStep({
      assessmentId: assessment?.id,
      studentId,
      organizationId,
      answers,
      completedBy,
      markCompleted,
      updateCompleted: alreadyCompleted && !markCompleted,
      status: markCompleted || alreadyCompleted ? 'completed' : 'in_progress',
    })
    setSaving(false)
    if (saveError) {
      setError(getUserFacingError(saveError, 'save'))
      return false
    }
    onSaved?.(saved)
    return true
  }

  const handleNext = async () => {
    if (readOnly) {
      setStepIndex((i) => Math.min(i + 1, ASSESSMENT_MODULES.length - 1))
      return
    }
    const ok = await persist(isLastNavStep)
    if (!ok) return
    setStepIndex((i) => Math.min(i + 1, ASSESSMENT_MODULES.length - 1))
  }

  const handleFinalize = async () => {
    const ok = await persist(true)
    if (ok) setStepIndex(resultsIndex)
  }

  const handleSaveAssessment = async () => {
    const alreadyCompleted = assessment?.status === 'completed'
    const ok = await persist(!alreadyCompleted)
    if (ok) {
      onComplete?.()
    }
  }

  const handleExportPdf = async (payload) => {
    setExportError(null)
    setExportingPdf(true)
    const result = await exportInitialAssessmentPdf({
      ...payload,
      answers: payload.answers || answers,
      student: payload.student || student || {},
      assessment: payload.assessment || assessment,
    })
    setExportingPdf(false)
    if (result?.ok === false) {
      setExportError(result.error || 'Téléchargement impossible.')
    }
  }

  if (!currentModule) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
        <p className="text-sm font-semibold text-amber-900">{PLACEHOLDER_MESSAGE}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ModuleProgress
        currentIndex={Math.min(stepIndex, navigableModules.length - 1)}
        modules={navigableModules}
      />

      <section className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold text-blue-700">
          {currentModule.readOnly ? 'Synthèse' : `Module ${currentModule.moduleNumber} / ${navigableModules.length}`}
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">{currentModule.title}</h2>
        {currentModule.objective && (
          <p className="mt-2 text-sm font-semibold text-slate-700">{currentModule.objective}</p>
        )}
        {currentModule.description && (
          <p className="mt-1 text-sm text-slate-500">{currentModule.description}</p>
        )}

        <div className="mt-5">
          {!currentModule.available ? (
            <ModulePlaceholder />
          ) : currentModule.readOnly ? (
            <ResultsPanel
              answers={answers}
              assessment={assessment}
              exportingPdf={exportingPdf}
              onCommentChange={updateAnswer}
              onExportPdf={teacherMode || assessment?.status === 'completed' ? handleExportPdf : null}
              readOnly={readOnly}
              student={student}
              teacherMode={teacherMode}
            />
          ) : (
            <>
              {currentModule.fields?.length > 0 && (
                <SelectFields
                  answers={answers}
                  fields={currentModule.fields}
                  onChange={updateAnswer}
                  readOnly={!canEditModule(currentModule)}
                />
              )}
              {currentModule.ratings?.length > 0 && (
                <RatingFields
                  answers={answers}
                  onChange={updateAnswer}
                  ratings={currentModule.ratings}
                  readOnly={!canEditModule(currentModule)}
                  teacherOnly={currentModule.teacherOnly}
                />
              )}
              {!currentModule.fields?.length && !currentModule.ratings?.length && (
                <ModulePlaceholder />
              )}
            </>
          )}
        </div>
      </section>

      {(error || exportError) && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error || exportError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          className="pd-btn-secondary"
          disabled={stepIndex === 0 || saving}
          onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
          type="button"
        >
          Module précédent
        </button>
        {!isResultsStep && (
          <button className="pd-btn-primary" disabled={saving} onClick={handleNext} type="button">
            {saving
              ? 'Enregistrement…'
              : readOnly
                ? 'Module suivant'
                : isLastNavStep
                  ? 'Enregistrer et voir le résultat'
                  : 'Enregistrer et continuer'}
          </button>
        )}
        {!readOnly && teacherMode && isLastNavStep && (
          <button className="pd-btn-primary" disabled={saving} onClick={handleFinalize} type="button">
            {saving ? 'Finalisation…' : 'Finaliser l\'évaluation'}
          </button>
        )}
        {teacherMode && isResultsStep && (
          <button className="pd-btn-primary" disabled={saving} onClick={handleSaveAssessment} type="button">
            {saving
              ? 'Enregistrement…'
              : assessment?.status === 'completed'
                ? 'Enregistrer l\'évaluation'
                : 'Enregistrer et finaliser l\'évaluation'}
          </button>
        )}
      </div>
    </div>
  )
}
