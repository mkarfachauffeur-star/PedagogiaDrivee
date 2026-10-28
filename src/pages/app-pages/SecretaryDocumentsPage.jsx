import { useEffect, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  listDocuments,
  listStudentsForDocuments,
  subscribeToDocuments,
  uploadStudentDocument,
} from '../../services/documents'
import { getUserFacingError } from '../../lib/userFacingError'

const formatDate = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

const emptyForm = {
  type: DOCUMENT_CATEGORIES[0],
  reference: '',
  status: DOCUMENT_STATUSES[0],
  folder: 'Dossier administratif',
  comment: '',
}

export default function SecretaryDocumentsPage() {
  const { profileId, organizationId } = useAuth()

  const [query, setQuery] = useState('')
  const [students, setStudents] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [documents, setDocuments] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || null
  const hasSelectedStudent = Boolean(selectedStudentId)

  // Recherche des dossiers élèves.
  useEffect(() => {
    if (!profileId) return undefined
    let active = true
    listStudentsForDocuments({ search: query }).then((rows) => active && setStudents(rows))
    return () => {
      active = false
    }
  }, [profileId, query])

  // Documents (de l'élève sélectionné ou de toute l'auto-école) + temps réel.
  useEffect(() => {
    if (!profileId) return undefined
    let active = true
    const refresh = () => {
      listDocuments({ studentId: selectedStudentId || undefined }).then((rows) => active && setDocuments(rows))
    }
    refresh()
    const unsubscribe = subscribeToDocuments(refresh)
    return () => {
      active = false
      unsubscribe()
    }
  }, [profileId, selectedStudentId])

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const saveDocument = async (event) => {
    event.preventDefault()
    if (!hasSelectedStudent || !organizationId || !file) return
    setStatus(null)
    setSubmitting(true)
    const { error } = await uploadStudentDocument({
      organizationId,
      studentId: selectedStudentId,
      type: form.type,
      status: form.status,
      folder: form.folder,
      reference: form.reference,
      comment: form.comment,
      file,
      createdBy: profileId,
    })
    setSubmitting(false)
    if (error) {
      setStatus({ type: 'error', message: getUserFacingError(error, 'document') })
      return
    }
    setStatus({ type: 'ok', message: 'Document enregistré.' })
    setForm(emptyForm)
    setFile(null)
    setFileInputKey((k) => k + 1)
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader description="Les pièces déposées par les élèves et celles classées depuis la messagerie." title="Documents" />

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte pour gérer les documents." icon="📄" />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <aside className="rounded-xl border border-slate-300 bg-white/85 p-5 backdrop-blur-xl">
              <h2 className="text-2xl font-semibold text-slate-950">Dossier élève</h2>
              <div className="mt-5">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Recherche élève</span>
                  <input
                    className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nom et prénom, ou numéro dossier…"
                    value={query}
                  />
                </label>
                <div className="mt-4 space-y-3">
                  {students.length === 0 && (
                    <EmptyState title="Aucun élève disponible" message="Aucun élève disponible pour le moment." icon="👤" />
                  )}
                  {students.map((student) => (
                    <button
                      className={`w-full rounded-2xl border p-4 text-left transition ${selectedStudentId === student.id ? 'border-blue-300 bg-blue-50 shadow-md' : 'border-slate-300 bg-white hover:bg-blue-50'}`}
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      type="button"
                    >
                      <span className="block font-semibold text-slate-950">{student.name}</span>
                      <span className="mt-1 block text-sm text-slate-500">{student.fileNumber || student.id} · {student.status}</span>
                    </button>
                  ))}
                </div>
              </div>

              <article className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-700">Dossier sélectionné</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{selectedStudent?.name || 'Aucun élève sélectionné'}</h3>
                <p className="mt-1 text-sm text-slate-600">{selectedStudent ? `${selectedStudent.fileNumber || selectedStudent.id} · ${selectedStudent.status}` : '—'}</p>
              </article>
            </aside>

            <form className="rounded-xl border border-slate-300 bg-white/85 p-5 backdrop-blur-xl" onSubmit={saveDocument}>
              <h2 className="text-2xl font-semibold text-slate-950">Déposer un document</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectField label="Type de document" onChange={(value) => updateForm('type', value)} value={form.type} options={DOCUMENT_CATEGORIES} />
                <Field label="Référence document" onChange={(value) => updateForm('reference', value)} value={form.reference} />
                <SelectField label="Statut" onChange={(value) => updateForm('status', value)} value={form.status} options={DOCUMENT_STATUSES} />
                <SelectField label="Classement dossier" onChange={(value) => updateForm('folder', value)} value={form.folder} options={['Dossier administratif', 'Paiement', 'ANTS', 'Contrat', 'Examen', 'Archive']} />
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Téléverser un fichier</span>
                  <input
                    key={fileInputKey}
                    className="mt-2 min-h-12 w-full rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-[#1769FF] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                  />
                  {file && <span className="mt-2 block text-xs font-semibold text-blue-700">Fichier sélectionné : {file.name}</span>}
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Commentaire</span>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    onChange={(event) => updateForm('comment', event.target.value)}
                    value={form.comment}
                  />
                </label>
              </div>

              {status && (
                <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${status.type === 'ok' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}>
                  {status.message}
                </p>
              )}
              {!hasSelectedStudent && (
                <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Veuillez sélectionner un élève avant d'enregistrer un document.
                </p>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  className="rounded-2xl bg-[#1769FF] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  type="submit"
                  disabled={!hasSelectedStudent || !file || submitting}
                >
                  {submitting ? 'Enregistrement…' : 'Enregistrer le document'}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  {selectedStudent ? `Dossier de ${selectedStudent.name}` : 'Tous les documents'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Historique des dépôts, par catégorie, avec date d'envoi et de classement.</p>
              </div>
              <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">{documents.length} pièces</span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {documents.length === 0 && (
                <EmptyState className="md:col-span-2" title="Aucun document disponible" message="Aucun document disponible pour le moment." icon="📄" />
              )}
              {documents.map((document) => (
                <article className="rounded-2xl border border-slate-300 bg-slate-50 p-4" key={document.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-950">{document.type}</h3>
                      <p className="mt-1 text-sm text-slate-500 truncate">{document.file_name || 'Sans fichier'}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Envoi : {formatDate(document.sent_at || document.received_date)} · Classé : {formatDate(document.classified_at)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {document.source === 'messagerie'
                          ? `Via messagerie${document.sender_name ? ` · ${document.sender_name}` : ''}`
                          : document.source === 'eleve'
                            ? `Dépôt élève${document.sender_name ? ` · ${document.sender_name}` : ''}`
                            : 'Dépôt direct'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{document.status}</span>
                  </div>
                  {document.url && (
                    <div className="mt-3 flex gap-3 text-xs">
                      <a className="font-semibold text-blue-700 underline" href={document.url} target="_blank" rel="noreferrer">Aperçu</a>
                      <a className="font-semibold text-blue-700 underline" href={document.url} download={document.file_name || undefined}>Télécharger</a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Field({ label, onChange, type = 'text', value }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  )
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}
