import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ui } from '../../components/ui/styles'
import PageHeader from '../../components/ui/PageHeader'
import { useSearchParams } from 'react-router-dom'
import AddStudentModal from '../../components/AddStudentModal'
import EmptyState from '../../components/ui/EmptyState'
import ListSearchField from '../../components/ui/ListSearchField'
import PaginationBar from '../../components/ui/PaginationBar'
import { useAuth } from '../../context/AuthContext'
import { matchStudentSearch, useClientPagination } from '../../hooks/useClientPagination'
import { listStudents, subscribeStudents } from '../../services/students'
import { contractsMap, getStudentSummary } from '../../services/finance'
import { supabase } from '../../lib/supabase'
import { formatPersonName } from '../../lib/staffAccounts'
import { isAacFormation } from '../../lib/studentTrack'
import AacPanel from '../../components/aac/AacPanel'
import {
  isArchivedStudent,
  LICENSE_RESULT,
  statusBadgeClass,
} from '../../lib/studentJourney'

function formatDateFr(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return value
  }
}

export default function SecretaryInscriptionsPage() {
  const { profileId, canWrite, organizationId } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const highlightStudentId = searchParams.get('student')
  const highlightedRef = useRef(null)
  const [students, setStudents] = useState([])
  const [contracts, setContracts] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewTab, setViewTab] = useState('active')

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
      setContracts([])
      setPayments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const [{ students: rows, error }, contractsRes, paymentsRes] = await Promise.all([
      listStudents(),
      supabase.from('contracts').select('student_id, contract_total'),
      supabase.from('payments').select('student_id, amount'),
    ])
    if (error) setLoadError('Impossible de charger les dossiers.')
    setStudents(rows)
    setContracts(contractsRes.data || [])
    setPayments(paymentsRes.data || [])
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!profileId) return undefined
    const cleanupStudents = subscribeStudents(refresh)
    const cleanupContracts = supabase
      .channel(`secretary-contracts:${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, refresh)
      .subscribe()
    const cleanupPayments = supabase
      .channel(`secretary-payments:${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refresh)
      .subscribe()

    return () => {
      cleanupStudents()
      supabase.removeChannel(cleanupContracts)
      supabase.removeChannel(cleanupPayments)
    }
  }, [profileId, refresh])

  const contractTotals = useMemo(() => contractsMap(contracts), [contracts])

  const highlightedStudent = useMemo(
    () => students.find((student) => student.id === highlightStudentId) || null,
    [students, highlightStudentId],
  )

  useEffect(() => {
    setPage(1)
  }, [viewTab, setPage])

  useEffect(() => {
    if (!highlightStudentId || !students.length) return
    const highlighted = students.find((student) => student.id === highlightStudentId)
    if (highlighted && isArchivedStudent(highlighted)) {
      setViewTab('archived')
    }
    const index = filteredStudents.findIndex((student) => student.id === highlightStudentId)
    if (index >= 0) {
      setPage(Math.floor(index / 8) + 1)
    }
  }, [highlightStudentId, students, filteredStudents, setPage])

  useEffect(() => {
    if (!highlightStudentId || !highlightedRef.current) return
    highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightStudentId, page, students.length])

  const clearHighlightedStudent = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('student')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          <button className={ui.btnPrimary} disabled={!canWrite} onClick={() =>
            setShowForm(true)}
              type="button"
            >
              + Nouvelle inscription
          </button>
        }
        description="Créez les dossiers élèves. Les inscriptions sont synchronisées en temps réel."
        title="Inscriptions"
      />

      {highlightedStudent && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold text-red-700">Rappel — dossier à suivre</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{formatPersonName(highlightedStudent)}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Code de la route : {highlightedStudent.code_status === 'Obtenu' ? 'obtenu' : 'non obtenu'}
              </p>
            </div>
            <button
              className="rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
              onClick={clearHighlightedStudent}
              type="button"
            >
              Fermer
            </button>
          </div>
          {isAacFormation(highlightedStudent) && (
            <div className="mt-4 rounded-xl border border-white bg-white p-4">
              <AacPanel
                key={highlightedStudent.id}
                birthDate={highlightedStudent.birth_date}
                mode="staff"
                organizationId={organizationId || highlightedStudent.organization_id}
                studentId={highlightedStudent.id}
                userId={profileId}
              />
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Dossiers enregistrés</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chaque inscription enregistrée apparaît immédiatement ici.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
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
          {!loading && students.length > 0 && (
            <p className="text-xs font-semibold text-slate-500">{totalItems} dossier(s)</p>
          )}
        </div>
        <div className="mt-5 grid gap-3">
          {!profileId ? (
            <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte secrétariat." icon="🗂️" />
          ) : loading ? (
            <p className="text-sm font-medium text-slate-500">Chargement des dossiers…</p>
          ) : loadError ? (
            <EmptyState title="Erreur de chargement" message={loadError} icon="⚠️" />
          ) : students.length === 0 ? (
            <EmptyState title="Aucun dossier disponible" message="Créez une nouvelle inscription pour commencer." icon="🗂️" />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              title={viewTab === 'archived' ? 'Aucun dossier archivé' : 'Aucun dossier actif'}
              message={viewTab === 'archived'
                ? 'Les dossiers archivés apparaissent ici après l\'obtention du permis.'
                : 'Créez une nouvelle inscription pour commencer.'}
              icon="🗂️"
            />
          ) : pageItems.length === 0 ? (
            <EmptyState title="Aucun résultat" message="Aucun dossier ne correspond à votre recherche." icon="🔍" />
          ) : (
            pageItems.map((student) => {
              const summary = getStudentSummary(student.id, payments, contractTotals)
              const isHighlighted = student.id === highlightStudentId
              return (
                <article
                  className={`rounded-2xl border p-4 ${
                    isHighlighted
                      ? 'border-red-300 bg-red-50/70 shadow-md ring-2 ring-red-200'
                      : 'border-slate-300 bg-slate-50'
                  }`}
                  key={student.id}
                  ref={isHighlighted ? highlightedRef : null}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {formatPersonName(student)}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {student.file_number || 'Dossier en cours'} · {student.package_name || student.formation_type || 'Formule non renseignée'}
                      </p>
                      {student.email && <p className="mt-1 text-xs text-slate-500">{student.email}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {student.package_name || student.formation_type || 'Formule non renseignée'}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          student.code_status === 'Obtenu'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        Code {student.code_status === 'Obtenu' ? 'obtenu' : 'non obtenu'}
                      </span>
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
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Reste {summary.remaining.toFixed(0)} €
                      </span>
                      {student.registration_date && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Inscrit le {formatDateFr(student.registration_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>
        {!loading && filteredStudents.length > 0 && (
          <PaginationBar
            className="mt-4"
            onPageChange={setPage}
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
          />
        )}
      </section>

      <AddStudentModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => refresh()}
      />
    </div>
  )
}
