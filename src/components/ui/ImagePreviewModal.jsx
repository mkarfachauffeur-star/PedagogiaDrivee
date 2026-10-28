import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { downloadBlob } from '../../utils/csvExport'

export function isImageAttachment({ mime_type: mime, file_name: name } = {}) {
  if ((mime || '').startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name || '')
}

async function downloadAttachment(attachment) {
  if (!attachment?.url) return
  try {
    const response = await fetch(attachment.url)
    const blob = await response.blob()
    downloadBlob(attachment.file_name || 'fichier', blob)
  } catch {
    window.open(attachment.url, '_blank', 'noopener,noreferrer')
  }
}

export function ImagePreviewModal({ attachment, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  if (!attachment?.url || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/95">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-white px-4 py-3 shadow-lg">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
          {attachment.file_name || 'Aperçu'}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => downloadAttachment(attachment)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Télécharger
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-700"
            aria-label="Fermer l'aperçu"
          >
            <X className="h-4 w-4" aria-hidden />
            Fermer
          </button>
        </div>
      </header>
      <div
        className="flex flex-1 items-center justify-center overflow-auto p-4"
        onClick={onClose}
        role="presentation"
      >
        <img
          src={attachment.url}
          alt={attachment.file_name || 'Pièce jointe'}
          className="max-h-full max-w-full object-contain"
          onClick={(event) => event.stopPropagation()}
          draggable={false}
        />
      </div>
    </div>,
    document.body,
  )
}

export { downloadAttachment }
