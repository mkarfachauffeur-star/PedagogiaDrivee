import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'
import {
  applyGesture,
  canPan,
  distanceBetween,
  LIGHTBOX_MAX_SCALE,
  LIGHTBOX_MIN_SCALE,
  midpoint,
  toggleDoubleTap,
} from '../../lib/lightboxGestures'
import LessonImage from './LessonImage'

const DOUBLE_TAP_MS = 300

/**
 * Visionneuse plein écran réutilisable (leçons, QCU) : fond assombri, zoom
 * par pincement, déplacement lorsque l'image est agrandie, double-toucher
 * pour zoomer/réinitialiser. Fermeture : croix, Échap, ou tap unique sur le
 * fond (jamais pendant un zoom ni un double-toucher). Proportions et
 * résolution d'origine préservées (object-contain).
 */
export default function ImageLightbox({ image, onClose }) {
  const [view, setView] = useState({ scale: LIGHTBOX_MIN_SCALE, tx: 0, ty: 0 })
  const [gesturing, setGesturing] = useState(false)
  const pointersRef = useRef(new Map())
  const movedRef = useRef(false)
  const closeTimerRef = useRef(0)
  const gestureRef = useRef({ startDistance: 0, startScale: 1, startMid: null, panOrigin: null, lastTapAt: 0 })

  const zoomed = canPan(view.scale)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(closeTimerRef.current)
    }
  }, [onClose])

  const adjustScale = useCallback((factor) => {
    setView((current) => applyGesture(current, { scaleFactor: factor }))
  }, [])

  const onPointerDown = (event) => {
    window.clearTimeout(closeTimerRef.current)
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })
    setGesturing(true)
    const gesture = gestureRef.current

    if (pointersRef.current.size === 1) {
      const now = Date.now()
      if (now - gesture.lastTapAt < DOUBLE_TAP_MS) {
        setView((current) => toggleDoubleTap(current))
        gesture.lastTapAt = 0
        movedRef.current = true
      } else {
        gesture.lastTapAt = now
        movedRef.current = false
      }
      gesture.panOrigin = { clientX: event.clientX, clientY: event.clientY }
      return
    }

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()]
      gesture.startDistance = distanceBetween(a, b)
      gesture.startMid = midpoint(a, b)
      gesture.startScale = view.scale
      gesture.panOrigin = null
      movedRef.current = true
    }
  }

  const onPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return
    movedRef.current = true
    pointersRef.current.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY })
    const gesture = gestureRef.current

    if (pointersRef.current.size === 2 && gesture.startDistance > 0) {
      const [a, b] = [...pointersRef.current.values()]
      const factor = distanceBetween(a, b) / gesture.startDistance
      const mid = midpoint(a, b)
      const next = applyGesture(
        { scale: gesture.startScale, tx: view.tx, ty: view.ty },
        {
          scaleFactor: factor,
          dx: gesture.startMid ? mid.clientX - gesture.startMid.clientX : 0,
          dy: gesture.startMid ? mid.clientY - gesture.startMid.clientY : 0,
        },
      )
      gesture.startMid = mid
      gesture.startScale = next.scale
      setView(next)
      return
    }

    if (pointersRef.current.size === 1 && gesture.panOrigin && canPan(view.scale)) {
      setView((current) => ({
        ...current,
        tx: current.tx + (event.clientX - gesture.panOrigin.clientX),
        ty: current.ty + (event.clientY - gesture.panOrigin.clientY),
      }))
      gesture.panOrigin = { clientX: event.clientX, clientY: event.clientY }
    }
  }

  const onPointerEnd = (event) => {
    pointersRef.current.delete(event.pointerId)
    const gesture = gestureRef.current
    if (pointersRef.current.size < 2) {
      gesture.startDistance = 0
      gesture.startMid = null
    }
    if (pointersRef.current.size === 1) {
      const [remaining] = [...pointersRef.current.values()]
      gesture.panOrigin = remaining
    } else {
      gesture.panOrigin = null
    }
    if (pointersRef.current.size === 0) {
      setGesturing(false)
      if (!movedRef.current && !zoomed) {
        closeTimerRef.current = window.setTimeout(() => onClose(), DOUBLE_TAP_MS + 40)
      }
    }
  }

  if (!image?.src) return null

  return (
    <div
      aria-label={`Image agrandie : ${image.alt || image.title || 'illustration'}`}
      aria-modal="true"
      className="fixed inset-0 z-[200] flex flex-col bg-slate-950/95 backdrop-blur-sm"
      role="dialog"
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="min-w-0">
          {image.title ? <p className="truncate text-sm font-semibold text-white">{image.title}</p> : null}
          <p className="text-xs text-sky-200/70">
            {zoomed ? 'Déplacez l’image · pincez pour ajuster' : 'Pincez pour zoomer · double-toucher pour agrandir'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label="Zoom arrière"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
            disabled={view.scale <= LIGHTBOX_MIN_SCALE + 0.01}
            onClick={() => adjustScale(1 / 1.4)}
            type="button"
          >
            <ZoomOut aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Zoom avant"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
            disabled={view.scale >= LIGHTBOX_MAX_SCALE - 0.01}
            onClick={() => adjustScale(1.4)}
            type="button"
          >
            <ZoomIn aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Fermer la visionneuse"
            className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-lg transition hover:brightness-110"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="relative min-h0 flex-1 touch-none select-none overflow-hidden"
        onPointerCancel={onPointerEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        role="presentation"
        style={{ touchAction: 'none' }}
      >
        <div className="pointer-events-none flex h-full w-full items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <div
            className="block max-h-full max-w-full will-change-transform"
            style={{
              transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
              transition: gesturing ? 'none' : 'transform 140ms ease-out',
            }}
          >
            <LessonImage
              alt={image.alt}
              className="max-h-[78vh] w-auto max-w-full rounded-2xl shadow-2xl"
              objectFit="contain"
              src={image.src}
            />
          </div>
        </div>
      </div>

      {image.caption ? (
        <p className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] text-center text-sm leading-6 text-sky-100/80">
          {image.caption}
        </p>
      ) : null}
    </div>
  )
}
