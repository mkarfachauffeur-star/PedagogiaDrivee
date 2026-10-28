import { useEffect, useState } from 'react'
import { DEFAULT_CHARTER_CONTENT, DEFAULT_CHARTER_TITLE } from '../../data/studentEngagementCharter'
import {
  fetchActiveCharterForOrg,
  formatCharterAcceptedAt,
  publishStudentCharter,
} from '../../services/studentCharter'
import { getUserFacingError } from '../../lib/userFacingError'
import CharterContentView from './CharterContentView'

export default function StudentCharterAdminSection({ canWrite }) {
  const [charter, setCharter] = useState(null)
  const [draftTitle, setDraftTitle] = useState(DEFAULT_CHARTER_TITLE)
  const [draftContent, setDraftContent] = useState(DEFAULT_CHARTER_CONTENT)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchActiveCharterForOrg().then(({ charter: activeCharter }) => {
      if (cancelled) return
      setCharter(activeCharter)
      if (activeCharter) {
        setDraftTitle(activeCharter.title || DEFAULT_CHARTER_TITLE)
        setDraftContent(activeCharter.content || DEFAULT_CHARTER_CONTENT)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const publish = async () => {
    if (!canWrite) return
    if (!window.confirm(
      'Publier une nouvelle version de la charte ? Tous les élèves devront l\'accepter à nouveau.',
    )) return

    setPublishing(true)
    setMessage(null)
    setError(null)
    const { version, error: publishError } = await publishStudentCharter({
      title: draftTitle,
      content: draftContent,
    })
    setPublishing(false)

    if (publishError) {
      setError(getUserFacingError(publishError, 'save'))
      return
    }

    setCharter((current) => ({
      ...(current || {}),
      id: version?.id,
      versionNumber: version?.versionNumber,
      title: draftTitle,
      content: draftContent,
      publishedAt: version?.publishedAt,
    }))
    setMessage(`Nouvelle version ${version?.versionNumber || ''} publiée. Les élèves devront accepter à nouveau la charte.`)
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement de la charte…</p>
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">Charte d&apos;engagement élève</h2>
      <p className="mt-1 text-sm text-slate-500">
        Obligatoire à la première connexion. Publier une nouvelle version demande une nouvelle acceptation.
      </p>

      {charter?.versionNumber && (
        <p className="mt-3 text-sm font-semibold text-blue-800">
          Version active : v{charter.versionNumber}
          {charter.publishedAt ? ` · publiée le ${formatCharterAcceptedAt(charter.publishedAt)}` : ''}
        </p>
      )}

      <div className="mt-5 space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Titre
          <input
            className="pd-input mt-2 w-full disabled:bg-slate-50"
            disabled={!canWrite}
            onChange={(event) => setDraftTitle(event.target.value)}
            value={draftTitle}
          />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Contenu (Markdown simple : # titre, ## section, * puce)
          <textarea
            className="pd-input mt-2 min-h-72 w-full resize-y font-mono text-xs disabled:bg-slate-50"
            disabled={!canWrite}
            onChange={(event) => setDraftContent(event.target.value)}
            value={draftContent}
          />
        </label>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500">Aperçu</p>
          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-white bg-white p-4">
            <CharterContentView content={draftContent} />
          </div>
        </div>

        {message && (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </p>
        )}

        {canWrite && (
          <button
            className="pd-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={publishing || !draftContent.trim()}
            onClick={publish}
            type="button"
          >
            {publishing ? 'Publication…' : 'Publier une nouvelle version'}
          </button>
        )}
      </div>
    </section>
  )
}
