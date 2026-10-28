import { useState } from 'react'
import { getUserFacingError } from '../../lib/userFacingError'
import { openAppStore } from '../../lib/appPlatform'
import { submitStudentReview } from '../../services/studentReviews'

const STAR_LABELS = ['Très insatisfait', 'Insatisfait', 'Correct', 'Satisfait', 'Très satisfait']

function StarSelector({ value, onChange, disabled }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
            onClick={() => onChange(star)}
            className={`rounded-2xl border px-3 py-2 text-3xl transition hover:scale-105 disabled:opacity-50 ${
              value >= star
                ? 'border-amber-300 bg-amber-50'
                : 'border-slate-200 bg-white text-slate-300'
            }`}
          >
            ⭐
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-sm font-semibold text-slate-600">
          {value} étoile{value > 1 ? 's' : ''} — {STAR_LABELS[value - 1]}
        </p>
      )}
    </div>
  )
}

function ReviewForm({ onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    if (rating < 1) {
      setError('Veuillez sélectionner une note de 1 à 5 étoiles.')
      return
    }
    setSaving(true)
    setError(null)
    const { data, error: saveError } = await submitStudentReview({ rating, comment })
    setSaving(false)
    if (saveError) {
      setError(getUserFacingError(saveError))
      return
    }
    onSubmitted?.(data?.rating ?? rating)
  }

  return (
    <form className="mx-auto flex w-full max-w-xl flex-col gap-5" onSubmit={submit}>
      <StarSelector disabled={saving} onChange={setRating} value={rating} />

      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Souhaitez-vous nous laisser un commentaire ?</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          disabled={saving}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Écrivez ici votre avis..."
          value={comment}
        />
      </label>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <button
        className="rounded-2xl bg-[#1769FF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={rating < 1 || saving}
        type="submit"
      >
        {saving ? 'Envoi en cours…' : 'Envoyer mon avis'}
      </button>
    </form>
  )
}

function ReviewThankYou({ rating, onContinue }) {
  const isPositive = rating >= 4

  if (isPositive) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 text-center">
        <p className="text-2xl font-semibold text-slate-950">Merci beaucoup pour votre retour ❤️</p>
        <p className="text-sm leading-7 text-slate-600">
          Souhaitez-vous également laisser un avis public sur notre application ?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            className="rounded-2xl bg-[#1769FF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            onClick={() => {
              openAppStore()
              onContinue?.()
            }}
            type="button"
          >
            ⭐ Laisser un avis
          </button>
          <button
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => onContinue?.()}
            type="button"
          >
            Plus tard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 text-center">
      <p className="text-2xl font-semibold text-slate-950">Merci pour votre retour.</p>
      <p className="text-sm leading-7 text-slate-600">
        Votre avis nous aidera à améliorer Pedagogia Drive.
      </p>
      <button
        className="mx-auto rounded-2xl bg-[#1769FF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        onClick={() => onContinue?.()}
        type="button"
      >
        Continuer
      </button>
    </div>
  )
}

export default function StudentReviewScreen({ onCompleted }) {
  const [submittedRating, setSubmittedRating] = useState(null)

  return (
    <div className="fixed inset-0 z-[210] flex flex-col bg-[#f0f7ff]">
      <div className="border-b border-slate-300 bg-white px-4 py-5 sm:px-6">
        <h1 className="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">
          ⭐ Votre avis compte
        </h1>
        {!submittedRating && (
          <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
            <p>Vous utilisez Pedagogia Drive depuis maintenant 15 jours.</p>
            <p>
              Votre avis est précieux pour nous permettre d&apos;améliorer continuellement l&apos;application.
            </p>
            <p className="font-semibold text-slate-800">Comment évaluez-vous votre expérience ?</p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
        {submittedRating ? (
          <ReviewThankYou onContinue={onCompleted} rating={submittedRating} />
        ) : (
          <ReviewForm onSubmitted={setSubmittedRating} />
        )}
      </div>
    </div>
  )
}
