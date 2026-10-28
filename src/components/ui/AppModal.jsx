import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
}

/** Au-dessus du topbar (z-90), sidebar (z-80) et overlay menu (z-70). */
const DEFAULT_Z_INDEX = 200

function lockBodyScroll() {
  const scrollY = window.scrollY
  document.body.dataset.modalScrollY = String(scrollY)
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll() {
  const scrollY = Number(document.body.dataset.modalScrollY || '0')
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  document.body.style.overflow = ''
  delete document.body.dataset.modalScrollY
  window.scrollTo(0, scrollY)
}

/**
 * Modale dashboard SaaS : portail body, centrée, max 90dvh, corps scrollable, footer fixe.
 */
export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  zIndex = DEFAULT_Z_INDEX,
  disableClose = false,
  closeOnBackdrop = true,
  footer,
  children,
  ariaLabel,
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !disableClose) onCloseRef.current?.()
    }

    lockBodyScroll()
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      unlockBodyScroll()
    }
  }, [open, disableClose])

  if (!open) return null

  const handleBackdrop = () => {
    if (closeOnBackdrop && !disableClose) onCloseRef.current?.()
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-slate-900/40"
        onClick={handleBackdrop}
      />

      <div
        className={`relative z-10 isolate flex max-h-[min(90dvh,90vh)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${SIZE_CLASS[size] || SIZE_CLASS.lg}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-white px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {footer && (
          <footer className="relative z-10 shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Footer standard : Annuler + action principale (submit via attribut form). */
export function AppModalFooter({
  onClose,
  closeLabel = 'Annuler',
  submitLabel,
  submitDisabled = false,
  submitForm,
  hideSubmit = false,
  hideClose = false,
  children,
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
      {!hideClose && (
        <button type="button" className="pd-btn-secondary w-full sm:w-auto" onClick={onClose}>
          {closeLabel}
        </button>
      )}
      {children}
      {!hideSubmit && submitLabel && (
        <button
          type="submit"
          form={submitForm}
          disabled={submitDisabled}
          className="pd-btn-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitLabel}
        </button>
      )}
    </div>
  )
}
