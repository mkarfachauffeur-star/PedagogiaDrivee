import { useCallback, useEffect, useRef, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import { formatDate } from '../../lib/format'
import PageShell from '../../components/ui/PageShell'
import { useAuth } from '../../context/AuthContext'
import { useStudentAccount } from '../../hooks/useStudentAccount'
import { getUserFacingError } from '../../lib/userFacingError'
import {
  DOCUMENT_CATEGORIES,
  listDocuments,
  subscribeToDocuments,
  uploadDocumentFromStudent,
} from '../../services/documents'

export default function StudentDocumentsPage() {
  const { profileId, organizationId, profile } = useAuth()
  const { student, loading: accountLoading } = useStudentAccount()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [documentType, setDocumentType] = useState(DOCUMENT_CATEGORIES[0])
  const [documentName, setDocumentName] = useState('')
  const [file, setFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const formRef = useRef(null)

  const uploadedDocuments = documents.filter((document) => Boolean(document.storage_path))

  const isOtherType = documentType === 'Autres documents'

  const resetForm = () => {
    setDocumentType(DOCUMENT_CATEGORIES[0])
    setDocumentName('')
    setFile(null)
    setFileInputKey((key) => key + 1)
    setFeedback(null)
  }

  const closeForm = () => {
    setShowAddForm(false)
    resetForm()
  }

  const refresh = useCallback(async () => {
    if (!student?.id) {
      setDocuments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const rows = await listDocuments({ studentId: student.id })
    setDocuments(rows)
    setLoading(false)
  }, [student?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!student?.id) return undefined
    return subscribeToDocuments(refresh, `student-docs:${student.id}`)
  }, [student?.id, refresh])

  useEffect(() => {
    if (!showAddForm || !formRef.current) return
    formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showAddForm])

  const openAddForm = () => {
    setShowAddForm(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!student?.id || !organizationId || !profileId || !file) return
    if (isOtherType && !documentName.trim()) return

    setSubmitting(true)
    setFeedback(null)

    const { error } = await uploadDocumentFromStudent({
      organizationId,
      studentId: student.id,
      documentType,
      documentName: isOtherType ? documentName : undefined,
      file,
      createdBy: profileId,
      senderName: profile?.full_name || 'Élève',
    })

    setSubmitting(false)

    if (error) {
      setFeedback({ type: 'error', message: getUserFacingError(error, 'document') })
      return
    }

    setFeedback({ type: 'ok', message: 'Document envoyé. Le secrétariat et le gérant pourront le consulter.' })
    resetForm()
    setShowAddForm(false)
    await refresh()
  }

  if (accountLoading || loading) {
    return (
      <PageShell>
        <p className="text-sm font-semibold text-slate-500">Chargement de vos documents…</p>
      </PageShell>
    )
  }

  if (!student?.id) {
    return (
      <PageShell>
        <EmptyState
          icon="📁"
          message="Votre dossier élève n'est pas encore disponible."
          title="Documents"
        />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader description="Votre dossier et vos justificatifs." title="Documents" />

      <section className="pd-section-card pd-section-card-body">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-extrabold text-slate-950">Mes documents</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
              {uploadedDocuments.length} pièce(s)
            </span>
            {!showAddForm && (
              <button
                className="rounded-xl bg-navy-950 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-cyan-700"
                onClick={openAddForm}
                type="button"
              >
                Ajouter un document
              </button>
            )}
          </div>
        </div>

        {showAddForm && (
          <form
            className="mt-5 grid scroll-mt-24 gap-4 rounded-2xl border-2 border-slate-300 bg-slate-50/80 p-5"
            onSubmit={handleSubmit}
            ref={formRef}
          >
            <div>
              <h3 className="text-lg font-extrabold text-slate-950">Déposer un document</h3>
              <p className="mt-1 text-sm text-slate-500">
                Ce document sera visible par le secrétariat et le gérant.
              </p>
            </div>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Type de document
              <select
                className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => {
                  setDocumentType(event.target.value)
                  if (event.target.value !== 'Autres documents') setDocumentName('')
                }}
                required
                value={documentType}
              >
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {isOtherType && (
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Nom du document
                <input
                  className="rounded-xl border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setDocumentName(event.target.value)}
                  placeholder="Ex : Attestation de stage"
                  required
                  value={documentName}
                />
              </label>
            )}

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Insérer le document
              <input
                accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-cyan-800"
                key={fileInputKey}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                required
                type="file"
              />
            </label>

            {feedback && (
              <p
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  feedback.type === 'error'
                    ? 'border border-rose-200 bg-rose-50 text-rose-700'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {feedback.message}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-navy-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                disabled={submitting || !file || (isOtherType && !documentName.trim())}
                type="submit"
              >
                {submitting ? 'Envoi en cours…' : 'Insérer le document'}
              </button>
              <button
                className="rounded-xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                disabled={submitting}
                onClick={closeForm}
                type="button"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {!showAddForm && uploadedDocuments.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon="📁"
            message="Aucun document déposé pour le moment. Cliquez sur « Ajouter un document » pour envoyer une pièce."
            title="Aucun document"
          />
        ) : !showAddForm ? (
          <div className="mt-4 grid gap-3">
            {uploadedDocuments.map((document) => (
              <article className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4" key={document.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-950">{document.type || document.reference}</h3>
                    {document.reference && document.reference !== document.type && (
                      <p className="mt-1 text-sm text-slate-600">{document.reference}</p>
                    )}
                    <p className="mt-1 truncate text-sm text-slate-500">{document.file_name || 'Sans fichier'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Déposé le {formatDate(document.sent_at || document.classified_at)}
                      {document.status ? ` · ${document.status}` : ''}
                    </p>
                  </div>
                  {document.url && (
                    <div className="flex shrink-0 gap-3 text-sm">
                      <a
                        className="font-bold text-cyan-700 underline"
                        href={document.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Aperçu
                      </a>
                      <a
                        className="font-bold text-cyan-700 underline"
                        download={document.file_name || undefined}
                        href={document.url}
                      >
                        Télécharger
                      </a>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </PageShell>
  )
}
