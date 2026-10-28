import { useCallback, useEffect, useMemo, useState } from 'react'
import { ui } from '../../components/ui/styles'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import AppModal, { AppModalFooter } from '../../components/ui/AppModal'
import WeekdayDatePicker from '../../components/ui/WeekdayDatePicker'
import { useAuth } from '../../context/AuthContext'
import { getUserFacingError } from '../../lib/userFacingError'
import { studentLabel, todayIso } from '../../services/finance'
import {
  createExam,
  deleteExam,
  listExams,
  subscribeToExams,
  updateExam,
} from '../../services/exams'
import { filterBookableStudents, listOrganizationTeachers, listStudents } from '../../services/students'

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
]

const EXAM_TYPES = ['Code', 'Permis B', 'AAC', 'Boîte auto', 'Examen blanc']
const EXAM_STATUSES = ['Confirmé', 'À confirmer', 'Dossier incomplet']

function isSunday(value) {
  if (!value) return false
  return new Date(`${value}T12:00:00`).getDay() === 0
}

function emptyForm(date = todayIso()) {
  return {
    studentId: '',
    type: 'Permis B',
    date,
    hour: '09:00',
    teacherId: '',
    center: '',
    status: 'À confirmer',
  }
}

function referentTeacherId(student) {
  const assignments = student?.student_assignments || []
  const referent = assignments.find((row) => row.is_referent)
  return referent?.teacher_id || assignments[0]?.teacher_id || ''
}

