import { useCallback, useEffect, useMemo, useState } from 'react'
import { CallButton, StudentAvatar } from '../../components/teacher/TeacherStudentViews'
import { useSecretaryDuties } from '../../hooks/useSecretaryDuties'
import { ui } from '../../components/ui/styles'
import PageHeader from '../../components/ui/PageHeader'
import { useSearchParams } from 'react-router-dom'
import AddStudentModal from '../../components/AddStudentModal'
import AacPanel from '../../components/aac/AacPanel'
import EmptyState from '../../components/ui/EmptyState'
import ListSearchField from '../../components/ui/ListSearchField'
import PaginationBar from '../../components/ui/PaginationBar'
import { useAuth } from '../../context/AuthContext'
import { matchStudentSearch, useClientPagination } from '../../hooks/useClientPagination'
import { isAacFormation, resolveStudentTrack, getTrackLabel } from '../../lib/studentTrack'
import { getAssessmentStatusStyles } from '../../data/initialAssessmentForm'
import { formatPersonName } from '../../lib/staffAccounts'
import { formatAssessmentStatus, listInitialAssessmentsForStudents } from '../../services/initialAssessment'
import { listStudents, resendStudentAccessEmail, subscribeStudents } from '../../services/students'
import { getUserFacingError } from '../../lib/userFacingError'
import StudentCharterStatusBadge from '../../components/students/StudentCharterStatusBadge'
import {
  isArchivedStudent,
  LICENSE_RESULT,
  statusBadgeClass,
} from '../../lib/studentJourney'
import { reactivateStudentAccess } from '../../services/studentJourney'

function formatDateFr(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return value
  }
}

function referentTeacher(student) {
  const assignments = student.student_assignments || []
  const referent = assignments.find((row) => row.is_referent) || assignments[0]
  return referent?.teacher?.full_name || null
}

