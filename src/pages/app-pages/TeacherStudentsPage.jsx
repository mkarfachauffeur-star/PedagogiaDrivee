import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Timer } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { ui } from '../../components/ui/styles'
import { CallButton, StudentAvatar, StudentListItem, StudentSummary } from '../../components/teacher/TeacherStudentViews'
import { useStudentsHoursSummaries } from '../../hooks/useStudentsHoursSummaries'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useStudentRemcProgress } from '../../hooks/useStudentRemcProgress'
import InitialAssessmentWizard from '../../components/initial-assessment/InitialAssessmentWizard'
import { isAacFormation, isPermisBStudent, resolveStudentTrack, STUDENT_TRACKS } from '../../lib/studentTrack'
import AacPanel from '../../components/aac/AacPanel'
import { formatPersonName } from '../../lib/staffAccounts'
import { normalizeInitialAssessment, formatRecommendedHours } from '../../lib/initialAssessmentUtils'
import { formatAssessmentStatus, getInitialAssessmentForStudent } from '../../services/initialAssessment'
import { listStudents, subscribeStudents } from '../../services/students'
import {
  createLessonObservation,
  formatLessonClosingLabel,
  formatLessonDateFr,
  formatLessonOpeningLabel,
  listLessonObservationsForStudent,
  updateLessonObservation,
} from '../../services/studentLessonObservations'
import RemcTeacherValidationPanel from '../../components/remc/RemcTeacherValidationPanel'
import LessonModuleQcuProgressPanel from '../../components/lessons/LessonModuleQcuProgressPanel'
import PracticeExamTeacherPanel from '../../components/practice-exam/PracticeExamTeacherPanel'
import PreRegistrationFormModal from '../../components/pre-registration/PreRegistrationFormModal'
import EmptyState from '../../components/ui/EmptyState'
import StudentCharterStatusBadge from '../../components/students/StudentCharterStatusBadge'
import PanelTabs from '../../components/ui/PanelTabs'
import PaginationBar from '../../components/ui/PaginationBar'
import { useClientPagination } from '../../hooks/useClientPagination'
import HoursProposalStatusBadge from '../../components/initial-assessment/HoursProposalStatusBadge'
import {
  PRE_REGISTRATION_STATUS_LABELS,
  preRegistrationStatusClass,
} from '../../data/preRegistration'
import {
  listPreRegistrations,
  subscribePreRegistrations,
} from '../../services/preRegistrations'

function StudentPanelTab({ active, children, onClick }) {
  return (
    <button
      className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
        active
          ? 'bg-[#1769FF] text-white'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

const lessonDurations = ['45 MIN', '1h', '2H']

function nowDateTime() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 5)
  return { date, time }
}

