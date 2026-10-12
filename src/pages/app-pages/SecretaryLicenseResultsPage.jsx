import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { formatPersonName } from '../../lib/staffAccounts'
import { getUserFacingError } from '../../lib/userFacingError'
import {
  LICENSE_RESULT,
  licenseResultLabel,
  statusBadgeClass,
  STUDENT_STATUS,
} from '../../lib/studentJourney'
import { listStudentsForLicenseResult, recordLicenseResult } from '../../services/studentJourney'
import { subscribeStudents } from '../../services/students'

const RESULT_OPTIONS = [
  { id: LICENSE_RESULT.OBTAINED, label: '✅ Permis obtenu', tone: 'emerald' },
  { id: LICENSE_RESULT.FAILED, label: '❌ Permis refusé', tone: 'rose' },
  { id: LICENSE_RESULT.PENDING, label: '⏳ Résultat en attente', tone: 'violet' },
]

function toneButtonClass(tone, selected) {
  if (!selected) {
    return 'border-slate-300 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50'
  }
  if (tone === 'emerald') return 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'
  if (tone === 'rose') return 'border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-100'
  return 'border-violet-300 bg-violet-50 text-violet-800 ring-2 ring-violet-100'
}

export default function SecretaryLicenseResultsPage() {
  const { profileId } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const refresh = useCallback(async () => {
    if (!profileId) {
      setStudents([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const { students: rows, error } = await listStudentsForLicenseResult()
    if (error) setLoadError('Impossible de charger les dossiers.')
    setStudents(rows)
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!profileId) return undefined
    return subscribeStudents(refresh)
  }, [profileId, refresh])

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedId) || null,
    [students, selectedId],
  )

  const awaitingCount = useMemo(
    () => students.filter(
      (student) => student.status === STUDENT_STATUS.EXAM_AWAITING_RESULT
        || student.license_result === LICENSE_RESULT.AWAITING
        || student.license_result === LICENSE_RESULT.PENDING,
    ).length,
    [students],
  )

  const submitResult = async (event) => {
    event.preventDefault()
    if (!selectedId || !result) return
    setSaving(true)
    setFeedback(null)
    const { data, error } = await recordLicenseResult(selectedId, result)
    setSaving(false)
    if (error) {
      setFeedback({ type: 'error', message: getUserFacingError(error) })
      return
    }
    if (result === LICENSE_RESULT.OBTAINED) {
      setFeedback({
        type: 'ok',
        message: 'Permis obtenu enregistré. Le dossier a été archivé et le personnel a été notifié.',
      })
    } else if (result === LICENSE_RESULT.FAILED) {
      setFeedback({ type: 'ok', message: 'Permis refusé enregistré. Le dossier reste actif pour la reprise de formation.' })
    } else {
      setFeedback({ type: 'ok', message: 'Statut mis à jour : résultat en attente.' })
    }
    setSelectedId('')
    setResult('')
    refresh()
  }

  if (!profileId) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte secrétariat." icon="🎫" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="overflow-hidden rounded-[2rem] border-2 border-slate-300 bg-white shadow-[var(--shadow-card)]">
        <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-cyan-900 p-6 text-white md:p-8">
          <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-sm font-semibold text-cyan-100">
            Fin de parcours
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Résultat du permis</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-blue-50">
            Enregistrez le retour d&apos;examen pratique. Un permis obtenu archive automatiquement le dossier et bloque les nouvelles réservations.
          </p>
          <p className="mt-4 text-sm font-semibold text-cyan-100">
            {awaitingCount} élève(s) en attente de résultat
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-2xl font-extrabold text-slate-950">Élèves concernés</h2>
          <div className="mt-5 grid gap-3">
            {loading ? (
              <p className="text-sm text-slate-500">Chargement…</p>
            ) : loadError ? (
              <EmptyState title="Erreur" message={loadError} icon="⚠️" />
            ) : students.length === 0 ? (
              <EmptyState
                title="Aucun dossier en attente"
                message="Les élèves apparaissent ici après l'inscription à un examen pratique (Permis B, AAC, Boîte auto)."
                icon="🎓"
              />
            ) : (
              students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedId(student.id)}
                  className={`rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                    selectedId === student.id ? 'border-cyan-300 bg-cyan-50' : 'border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-extrabold text-slate-950">{formatPersonName(student)}</h3>
                      <p className="mt-1 text-sm text-slate-500">{student.file_number || student.id.slice(0, 8)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusBadgeClass(student.status, student.license_result)}`}>
                      {student.status || licenseResultLabel(student.license_result)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <aside className="rounded-[2rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs font-black uppercase tracking-wide text-cyan-700">Enregistrer le résultat</p>
          <form className="mt-5 grid gap-4" onSubmit={submitResult}>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Élève</span>
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                onChange={(event) => setSelectedId(event.target.value)}
                required
                value={selectedId}
              >
                <option value="">Sélectionner un élève…</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {formatPersonName(student)}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-bold text-slate-700">Résultat</legend>
              {RESULT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setResult(option.id)}
                  className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-bold transition ${toneButtonClass(option.tone, result === option.id)}`}
                >
                  {option.label}
                </button>
              ))}
            </fieldset>

            {selectedStudent && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-bold text-slate-800">{formatPersonName(selectedStudent)}</p>
                <p className="mt-1">Statut actuel : {selectedStudent.status || '—'}</p>
              </div>
            )}

            {feedback && (
              <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                feedback.type === 'ok'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border border-rose-200 bg-rose-50 text-rose-700'
              }`}
              >
                {feedback.message}
              </p>
            )}

            <button
              className="rounded-2xl bg-navy-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedId || !result || saving}
              type="submit"
            >
              {saving ? 'Enregistrement…' : 'Valider le résultat'}
            </button>
          </form>
        </aside>
      </section>
    </div>
  )
}
