import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CharterContentView from './CharterContentView'
import { acceptStudentCharter } from '../../services/studentCharter'
import { getUserFacingError } from '../../lib/userFacingError'

function lockBodyScroll() {
  const scrollY = window.scrollY
  document.body.dataset.charterScrollY = String(scrollY)
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll() {
  const scrollY = Number(document.body.dataset.charterScrollY || '0')
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  document.body.style.overflow = ''
  delete document.body.dataset.charterScrollY
  window.scrollTo(0, scrollY)
}

function hasReachedEnd(container, threshold = 120) {
  if (!container) return false
  const { scrollTop, clientHeight, scrollHeight } = container
  if (scrollHeight <= clientHeight + threshold) return true
  return scrollTop + clientHeight >= scrollHeight - threshold
}

export default function StudentCharterAcceptanceScreen({ charter, onAccepted }) {
  const [acceptedChecked, setAcceptedChecked] = useState(false)
  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const acceptRef = useRef(null)

  const markReachedEnd = useCallback(() => {
    setScrolledToEnd(true)
  }, [])

  const checkScroll = useCallback(() => {
    if (hasReachedEnd(scrollRef.current)) markReachedEnd()
  }, [markReachedEnd])

  useEffect(() => {
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    const acceptSection = acceptRef.current
    if (!container) return undefined

    setScrolledToEnd(false)

    const observers = []

    if (typeof IntersectionObserver !== 'undefined' && acceptSection) {
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
            markReachedEnd()
          }
        },
        { root: container, threshold: [0.35, 0.6, 1] },
      )
      intersectionObserver.observe(acceptSection)
      observers.push(intersectionObserver)
    }

    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(checkScroll)
      resizeObserver.observe(container)
      if (container.firstElementChild) resizeObserver.observe(container.firstElementChild)
    }

    container.addEventListener('scroll', checkScroll, { passive: true })
    container.addEventListener('touchend', checkScroll, { passive: true })
    window.visualViewport?.addEventListener('resize', checkScroll)

    const immediateId = window.requestAnimationFrame(checkScroll)
    const retryIds = [80, 250, 600].map((delay) => window.setTimeout(checkScroll, delay))

    return () => {
      observers.forEach((observer) => observer.disconnect())
      resizeObserver?.disconnect()
      container.removeEventListener('scroll', checkScroll)
      container.removeEventListener('touchend', checkScroll)
      window.visualViewport?.removeEventListener('resize', checkScroll)
      window.cancelAnimationFrame(immediateId)
      retryIds.forEach((id) => window.clearTimeout(id))
    }
  }, [checkScroll, charter?.content, markReachedEnd])

  const submit = async (event) => {
    event.preventDefault()
    if (!acceptedChecked || !scrolledToEnd || !charter?.id) return
    setSaving(true)
    setError(null)
    const { error: saveError } = await acceptStudentCharter(charter.id)
    setSaving(false)
    if (saveError) {
      setError(getUserFacingError(saveError, 'save'))
      return
    }
    onAccepted?.()
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={scrollRef}
      className="charter-acceptance-overlay"
      onScroll={checkScroll}
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-5 sm:px-6">
        <header className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-4 sm:px-6">
          <p className="text-xs font-semibold text-blue-700">
            Première connexion
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
            {charter?.title || 'Charte d\'engagement de l\'élève'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Lisez la charte jusqu&apos;en bas, puis cochez votre acceptation pour accéder à Pedagogia Drive.
          </p>
          {!scrolledToEnd && (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Faites défiler jusqu&apos;à la case d&apos;acceptation, tout en bas de la page.
            </p>
          )}
        </header>

        <article className="mt-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
          <CharterContentView content={charter?.content} />
        </article>

        <form
          ref={acceptRef}
          className="mt-5 mb-2 rounded-xl border border-slate-300 bg-white px-4 py-5 sm:px-6"
          onSubmit={submit}
        >
          <div className="flex flex-col gap-4">
            <label className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${scrolledToEnd ? 'border-slate-300 bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
              <input
                checked={acceptedChecked}
                className="mt-0.5 h-5 w-5 shrink-0"
                disabled={!scrolledToEnd || saving}
                onChange={(event) => setAcceptedChecked(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm font-semibold leading-6 text-slate-800">
                J&apos;ai lu et j&apos;accepte la Charte d&apos;engagement de l&apos;élève.
              </span>
            </label>

            <p className="text-xs font-semibold text-slate-500">
              La validation de cette charte est obligatoire pour accéder à Pedagogia Drive.
            </p>

            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                {error}
              </p>
            )}

            <button
              className="pd-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!acceptedChecked || !scrolledToEnd || saving}
              type="submit"
            >
              {saving ? 'Validation…' : 'Accéder à Pedagogia Drive'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