export default function AdminStudentsPage() {
  const { profileId, organizationId } = useAuth()
  // Inscriptions et dossiers : secrétariat, ou gérant s'il n'y a pas de secrétaire.
  const { canDoSecretaryTasks: canWrite, managerCovers } = useSecretaryDuties()
  const [openStudentId, setOpenStudentId] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightStudentId = searchParams.get('student')
  const [students, setStudents] = useState([])
  const [assessmentsByStudent, setAssessmentsByStudent] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewTab, setViewTab] = useState('active')
  const [actionBusy, setActionBusy] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [selectedAacStudentId, setSelectedAacStudentId] = useState(null)

  const filteredStudents = useMemo(() => {
    if (viewTab === 'archived') {
      return students.filter(isArchivedStudent)
    }
    return students.filter((student) => !isArchivedStudent(student))
  }, [students, viewTab])

  const archivedCount = useMemo(
    () => students.filter(isArchivedStudent).length,
    [students],
  )

  const activeCount = students.length - archivedCount

  const {
    page,
    setPage,
    totalPages,
    totalItems,
    pageItems,
    pageSize,
  } = useClientPagination(filteredStudents, {
    pageSize: 8,
    query: searchQuery,
    filterFn: matchStudentSearch,
  })

  const refresh = useCallback(async () => {
    if (!profileId) {
      setStudents([])
      setAssessmentsByStudent({})
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const { students: rows, error } = await listStudents()
    if (error) setLoadError('Impossible de charger la liste des élèves.')
    setStudents(rows)
    const studentIds = rows.map((row) => row.id)
    const { assessments } = await listInitialAssessmentsForStudents(studentIds)
    const map = Object.fromEntries((assessments || []).map((row) => [row.student_id, row]))
    setAssessmentsByStudent(map)
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!profileId) return undefined
    return subscribeStudents(refresh)
  }, [profileId, refresh])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('new') === '1' && canWrite) setModalOpen(true)
  }, [canWrite])

  useEffect(() => {
    setPage(1)
  }, [viewTab, setPage])

  useEffect(() => {
    if (highlightStudentId) setSelectedAacStudentId(highlightStudentId)
  }, [highlightStudentId])

  const aacStudent = useMemo(() => {
    const id = selectedAacStudentId || highlightStudentId
    if (!id) return null
    return students.find((row) => row.id === id && isAacFormation(row)) || null
  }, [students, selectedAacStudentId, highlightStudentId])

  const clearAacPanel = () => {
    setSelectedAacStudentId(null)
    if (highlightStudentId) {
      const next = new URLSearchParams(searchParams)
      next.delete('student')
      setSearchParams(next, { replace: true })
    }
  }

  const runResendAccess = async (student) => {
    if (!canWrite || !student.profile_id || !student.email) return
    const name = formatPersonName(student)
    if (!window.confirm(`Renvoyer un e-mail d'accès avec mot de passe provisoire à ${name} ?`)) return

    setActionBusy(student.id)
    setFeedback(null)
    const { error, message, emailSent } = await resendStudentAccessEmail(student.id)
    setActionBusy(null)

    if (error) {
      setFeedback({ type: 'error', text: getUserFacingError(error, 'invite') })
      return
    }

    setFeedback({
      type: emailSent ? 'ok' : 'warn',
      text: message || 'Accès renvoyé.',
    })
  }

  const runReactivateAccess = async (student) => {
    if (!canWrite || !student.profile_id) return
    const name = formatPersonName(student)
    if (!window.confirm(`Réactiver l'accès Pedagogia Drive de ${name} pour 365 jours ?`)) return

    setActionBusy(student.id)
    setFeedback(null)
    const { error } = await reactivateStudentAccess(student.id)
    setActionBusy(null)

    if (error) {
      setFeedback({ type: 'error', text: getUserFacingError(error, 'save') })
      return
    }

    setFeedback({ type: 'ok', text: `Accès de ${name} réactivé pour 365 jours.` })
    refresh()
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          canWrite ? (
            <button className={ui.btnPrimary} onClick={() => setModalOpen(true)} type="button">
              Ajouter un élève
            </button>
          ) : null
        }
        description={
          managerCovers
            ? 'Créez les comptes élèves et suivez les dossiers. Sans secrétaire, c’est vous qui inscrivez.'
            : 'Les dossiers et inscriptions de vos élèves. Les inscriptions se font par le secrétariat.'
        }
        title="Élèves"
      />

      {feedback && (
        <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
          feedback.type === 'ok'
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            : feedback.type === 'warn'
              ? 'border border-amber-200 bg-amber-50 text-amber-800'
              : 'border border-rose-200 bg-rose-50 text-rose-700'
        }`}>
          {feedback.text}
        </p>
      )}

      {aacStudent && (
        <section className="rounded-xl border border-blue-200 bg-white p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold text-blue-700">Conduite accompagnée</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{formatPersonName(aacStudent)}</h2>
            </div>
            <button
              className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={clearAacPanel}
              type="button"
            >
              Fermer
            </button>
          </div>
          <AacPanel
            key={aacStudent.id}
            birthDate={aacStudent.birth_date}
            mode="staff"
            organizationId={organizationId || aacStudent.organization_id}
            readOnly={!canWrite}
            studentId={aacStudent.id}
            userId={profileId}
          />
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        {!profileId ? (
          <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte gérant." icon="🎓" />
        ) : loading ? (
          <p className="text-sm font-medium text-slate-500">Chargement des élèves…</p>
        ) : loadError ? (
          <EmptyState title="Erreur de chargement" message={loadError} icon="⚠️" />
        ) : students.length === 0 ? (
          <EmptyState title="Aucun élève enregistré" message="Ajoutez votre premier élève pour créer son compte et son dossier." icon="🎓" />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            title={viewTab === 'archived' ? 'Aucun dossier archivé' : 'Aucun dossier actif'}
            message={viewTab === 'archived'
              ? 'Les dossiers archivés apparaissent ici après l\'obtention du permis.'
              : 'Tous les élèves sont dans les dossiers archivés.'}
            icon="🎓"
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setViewTab('active')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  viewTab === 'active'
                    ? 'bg-[#1769FF] text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Dossiers actifs ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setViewTab('archived')}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  viewTab === 'archived'
                    ? 'bg-emerald-700 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Dossiers archivés ({archivedCount})
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <ListSearchField onChange={setSearchQuery} value={searchQuery} />
              <p className="text-xs text-slate-500">{totalItems} élève{totalItems > 1 ? 's' : ''}</p>
            </div>
            {pageItems.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon="🔍"
                message="Aucun élève ne correspond à votre recherche."
                title="Aucun résultat"
              />
            ) : (
          <div className="mt-4 grid gap-2">
            {pageItems.map((student) => {
              const track = resolveStudentTrack(student)
              const assessment = assessmentsByStudent[student.id]
              const formationLabel = student.package_name || student.formation_type || getTrackLabel(track)
              const assessmentStatus = assessment?.status || 'pending'
              const assessmentStyles = getAssessmentStatusStyles(assessmentStatus)
              return (
              <article key={student.id} className="min-w-0 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-3 p-3">
                  <StudentAvatar student={student} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{formatPersonName(student)}</p>
                    <p className="truncate text-xs text-slate-500">{formationLabel}</p>
                  </div>
                  <CallButton phone={student.phone} />
                  <button
                    aria-expanded={openStudentId === student.id}
                    className={`${ui.btnSmall} shrink-0 whitespace-nowrap`}
                    onClick={() => setOpenStudentId((current) => (current === student.id ? null : student.id))}
                    type="button"
                  >
                    {openStudentId === student.id ? 'Fermer' : (
                      <>
                        <span className="sm:hidden">Fiche</span>
                        <span className="hidden sm:inline">Ouvrir la fiche</span>
                      </>
                    )}
                  </button>
                </div>
                {openStudentId === student.id ? (
                  <div className="border-t border-slate-100 p-4">
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-blue-700">{student.file_number || 'Dossier en cours'}</p>
                        <p className="mt-2 text-sm text-slate-600">{student.email || '—'}</p>
                        {student.phone && <p className="text-sm text-slate-500">{student.phone}</p>}
                        {referentTeacher(student) && (
                          <p className="mt-1 text-xs font-medium text-slate-500">Référent : {referentTeacher(student)}</p>
                        )}
                        <p className="mt-3 text-sm"><span className="font-semibold text-slate-500">Formation :</span> {formationLabel}</p>
                        {track === 'permis_b' && (
                          <details className={`mt-3 rounded-xl border px-3 py-2 ${assessmentStyles.container}`}>
                            <summary className={`cursor-pointer text-sm font-semibold ${assessmentStyles.summary}`}>
                              Évaluation de départ · {formatAssessmentStatus(assessmentStatus)}
                            </summary>
                            <div className="mt-3 grid grid-cols-1 gap-2 pb-2 text-sm sm:grid-cols-2">
                              <p><span className="font-semibold text-slate-500">Date :</span> {assessment?.completed_at ? formatDateFr(assessment.completed_at) : '—'}</p>
                              <p><span className="font-semibold text-slate-500">Score obtenu :</span> {assessment?.status === 'completed' ? assessment.final_score : '—'}</p>
                              <p><span className="font-semibold text-slate-500">Heures recommandées :</span> {assessment?.recommended_hours_min ? `${assessment.recommended_hours_min}${assessment.recommended_hours_max !== assessment.recommended_hours_min ? ` à ${assessment.recommended_hours_max}` : ''} h` : '—'}</p>
                              <p className="sm:col-span-2"><span className="font-semibold text-slate-500">Enseignant évaluateur :</span> {assessment?.teacher?.full_name || '—'}</p>
                            </div>
                          </details>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-3 lg:items-end">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            {getTrackLabel(track)}
                          </span>
                          <StudentCharterStatusBadge studentId={student.id} />
                          {student.license_result === LICENSE_RESULT.OBTAINED && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              ✅ Permis obtenu
                            </span>
                          )}
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(student.status, student.license_result)}`}>
                            {student.status || 'En attente'}
                          </span>
                          {student.license_obtained_at && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Obtenu le {formatDateFr(student.license_obtained_at)}
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            Inscrit le {formatDateFr(student.registration_date)}
                          </span>
                        </div>
                        {canWrite && student.profile_id && student.email && !isArchivedStudent(student) && (
                          <button
                            type="button"
                            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
                            disabled={actionBusy === student.id}
                            onClick={() => runResendAccess(student)}
                          >
                            {actionBusy === student.id ? 'Envoi…' : 'Renvoyer l\'accès par e-mail'}
                          </button>
                        )}
                        {isAacFormation(student) && (
                          <button
                            type="button"
                            className="rounded-xl border border-navy-200 bg-[#1769FF] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                            onClick={() => setSelectedAacStudentId(student.id)}
                          >
                            Suivi AAC
                          </button>
                        )}
                        {canWrite && isArchivedStudent(student) && student.profile_id && (
                          <button
                            type="button"
                            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
                            disabled={actionBusy === student.id}
                            onClick={() => runReactivateAccess(student)}
                          >
                            {actionBusy === student.id ? 'Réactivation…' : 'Réactiver l\'accès élève (365 j)'}
                          </button>
                        )}
                        {isArchivedStudent(student) && (
                          <p className="text-xs font-medium text-slate-500">
                            Dossier en lecture seule — formation terminée
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
              )
            })}
          </div>
            )}
            <PaginationBar
              className="mt-4"
              onPageChange={setPage}
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              totalPages={totalPages}
            />
          </>
        )}
      </section>

      <AddStudentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  )
}