export default function SecretaryExamsPage() {
  const { profileId, organizationId } = useAuth()
  const [exams, setExams] = useState([])
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [statusFeedback, setStatusFeedback] = useState(null)

  const refresh = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const [examsRes, studentsRes, teachersRows] = await Promise.all([
      listExams(),
      listStudents(),
      listOrganizationTeachers(),
    ])
    if (examsRes.error || studentsRes.error) {
      setLoadError('Impossible de charger les examens.')
    }
    setExams(examsRes.exams || [])
    setStudents(filterBookableStudents(studentsRes.students || []))
    setTeachers(teachersRows || [])
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!profileId) return undefined
    return subscribeToExams(refresh)
  }, [profileId, refresh])

  const handleDateChange = (value) => setForm((current) => ({ ...current, date: value }))

  const dateInvalid = !form.date || isSunday(form.date)
  const canSubmit = Boolean(form.studentId) && !dateInvalid && !saving

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (exam) => {
    setEditingId(exam.id)
    setSelectedId(exam.id)
    setForm({
      studentId: exam.student_id || '',
      type: exam.type || 'Permis B',
      date: exam.exam_date || todayIso(),
      hour: exam.exam_time || '09:00',
      teacherId: exam.teacher_id || '',
      center: exam.center || '',
      status: exam.status || 'À confirmer',
    })
    setFormError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
  }

  const handleStudentChange = (studentId) => {
    const student = students.find((row) => row.id === studentId)
    setForm((current) => ({
      ...current,
      studentId,
      teacherId: referentTeacherId(student) || current.teacherId,
    }))
  }

  const selectedExam = exams.find((exam) => exam.id === selectedId) || exams[0] || null

  const stats = useMemo(
    () => ({
      confirmed: exams.filter((exam) => exam.status === 'Confirmé').length,
      pending: exams.filter((exam) => exam.status === 'À confirmer').length,
      blocked: exams.filter((exam) => exam.status === 'Dossier incomplet').length,
    }),
    [exams],
  )

  const saveExam = async (event) => {
    event.preventDefault()
    if (!canSubmit || !organizationId) return
    setSaving(true)
    setFormError(null)

    const payload = {
      studentId: form.studentId,
      teacherId: form.teacherId || null,
      type: form.type,
      examDate: form.date,
      examTime: form.hour,
      center: form.center,
      status: form.status,
    }

    const result = editingId
      ? await updateExam(editingId, payload)
      : await createExam({ organizationId, ...payload })

    setSaving(false)
    if (result.error) {
      setFormError(getUserFacingError(result.error))
      return
    }

    if (result.exam) {
      setSelectedId(result.exam.id)
      setExams((current) => {
        if (editingId) {
          return current.map((exam) => (exam.id === editingId ? result.exam : exam))
        }
        return [result.exam, ...current]
      })
    }
    closeForm()
  }

  const updateStatus = async (examId, status) => {
    const { exam, error } = await updateExam(examId, { status })
    if (error) return
    if (exam) {
      setExams((current) => current.map((row) => (row.id === examId ? exam : row)))
      setStatusFeedback({ examId, status: exam.status })
    }
  }

  const removeExam = async (examId) => {
    const { error } = await deleteExam(examId)
    if (error) return
    setExams((current) => {
      const next = current.filter((exam) => exam.id !== examId)
      setSelectedId((currentSelected) => (currentSelected === examId ? next[0]?.id || null : currentSelected))
      return next
    })
  }

  if (!profileId) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte secrétariat." icon="🎫" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <button className={ui.btnPrimary} onClick={openCreate} type="button">
            Planifier un examen
          </button>
        }
        description="Réservations, centres, enseignants référents et dossiers incomplets. L’élève est prévenu automatiquement."
        title="Examens"
      />

      {loadError && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{loadError}</p>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kpi label="Confirmés" value={stats.confirmed} />
        <Kpi label="À confirmer" value={stats.pending} tone="amber" />
        <Kpi label="Dossiers bloqués" value={stats.blocked} tone="rose" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-2xl font-semibold text-slate-950">Sessions à venir</h2>
          <div className="mt-5 grid gap-3">
            {loading ? (
              <p className="text-sm font-medium text-slate-500">Chargement…</p>
            ) : exams.length === 0 ? (
              <EmptyState title="Aucun examen planifié" message="Planifiez une session pour un élève de votre auto-école." icon="🎫" />
            ) : (
              exams.map((exam) => (
                <button className={`rounded-2xl border p-4 text-left transition hover:shadow-lg ${selectedId === exam.id ? 'border-blue-300 bg-blue-50' : 'border-slate-300 bg-slate-50'}`} key={exam.id} onClick={() => { setSelectedId(exam.id); setStatusFeedback(null); openEdit(exam) }} type="button">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-semibold text-slate-950">{exam.studentName}</h3>
                      <p className="mt-1 text-sm text-slate-500">{exam.type} · {exam.exam_date} à {exam.exam_time} · {exam.center || '—'}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">{exam.status}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {selectedExam && (
          <aside className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-blue-700">Fiche examen</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{selectedExam.studentName}</h2>
            <p className="mt-2 text-sm text-slate-500">{selectedExam.type} · {selectedExam.center || '—'}</p>
            <div className="mt-5 grid gap-3">
              <Info label="Date" value={`${selectedExam.exam_date || '—'} à ${selectedExam.exam_time || '—'}`} />
              <Info label="Enseignant" value={selectedExam.teacherName} />
              <Info label="Statut" value={selectedExam.status} />
            </div>
            {selectedExam.status === 'Confirmé' && (
              <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                Examen confirmé et enregistré.
              </p>
            )}
            {statusFeedback?.examId === selectedExam.id && statusFeedback.status !== 'Confirmé' && (
              <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                {statusSavedMessage(statusFeedback.status)}
              </p>
            )}
            <div className="mt-5 grid gap-2">
              {selectedExam.status !== 'Confirmé' && (
                <button className="rounded-2xl bg-[#1769FF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700" onClick={() => updateStatus(selectedExam.id, 'Confirmé')} type="button">
                  Confirmer
                </button>
              )}
              {selectedExam.status !== 'À confirmer' && (
                <button className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100" onClick={() => updateStatus(selectedExam.id, 'À confirmer')} type="button">
                  Mettre en attente
                </button>
              )}
              {selectedExam.status !== 'Dossier incomplet' && (
                <button className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100" onClick={() => updateStatus(selectedExam.id, 'Dossier incomplet')} type="button">
                  Dossier incomplet
                </button>
              )}
              <button className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500" onClick={() => removeExam(selectedExam.id)} type="button">
                Supprimer
              </button>
            </div>
          </aside>
        )}
      </section>

      <AppModal
        open={showForm}
        onClose={closeForm}
        eyebrow={editingId ? 'Modification' : 'Nouvelle session'}
        title={editingId ? 'Modifier l\u2019examen' : 'Planifier un examen'}
        size="lg"
        footer={(
          <AppModalFooter
            onClose={closeForm}
            submitForm="exam-form"
            submitLabel={saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Enregistrer'}
            submitDisabled={!canSubmit}
          />
        )}
      >
        <form id="exam-form" className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={saveExam}>
          <StudentSelect
            label="Élève *"
            onChange={handleStudentChange}
            students={students}
            value={form.studentId}
          />
          <Select label="Type" onChange={(value) => setForm((current) => ({ ...current, type: value }))} options={EXAM_TYPES} value={form.type} />
          <WeekdayDatePicker label="Date (lundi au samedi)" value={form.date} onChange={handleDateChange} />
          <Select label="Heure" onChange={(value) => setForm((current) => ({ ...current, hour: value }))} options={TIME_SLOTS} value={form.hour} />
          <TeacherSelect
            label="Enseignant référent"
            onChange={(value) => setForm((current) => ({ ...current, teacherId: value }))}
            teachers={teachers}
            value={form.teacherId}
          />
          <Field label="Centre d'examen" onChange={(value) => setForm((current) => ({ ...current, center: value }))} value={form.center} />
          <Select label="Statut" onChange={(value) => setForm((current) => ({ ...current, status: value }))} options={EXAM_STATUSES} value={form.status} />
          {!form.studentId && (
            <p className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Sélectionnez un élève de votre auto-école pour enregistrer l&apos;examen. L&apos;élève recevra une notification automatique.
            </p>
          )}
          {students.length === 0 && (
            <p className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Aucun dossier élève disponible dans votre auto-école.
            </p>
          )}
          {formError && (
            <p className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{formError}</p>
          )}
        </form>
      </AppModal>
    </div>
  )
}

function statusSavedMessage(status) {
  if (status === 'À confirmer') return 'Examen mis en attente et enregistré.'
  if (status === 'Dossier incomplet') return 'Dossier incomplet enregistré.'
  return 'Statut enregistré.'
}

function Kpi({ label, tone = 'cyan', value }) {
  const color = tone === 'rose' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : 'text-blue-600'
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
    </article>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function StudentSelect({ label, onChange, students, value }) {
  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        <option value="">Sélectionner un élève…</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {studentLabel(student)} · {student.file_number || student.id.slice(0, 8)}
          </option>
        ))}
      </select>
    </label>
  )
}

function TeacherSelect({ label, onChange, teachers, value }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Aucun enseignant</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
        ))}
      </select>
    </label>
  )
}

function Field({ label, onChange, type = 'text', value }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  )
}

function Select({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}
