import { useState } from 'react'
import { Check, CheckCheck } from 'lucide-react'
import { ImagePreviewModal, downloadAttachment, isImageAttachment } from '../ui/ImagePreviewModal'

const DOC_TYPES = [
  'Pièce d’identité recto/verso',
  'Justificatif domicile (-3 mois)',
  'ASSR/JDC',
  'E-photo',
  'Contrat auto-école retourné signé',
  'Résultat ETG (code de la route)',
  'Autre',
]

function isPdf(mime) {
  return mime === 'application/pdf'
}

// Liste des pièces jointes d'un message (aperçu image/PDF + téléchargement).
// `classify` (optionnel) = (attachment, type) => void : action de classement
// administratif (réservée au secrétariat sur les conversations élève).
export function AttachmentList({ attachments, classify }) {
  const [types, setTypes] = useState({})
  const [preview, setPreview] = useState(null)
  if (!attachments || !attachments.length) return null
  return (
    <>
      <div className="mt-2 grid w-full min-w-0 gap-2">
        {attachments.map((a) => {
          const image = isImageAttachment(a)
          const pdf = isPdf(a.mime_type)
          return (
            <div
              key={a.id}
              className="min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-700 shadow-sm"
            >
              {image && a.url && (
                <button
                  type="button"
                  onClick={() => setPreview(a)}
                  className="mb-2 block w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-300 transition hover:border-blue-300 hover:shadow-sm"
                  title="Agrandir l'image"
                >
                  <img
                    src={a.url}
                    alt={a.file_name}
                    className="mx-auto max-h-44 w-auto max-w-full object-contain"
                    draggable={false}
                  />
                </button>
              )}
              <p className="truncate font-semibold text-slate-800" title={a.file_name}>
                {a.file_name}
              </p>
              {a.url ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {image && (
                    <button
                      type="button"
                      className="font-semibold text-blue-700 underline"
                      onClick={() => setPreview(a)}
                    >
                      Aperçu
                    </button>
                  )}
                  {pdf && (
                    <a className="font-semibold text-blue-700 underline" href={a.url} target="_blank" rel="noreferrer">
                      Aperçu
                    </a>
                  )}
                  <button
                    type="button"
                    className="font-semibold text-blue-700 underline"
                    onClick={() => (image ? downloadAttachment(a) : window.open(a.url, '_blank', 'noopener,noreferrer'))}
                  >
                    Télécharger
                  </button>
                </div>
              ) : (
                <span className="mt-1 block opacity-60">Indisponible</span>
              )}
              {classify && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    className="min-h-8 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 outline-none"
                    value={types[a.id] || DOC_TYPES[0]}
                    onChange={(event) => setTypes((current) => ({ ...current, [a.id]: event.target.value }))}
                  >
                    {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    type="button"
                    className="rounded-lg bg-[#1769FF] px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                    onClick={() => classify(a, types[a.id] || DOC_TYPES[0])}
                  >
                    Classer
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {preview && <ImagePreviewModal attachment={preview} onClose={() => setPreview(null)} />}
    </>
  )
}

// Bouton « trombone » pour joindre des fichiers.
export function AttachButton({ onAdd, disabled }) {
  return (
    <label
      className={`pd-msg-btn-attach ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      title="Joindre des fichiers"
    >
      <span aria-hidden className="text-lg">📎</span>
      <input
        type="file"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(event) => {
          onAdd(Array.from(event.target.files || []))
          event.target.value = ''
        }}
      />
    </label>
  )
}

// Liste des fichiers en attente d'envoi (avant l'envoi du message).
export function PendingFiles({ files, onRemove }) {
  if (!files || !files.length) return null
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {files.map((file, index) => (
        <span
          key={`${file.name}-${index}`}
          className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700"
        >
          <span className="min-w-0 truncate">{file.name}</span>
          <button type="button" onClick={() => onRemove(index)} className="shrink-0 text-slate-500 hover:text-slate-800">×</button>
        </span>
      ))}
    </div>
  )
}

/** Bulle de chat alignée (envoyés à droite, reçus à gauche). */
export function ChatMessageBubble({ mine, children, className = '' }) {
  return (
    <div className={`flex w-full ${mine ? 'justify-end' : 'justify-start'}`}>
      <article className={`pd-msg-bubble ${mine ? 'pd-msg-bubble-sent' : 'pd-msg-bubble-received'} ${className}`}>
        {children}
      </article>
    </div>
  )
}

/**
 * Heure du message et, pour vos propres messages, l'accusé :
 * ✓ Envoyé · ✓✓ Reçu · ✓✓ Lu (en couleur).
 */
export function MessageMeta({ mine, time, status }) {
  const StatusIcon = status === 'Envoyé' ? Check : CheckCheck
  return (
    <p className={`mt-1.5 flex items-center justify-end gap-1 text-[11px] ${mine ? 'text-white/80' : 'text-slate-400'}`}>
      <span>{time}</span>
      {mine && status ? (
        <span aria-label={`Message ${status.toLowerCase()}`} className={`inline-flex items-center gap-0.5 ${status === 'Lu' ? 'font-semibold text-white' : ''}`}>
          <StatusIcon aria-hidden="true" className="h-3.5 w-3.5" />
          {status}
        </span>
      ) : null}
    </p>
  )
}

/** Barre d’envoi : trombone + champ + bouton. */
export function MessageComposer({
  value,
  onChange,
  onSubmit,
  files = [],
  onAddFiles,
  onRemoveFile,
  sending = false,
  disabled = false,
  error = null,
  placeholder = 'Écrire un message…',
  submitLabel = 'Envoyer',
  className = '',
}) {
  const busy = sending || disabled
  return (
    <form className={`pd-msg-composer ${className}`.trim()} onSubmit={onSubmit}>
      {error && (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
      <PendingFiles files={files} onRemove={onRemoveFile} />
      <div className="flex w-full min-w-0 items-center gap-2">
        <AttachButton onAdd={onAddFiles} disabled={busy} />
        <input
          className="pd-input-dark min-w-0"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
          disabled={busy}
        />
        <button
          className="pd-msg-send-btn"
          type="submit"
          disabled={busy || (!String(value || '').trim() && !files.length)}
        >
          {sending ? '…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