function normalizeStudentSearch(value = '') {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function studentMatchesSearch(student, query) {
  if (!query) return true
  const haystack = normalizeStudentSearch(
    `${formatPersonName(student)} ${student.firstName || ''} ${student.lastName || ''}`,
  )
  return query.split(/\s+/).filter(Boolean).every((part) => haystack.includes(part))
}

function inferGearboxLabel(student) {
  const haystack = `${student.package_name || ''} ${student.formation_type || ''}`.toLowerCase()
  if (haystack.includes('automatique')) return 'Boîte automatique'
  if (haystack.includes('manuelle')) return 'Boîte manuelle'
  return 'Boîte manuelle'
}

function formatStudentPermisSummary(apiStudent) {
  const license = String(apiStudent?.license_category || 'Permis B').trim()
  if (resolveStudentTrack(apiStudent) !== STUDENT_TRACKS.PERMIS_B) {
    return license
  }
  const gearbox = inferGearboxLabel(apiStudent)
  return `${license} — ${gearbox}`
}

function mapApiStudentToTracking(student) {
  const referent = student.student_assignments?.find((assignment) => assignment.is_referent)?.teacher
  return {
    id: student.id,
    firstName: student.first_name,
    lastName: student.last_name,
    teacher: referent?.full_name || 'Non assigné',
    formationType: student.package_name || student.formation_type || 'Permis B traditionnel',
    permisSummary: formatStudentPermisSummary(student),
    licenseCategory: student.license_category,
    codeStatus: 'Non obtenu',
  }
}

function ShareToggle({ active, disabled, onClick, compact = false }) {
  return (
    <button
      className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-xs font-medium transition ${
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {active ? '✓ Partagé' : compact ? 'Partagé' : 'Partagé avec l\'élève'}
    </button>
  )
}

export default function TeacherStudentsPage() {
  const formatDateFr = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    if (!year || !month || !day) return dateString
    return `${day}/${month}/${year}`
  }

  const { profileId, organizationId, role, loading: authLoading, profile, isAuthenticated } = useAuth()
  const location = useLocation()
  const currentTeacherName = useMemo(() => {
    const name = profile?.full_name?.trim()
    if (name) return name
    return 'Enseignant'
  }, [profile?.full_name])
  const [apiStudents, setApiStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsError, setStudentsError] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [hoursRefresh, setHoursRefresh] = useState(0)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  useEffect(() => {
    if (location.state?.studentId) {
      setSelectedStudentId(location.state.studentId)
      setStudentPanelTab('lessons')
    }
  }, [location.state?.studentId])
  const [lessonFormOpen, setLessonFormOpen] = useState(false)
  const [lessonSessionTab, setLessonSessionTab] = useState('lesson')
  const [studentPanelTab, setStudentPanelTab] = useState('lessons')
  const [initialAssessment, setInitialAssessment] = useState(null)
  const [lessonObservations, setLessonObservations] = useState([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [lessonSaving, setLessonSaving] = useState(false)
  const [newLesson, setNewLesson] = useState({
    date: '',
    time: '',
    duration: '2H',
    observations: '',
    sharedWithStudent: false,
  })
  const [preRegModalOpen, setPreRegModalOpen] = useState(false)
  const [preRegistrations, setPreRegistrations] = useState([])
  const [preRegLoading, setPreRegLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return undefined

    if (!isAuthenticated || !profileId) {
      setStudentsLoading(false)
      setStudentsError('Session enseignant introuvable. Reconnectez-vous.')
      return undefined
    }

    let cancelled = false

    async function loadStudents() {
      setStudentsLoading(true)
      setStudentsError(null)

      try {
        const { students: rows, error } = await listStudents({ teacherId: profileId })

        if (cancelled) return

        if (error) {
          setStudentsError(error.message || String(error))
          setApiStudents([])
          return
        }

        setApiStudents(rows)
      } finally {
        if (!cancelled) setStudentsLoading(false)
      }
    }

    void loadStudents()
    const unsubscribe = subscribeStudents(() => {
      void loadStudents()
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [authLoading, isAuthenticated, profileId])

  useEffect(() => {
    if (!apiStudents.length) {
      setSelectedStudentId(null)
      return
    }
    if (selectedStudentId && !apiStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(null)
    }
  }, [apiStudents, selectedStudentId])

  const displayStudents = useMemo(
    () => apiStudents.map(mapApiStudentToTracking),
    [apiStudents],
  )

  const filteredStudents = useMemo(() => {
    const query = normalizeStudentSearch(studentSearchQuery)
    if (!query) return displayStudents
    return displayStudents.filter((student) => studentMatchesSearch(student, query))
  }, [displayStudents, studentSearchQuery])

  const selectedStudent = useMemo(
    () => displayStudents.find((student) => student.id === selectedStudentId) || null,
    [selectedStudentId, displayStudents],
  )

  const studentIds = useMemo(() => displayStudents.map((student) => student.id), [displayStudents])
  const hoursByStudent = useStudentsHoursSummaries(studentIds, hoursRefresh)

  // Sur téléphone, la fiche remplace la liste : on repart du haut de l'écran.
  const selectStudent = (studentId) => {
    setSelectedStudentId(studentId)
    setLessonFormOpen(false)
    setStudentPanelTab('lessons')
    window.scrollTo({ top: 0 })
  }

  const {
    remc: selectedStudentRemc,
    updateStatus: updateRemcStatus,
    progress: selectedRemcProgress,
  } = useStudentRemcProgress(selectedStudent?.id, {
    organizationId,
    teacherId: profileId,
  })

  const selectedApiStudent = useMemo(
    () => apiStudents.find((student) => student.id === selectedStudent?.id) || null,
    [apiStudents, selectedStudent?.id],
  )

  const selectedIsPermisB = isPermisBStudent(selectedApiStudent || selectedStudent)
  const selectedIsAac = isAacFormation(selectedApiStudent || selectedStudent)


  useEffect(() => {
    if (!selectedStudent?.id || !selectedIsPermisB) {
      setInitialAssessment(null)
      return
    }
    getInitialAssessmentForStudent(selectedStudent.id).then(({ assessment }) => {
      setInitialAssessment(normalizeInitialAssessment(assessment))
    })
  }, [selectedStudent?.id, selectedIsPermisB])

  const refreshLessonObservations = useCallback(async () => {
    if (!selectedStudent?.id) {
      setLessonObservations([])
      return
    }
    setLessonsLoading(true)
    const { lessons } = await listLessonObservationsForStudent(selectedStudent.id)
    setLessonObservations(lessons)
    setLessonsLoading(false)
  }, [selectedStudent?.id])

  useEffect(() => {
    void refreshLessonObservations()
  }, [refreshLessonObservations])

  useEffect(() => {
    setStudentPanelTab('lessons')
    setLessonFormOpen(false)
    setLessonSessionTab('lesson')
  }, [selectedStudentId])

  const refreshPreRegistrations = useCallback(async () => {
    if (!profileId) {
      setPreRegistrations([])
      return
    }
    setPreRegLoading(true)
    const { preRegistrations: rows } = await listPreRegistrations({ teacherId: profileId })
    setPreRegistrations(rows)
    setPreRegLoading(false)
  }, [profileId])

  useEffect(() => {
    void refreshPreRegistrations()
  }, [refreshPreRegistrations])

  useEffect(() => {
    if (!profileId) return undefined
    return subscribePreRegistrations(refreshPreRegistrations)
  }, [profileId, refreshPreRegistrations])

  const lessonHistoryItems = useMemo(() => {
    const lessons = lessonObservations

    const items = lessons.map((lesson) => ({
      type: 'lesson',
      sortAt: lesson.openedAt || `${lesson.date || '1970-01-01'}T${lesson.time || '00:00'}`,
      data: lesson,
    }))

    if (
      initialAssessment
      && ['in_progress', 'completed'].includes(initialAssessment.status)
    ) {
      items.push({
        type: 'initial-assessment',
        sortAt: initialAssessment.completed_at
          || initialAssessment.updated_at
          || initialAssessment.created_at
          || new Date(0).toISOString(),
        data: initialAssessment,
      })
    }

    return items.sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt))
  }, [initialAssessment, lessonObservations])

  const {
    page: historyPage,
    setPage: setHistoryPage,
    totalPages: historyTotalPages,
    totalItems: historyTotalItems,
    pageItems: historyPageItems,
    pageSize: historyPageSize,
  } = useClientPagination(lessonHistoryItems, { pageSize: 5 })

  const handleRemcStatusChange = useCallback(
    async (_studentId, competencyCode, itemId, status) => {
      await updateRemcStatus(competencyCode, itemId, status)
    },
    [updateRemcStatus],
  )

  const openLesson = () => {
    setStudentPanelTab('lessons')
    if (lessonFormOpen) return
    const { date, time } = nowDateTime()
    setNewLesson({
      date,
      time,
      duration: '2H',
      observations: '',
      sharedWithStudent: false,
    })
    setLessonSessionTab('lesson')
    setLessonFormOpen(true)
  }

  const handleCreateLesson = async (event) => {
    event.preventDefault()
    if (!selectedStudent || !organizationId || !profileId) return
    const selectedSkills = (selectedStudentRemc || [])
      .flatMap((competency) => competency.items)
      .filter((item) => item.status !== 'Non commencé')
      .map((item) => item.label)

    setLessonSaving(true)
    const { lesson, error } = await createLessonObservation({
      organizationId,
      studentId: selectedStudent.id,
      teacherId: profileId,
      openedBy: currentTeacherName,
      date: newLesson.date,
      time: newLesson.time,
      duration: newLesson.duration,
      observations: newLesson.observations,
      skills: selectedSkills,
      sharedWithStudent: newLesson.sharedWithStudent,
    })
    setLessonSaving(false)

    if (lesson) {
      await refreshLessonObservations()
      setHoursRefresh((value) => value + 1)
      setLessonFormOpen(false)
      return
    }

    setLessonFormOpen(false)
    if (error) {
      console.error('[TeacherStudentsPage] createLessonObservation', error)
    }
  }

  const handleToggleLessonShare = async (lesson) => {
    const { lesson: updated, error } = await updateLessonObservation(lesson.id, {
      sharedWithStudent: !lesson.sharedWithStudent,
    })
    if (updated) {
      setLessonObservations((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))
    } else if (error) {
      console.error('[TeacherStudentsPage] updateLessonObservation share', error)
    }
  }

  if (studentsLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader description="Ouvrez une leçon, validez les compétences REMC travaillées et notez vos observations." title="Mes élèves" />
        <p className="text-sm font-semibold text-slate-500">Chargement des élèves…</p>
      </div>
    )
  }

  if (studentsError) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader description="Ouvrez une leçon, validez les compétences REMC travaillées et notez vos observations." title="Mes élèves" />
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          Impossible de charger les élèves : {studentsError}
        </p>
        <p className="text-xs text-slate-500">
          Rechargez la page. Si le problème continue, contactez le secrétariat de votre auto-école.
        </p>
      </div>
    )
  }

  if (!displayStudents.length) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <PageHeader description="Ouvrez une leçon, validez les compétences REMC travaillées et notez vos observations." title="Mes élèves" />
        <EmptyState title="Aucun élève enregistré" message="Aucun élève enregistré pour le moment." icon="🎓" />
      </div>
    )
  }

  const canStartLesson = Boolean(selectedStudent && selectedIsPermisB && studentPanelTab === 'lessons' && !lessonFormOpen)
  const selectedPhone = selectedApiStudent?.phone

  return (
    <div className={`mx-auto flex w-full max-w-7xl flex-col gap-6 ${canStartLesson ? 'pb-24 lg:pb-0' : ''}`}>
      <div className={selectedStudent ? 'hidden lg:block' : ''}>
        <PageHeader description="Vos élèves, leurs heures et leur progression REMC. Démarrez une leçon depuis leur fiche." title="Mes élèves" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <aside className={`card-panel flex-col gap-4 ${selectedStudent ? 'hidden lg:flex' : 'flex'}`}>
          <div>
            <h2 className={ui.sectionTitle}>Liste des élèves</h2>
            <label className={`${ui.label} mt-3`}>
              Rechercher par nom ou prénom
              <input
                className={ui.input}
                onChange={(event) => setStudentSearchQuery(event.target.value)}
                type="search"
                value={studentSearchQuery}
              />
            </label>
          </div>

          <div className="grid gap-2 lg:max-h-[min(520px,55vh)] lg:overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Aucun élève ne correspond à « {studentSearchQuery} ».
              </p>
            ) : (
              filteredStudents.map((student) => {
                const apiRow = apiStudents.find((row) => row.id === student.id)
                return (
                  <StudentListItem
                    active={selectedStudentId === student.id}
                    hours={hoursByStudent[student.id]}
                    isAac={isAacFormation(apiRow || student)}
                    key={student.id}
                    onSelect={() => selectStudent(student.id)}
                    phone={apiRow?.phone}
                    student={student}
                  />
                )
              })
            )}
          </div>

          <button
            className={`${ui.btnSecondary} w-full`}
            onClick={() => setPreRegModalOpen(true)}
            type="button"
          >
            Pré-inscrire un élève
          </button>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-900">Mes pré-inscriptions</h3>
            {preRegLoading ? (
              <p className="mt-2 text-xs text-slate-500">Chargement…</p>
            ) : preRegistrations.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Aucune demande pour le moment.</p>
            ) : (
              <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto">
                {preRegistrations.slice(0, 8).map((row) => (
                  <article className="rounded-lg border border-slate-200 bg-white px-3 py-2" key={row.id}>
                    <p className="text-sm font-medium text-slate-900">
                      {formatPersonName(row)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.desired_training}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${preRegistrationStatusClass(row.status)}`}>
                      {PRE_REGISTRATION_STATUS_LABELS[row.status]}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="grid min-w-0 gap-6">
          {!selectedStudent ? (
            <section className="card-panel-lg hidden lg:block">
              <EmptyState
                icon="👆"
                message="Recherchez un élève par nom et prénom, puis cliquez sur sa fiche pour ouvrir une leçon."
                title="Sélectionnez un élève"
              />
            </section>
          ) : (
          <>
          <section className="card-panel-lg">
            <button
              className="-ml-1 mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-slate-600 hover:text-slate-900 lg:hidden"
              onClick={() => setSelectedStudentId(null)}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              Mes élèves
            </button>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <StudentAvatar size="lg" student={selectedStudent} />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900">{formatPersonName(selectedStudent)}</h2>
                  <p className="mt-0.5 text-sm text-slate-500">{selectedStudent.permisSummary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StudentCharterStatusBadge studentId={selectedStudent.id} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CallButton phone={selectedPhone} />
                {selectedIsPermisB ? (
                  <span className="hidden lg:block">
                    <button className={ui.btnPrimary} disabled={lessonFormOpen} onClick={openLesson} type="button">
                      <Timer className="h-4 w-4" />
                      {lessonFormOpen ? 'Leçon en cours' : 'Démarrer une leçon'}
                    </button>
                  </span>
                ) : null}
              </div>
            </div>

            {studentPanelTab === 'lessons' && !lessonFormOpen ? (
              <div className="mt-5">
                <StudentSummary
                  apiStudent={selectedApiStudent}
                  assessment={initialAssessment}
                  hours={hoursByStudent[selectedStudent.id]}
                  isPermisB={selectedIsPermisB}
                  onOpenAssessment={() => setStudentPanelTab('initial-assessment')}
                  progress={selectedRemcProgress}
                  remc={selectedStudentRemc}
                  teacherName={selectedStudent.teacher}
                />
              </div>
            ) : null}

            {(selectedIsPermisB || selectedIsAac) && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <StudentPanelTab
                  active={studentPanelTab === 'lessons'}
                  onClick={() => {
                    setStudentPanelTab('lessons')
                  }}
                >
                  Leçons
                </StudentPanelTab>
                {selectedIsAac && (
                  <StudentPanelTab
                    active={studentPanelTab === 'aac'}
                    onClick={() => {
                      setStudentPanelTab('aac')
                      setLessonFormOpen(false)
                    }}
                  >
                    Conduite accompagnée
                  </StudentPanelTab>
                )}
                {selectedIsPermisB && (
                  <StudentPanelTab
                    active={studentPanelTab === 'initial-assessment'}
                    onClick={() => {
                      setStudentPanelTab('initial-assessment')
                      setLessonFormOpen(false)
                    }}
                  >
                    Évaluation de départ
                  </StudentPanelTab>
                )}
              </div>
            )}

            {studentPanelTab === 'lessons' && lessonFormOpen && selectedIsPermisB && (
              <div className="mt-4">
                <PanelTabs
                  activeId={lessonSessionTab}
                  className="sticky top-0 z-10 rounded-lg border border-slate-200 bg-white/95 p-1.5 backdrop-blur"
                  onChange={setLessonSessionTab}
                  tabs={[
                    { id: 'lesson', label: 'Leçon' },
                    { id: 'remc', label: 'REMC' },
                    { id: 'exam', label: 'Examen blanc' },
                  ]}
                />

                {lessonSessionTab === 'lesson' && (
                <form
                  className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2"
                  onSubmit={handleCreateLesson}
                >
                <label className={ui.label}>
                  Enseignant
                  <input
                    className={ui.input}
                    disabled
                    readOnly
                    value={currentTeacherName}
                  />
                </label>
                <label className={ui.label}>
                  Élève
                  <input
                    className={ui.input}
                    value={formatPersonName(selectedStudent)}
                    disabled
                  />
                </label>
                <label className={ui.label}>
                  Date d’ouverture
                  <input
                    className={ui.input}
                    type="date"
                    required
                    value={newLesson.date}
                    onChange={(event) => setNewLesson((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>
                <label className={ui.label}>
                  Heure d’ouverture
                  <input
                    className={ui.input}
                    type="time"
                    value={newLesson.time}
                    onChange={(event) => setNewLesson((current) => ({ ...current, time: event.target.value }))}
                  />
                </label>
                <label className={ui.label}>
                  Durée
                  <select
                    className={ui.input}
                    value={newLesson.duration}
                    onChange={(event) => setNewLesson((current) => ({ ...current, duration: event.target.value }))}
                  >
                    {lessonDurations.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-slate-500 md:col-span-2">
                  La leçon est enregistrée et comptabilisée dès l&apos;enregistrement ({newLesson.duration}).
                </p>
                <label className={`${ui.label} md:col-span-2`}>
                  Observations pour la prochaine leçon
                  <textarea
                    className={`${ui.input} h-auto min-h-24 py-2`}
                    value={newLesson.observations}
                    onChange={(event) => setNewLesson((current) => ({ ...current, observations: event.target.value }))}
                    placeholder="Ex : retravailler priorités à droite, manque d’anticipation, revoir installation poste."
                  />
                </label>
                <div className="md:col-span-2 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <ShareToggle
                      active={newLesson.sharedWithStudent}
                      onClick={() =>
                        setNewLesson((current) => ({
                          ...current,
                          sharedWithStudent: !current.sharedWithStudent,
                        }))
                      }
                    />
                    <p className="text-xs text-slate-500">
                      {newLesson.sharedWithStudent
                        ? 'Visible par l\'élève dans Historique des leçons.'
                        : 'Visible uniquement par enseignants, secrétariat et gérant.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                  <button
                    disabled={lessonSaving}
                    type="submit"
                    className={ui.btnPrimary}
                  >
                    {lessonSaving ? 'Enregistrement…' : 'Enregistrer la leçon'}
                  </button>
                  <button
                    className={ui.btnSecondary}
                    onClick={() => setLessonFormOpen(false)}
                    type="button"
                  >
                    Annuler
                  </button>
                  <p className="text-xs text-slate-500">
                    Passez à l’onglet REMC pour valider les sous-compétences de cette leçon.
                  </p>
                  </div>
                </div>
                </form>
                )}

                {lessonSessionTab === 'remc' && (
                <div className="mt-4">
                <RemcTeacherValidationPanel
                  embedded
                  onRemcStatusChange={handleRemcStatusChange}
                  organizationId={organizationId}
                  remcCompetencies={selectedStudentRemc || []}
                  studentId={selectedStudent.id}
                  teacherId={profileId}
                />
                </div>
                )}

                {lessonSessionTab === 'exam' && (
                <div className="mt-4">
                <PracticeExamTeacherPanel
                  embedded
                  organizationId={organizationId}
                  student={selectedStudent}
                  teacherId={profileId}
                />
                </div>
                )}
              </div>
            )}

          </section>

          {selectedIsPermisB && studentPanelTab === 'lessons' && !lessonFormOpen && (
          <section className="card-panel-lg">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className={ui.sectionTitle}>Dernier QCU en ligne</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Dernier QCU travaillé et réussi par l&apos;élève (seuil 80 %, minimum 8/10).
                </p>
              </div>
            </div>
            <div className="mt-4">
              <LessonModuleQcuProgressPanel studentId={selectedStudent.id} />
            </div>
          </section>
          )}

          {selectedIsPermisB && studentPanelTab === 'lessons' && !lessonFormOpen && (
          <section className="card-panel-lg">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className={ui.sectionTitle}>Historique des leçons</h2>
              {historyTotalItems > 0 && (
                <p className="text-xs text-slate-500">{historyTotalItems} entrée{historyTotalItems > 1 ? 's' : ''}</p>
              )}
            </div>
            {lessonsLoading ? (
              <p className="mt-4 text-sm text-slate-500">Chargement…</p>
            ) : lessonHistoryItems.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon="📓"
                message="Les leçons enregistrées et l'évaluation de départ apparaîtront ici."
                title="Aucun historique"
              />
            ) : (
            <>
            <div className="mt-4 grid gap-3">
              {historyPageItems.map((item) => {
                if (item.type === 'initial-assessment') {
                  const assessment = item.data
                  const teacherComment = (assessment.answers?.teacher_comment || '').trim()
                  return (
                    <article
                      className="card-muted bg-blue-50/40"
                      key={`assessment-${assessment.id}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Évaluation de départ
                          {assessment.completed_at
                            ? ` · ${formatDateFr(assessment.completed_at.slice(0, 10))}`
                            : ''}
                        </h3>
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {formatAssessmentStatus(assessment.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Réalisée par : <strong>{assessment.teacherName || 'Enseignant'}</strong>
                        {assessment.completed_at
                          ? ` · ${new Date(assessment.completed_at).toLocaleString('fr-FR')}`
                          : ''}
                      </p>
                      {assessment.status === 'completed' && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                          {assessment.final_score != null && (
                            <span>Score : <strong>{assessment.final_score} %</strong></span>
                          )}
                          <span className="inline-flex flex-wrap items-center gap-2">
                            Volume préconisé : <strong>{formatRecommendedHours(assessment)}</strong>
                            <HoursProposalStatusBadge assessment={assessment} />
                          </span>
                        </div>
                      )}
                      {teacherComment && (
                        <p className="mt-2 text-sm text-slate-700">
                          Commentaire : {teacherComment}
                        </p>
                      )}
                      <button
                        className={`${ui.btnSmall} mt-3`}
                        onClick={() => setStudentPanelTab('initial-assessment')}
                        type="button"
                      >
                        {assessment.status === 'completed' ? 'Consulter l\'évaluation' : 'Continuer l\'évaluation'}
                      </button>
                    </article>
                  )
                }

                const lesson = item.data
                const teacherName = lesson.openedBy || 'Enseignant'
                const closingTeacher = lesson.closedBy || lesson.openedBy || ''
                const sameTeacher = !closingTeacher || closingTeacher === lesson.openedBy
                const openingLabel = formatLessonOpeningLabel(lesson.date, lesson.time)
                const closingLabel = formatLessonClosingLabel(lesson.date, lesson.time, lesson.duration)
                const closingTime = closingLabel.includes(' · ') ? closingLabel.split(' · ').pop() : closingLabel

                return (
                <article key={lesson.id} className="card-muted">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Leçon du {formatLessonDateFr(lesson.date) || 'date non renseignée'} · {lesson.time || '--:--'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <ShareToggle
                        active={lesson.sharedWithStudent}
                        compact
                        onClick={() => handleToggleLessonShare(lesson)}
                      />
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Terminée · {lesson.duration}
                      </span>
                    </div>
                  </div>
                  {sameTeacher ? (
                    <p className="mt-2 text-sm text-slate-600">
                      <strong>{teacherName}</strong>
                      {' · '}
                      {openingLabel}
                      {closingTime && closingTime !== '--:--' ? ` → ${closingTime}` : ''}
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-slate-600">
                        Ouverture : <strong>{teacherName}</strong> · {openingLabel}
                      </p>
                      <p className="text-sm text-slate-600">
                        Clôture : <strong>{closingTeacher}</strong> · {closingLabel}
                      </p>
                    </>
                  )}
                  <p className="mt-2 text-sm text-slate-700">
                    Observations pour la prochaine leçon : {lesson.observations || 'Aucune'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(lesson.skills || []).map((skill) => (
                      <span key={skill} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </article>
                )
              })}
            </div>
            <PaginationBar
              className="mt-4"
              onPageChange={setHistoryPage}
              page={historyPage}
              pageSize={historyPageSize}
              totalItems={historyTotalItems}
              totalPages={historyTotalPages}
            />
            </>
            )}
          </section>
          )}

          {studentPanelTab === 'aac' && selectedIsAac && (
            <section className="card-panel-lg">
              <AacPanel
                birthDate={(selectedApiStudent || selectedStudent)?.birth_date}
                key={selectedStudent.id}
                lockedTeacher={{ id: profileId, name: currentTeacherName }}
                mode="staff"
                showRvp={false}
                showTrips={false}
                organizationId={organizationId}
                senderName={profile?.full_name}
                studentId={selectedStudent.id}
                userId={profileId}
              />
            </section>
          )}

          {studentPanelTab === 'initial-assessment' && selectedIsPermisB && (
            <InitialAssessmentWizard
              assessment={initialAssessment}
              completedBy={profileId}
              onComplete={() => setStudentPanelTab('lessons')}
              onSaved={(saved) => setInitialAssessment(normalizeInitialAssessment(saved))}
              organizationId={organizationId}
              readOnly={initialAssessment?.status === 'completed'}
              student={selectedApiStudent || selectedStudent}
              studentId={selectedStudent.id}
              teacherMode
            />
          )}

          {!selectedIsPermisB && (
            <section className="card-panel-lg">
              <EmptyState
                icon="🏍️"
                message="Le suivi REMC, les examens blancs et l'évaluation de départ ne concernent pas les parcours Moto et AM."
                title="Parcours Moto / AM"
              />
            </section>
          )}
          </>
          )}
        </main>
      </div>

      {canStartLesson ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <button className={`${ui.btnPrimary} h-12 w-full text-base`} onClick={openLesson} type="button">
            <Timer className="h-5 w-5" />
            Démarrer une leçon
          </button>
        </div>
      ) : null}

      <PreRegistrationFormModal
        onClose={() => setPreRegModalOpen(false)}
        onCreated={() => {
          void refreshPreRegistrations()
        }}
        open={preRegModalOpen}
        organizationId={organizationId}
        teacherId={profileId}
      />
    </div>
  )
}
