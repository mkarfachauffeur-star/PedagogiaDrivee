import { useCallback, useEffect, useMemo, useState } from 'react'
import { resultLabel } from '../../data/practiceExamGrid'
import {
  buildInitialPracticeExamForm,
  createPracticeExam,
  listPracticeExamsForStudent,
} from '../../services/practiceExams'
import {
  calculatePracticeExamScore,
  determinePracticeExamResult,
} from '../../services/practiceExamScoring'
import { getUserFacingError } from '../../lib/userFacingError'
import { formatPersonName } from '../../lib/staffAccounts'
import PracticeExamDetail from './PracticeExamDetail'
import PracticeExamHelpModal, {
  PracticeExamGridEditor,
  PracticeExamScorePreview,
} from './PracticeExamHelpModal'

export default function PracticeExamTeacherPanel({
  student,
  organizationId,
  teacherId,
  embedded = false,
}) {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState(null)
  const [form, setForm] = useState(buildInitialPracticeExamForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const refresh = useCallback(async () => {
    if (!student?.id) {
      setExams([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { exams: rows } = await listPracticeExamsForStudent(student.id)
    setExams(rows)
    setLoading(false)
  }, [student?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  const liveScore = useMemo(
    () => calculatePracticeExamScore({
      scores: form.scores,
      bonusCourtesy: form.bonusCourtesy,
      bonusEco: form.bonusEco,
    }),
    [form],
  )
  const liveResult = useMemo(
    () => determinePracticeExamResult({
      scoreTotal: liveScore,
      hasEliminatoryError: form.eliminatoryErrors.length > 0,
    }),
    [liveScore, form.eliminatoryErrors],
  )
  const selectedExam = exams.find((exam) => exam.id === selectedExamId) || exams[0]

  const handleStartExam = () => {
    setHelpOpen(false)
    setForm(buildInitialPracticeExamForm())
    setFormOpen(true)
    setSelectedExamId(null)
  }

  const handleSave = async () => {
    if (!student?.id || !organizationId || !teacherId) return
    setSaving(true)
    setSaveError(null)
    const { exam, error } = await createPracticeExam({
      organizationId,
      studentId: student.id,
      teacherId,
      examDate: form.examDate,
      scores: form.scores,
      bonusCourtesy: form.bonusCourtesy,
      bonusEco: form.bonusEco,
      eliminatoryErrors: form.eliminatoryErrors,
      comment: form.comment,
    })
    setSaving(false)
    if (error) {
      setSaveError(getUserFacingError(error, 'practiceExam'))
      return
    }
    setFormOpen(false)
    if (exam) {
      setSelectedExamId(exam.id)
      await refresh()
    }
  }

  if (!student) return null

  const title = embedded ? 'Examen blanc (optionnel)' : 'Examen blanc permis B'
  const description = embedded
    ? 'Remplissez la grille officielle si un examen blanc est réalisé pendant cette leçon.'
    : `${formatPersonName(student)} · grille officielle sur 31 points`

  return (
    <section className={embedded ? 'rounded-2xl border border-slate-300 bg-white p-4 sm:p-5' : 'card-panel-lg'}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={`font-semibold text-slate-900 ${embedded ? 'text-lg' : 'text-2xl'}`}>{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          className="rounded-xl bg-[#1769FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          onClick={() => setHelpOpen(true)}
          type="button"
        >
          {formOpen ? 'Grille en cours' : 'Nouvel examen blanc'}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">Chargement de l&apos;historique…</p>
      ) : (
        <div className={`mt-5 grid gap-5 ${embedded ? 'xl:grid-cols-[240px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
          <aside className="space-y-3">
            <p className="text-sm font-semibold text-blue-700">Historique</p>
            {exams.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
                Aucun examen blanc enregistré pour cet élève.
              </p>
            )}
            {exams.map((exam) => (
              <button
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedExam?.id === exam.id
                    ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-slate-300 bg-white hover:border-blue-200'
                }`}
                key={exam.id}
                onClick={() => {
                  setSelectedExamId(exam.id)
                  setFormOpen(false)
                }}
                type="button"
              >
                <p className="font-semibold text-slate-900">
                  {new Date(exam.exam_date).toLocaleDateString('fr-FR')}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {exam.score_total}/31 · {resultLabel(exam.result)}
                </p>
              </button>
            ))}
          </aside>

          <div>
            {formOpen ? (
              <div className="space-y-5">
                <PracticeExamScorePreview
                  form={form}
                  liveResultLabel={resultLabel(liveResult)}
                  liveScore={liveScore}
                />
                <label className="block text-sm font-semibold text-slate-700">
                  Date de l&apos;examen
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    onChange={(event) => setForm((current) => ({ ...current, examDate: event.target.value }))}
                    type="date"
                    value={form.examDate}
                  />
                </label>
                <PracticeExamGridEditor
                  form={form}
                  onChangeScore={(competenceId, note) =>
                    setForm((current) => ({
                      ...current,
                      scores: { ...current.scores, [competenceId]: note },
                    }))
                  }
                  onCommentChange={(comment) => setForm((current) => ({ ...current, comment }))}
                  onToggleBonus={(key) => setForm((current) => ({ ...current, [key]: !current[key] }))}
                  onToggleEliminatory={(errorId) =>
                    setForm((current) => ({
                      ...current,
                      eliminatoryErrors: current.eliminatoryErrors.includes(errorId)
                        ? current.eliminatoryErrors.filter((id) => id !== errorId)
                        : [...current.eliminatoryErrors, errorId],
                    }))
                  }
                />
                <div className="flex flex-wrap gap-3">
                  {saveError && (
                    <p className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {saveError}
                    </p>
                  )}
                  <button
                    className="rounded-xl bg-[#1769FF] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={saving}
                    onClick={handleSave}
                    type="button"
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer l\'examen blanc'}
                  </button>
                  <button
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600"
                    onClick={() => setFormOpen(false)}
                    type="button"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : selectedExam ? (
              <PracticeExamDetail exam={selectedExam} exams={exams} />
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm font-semibold text-slate-500">
                Lancez un nouvel examen blanc ou sélectionnez un examen dans l&apos;historique.
              </p>
            )}
          </div>
        </div>
      )}

      <PracticeExamHelpModal
        onClose={() => setHelpOpen(false)}
        onStart={handleStartExam}
        open={helpOpen}
      />
    </section>
  )
}
