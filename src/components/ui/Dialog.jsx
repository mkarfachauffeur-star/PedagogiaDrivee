import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/** Fenêtre modale des espaces connectés (charte sobre). Échap et clic à l'extérieur ferment. */
export default function Dialog({ open, title, description, onClose, children, footer, size = 'max-w-md' }) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.()
    }
    window.addEventListener('keydown', onKeyDown)
    const previous = document.activeElement
    panelRef.current?.querySelector('input, button, select, textarea')?.focus()
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      role="dialog"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className={`relative flex max-h-full w-full ${size} flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl`}
        ref={panelRef}
      >
        <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div> : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
