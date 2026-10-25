import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { trackBookDemo, trackDemoFormSubmit } from '../../lib/analytics'
import { getUserFacingError } from '../../lib/userFacingError'
import { submitDemoRequest } from '../../services/demoRequests'
import { LANDING_OFFERS, landingOfferById } from './landing/landingOffers'
import { offerTheme } from './landing/landingOfferThemes'
import {
  isValidSiret,
  sanitizePhoneInput,
  sanitizePostalCode,
  sanitizeSiret,
  validateOrgProfileForm,
} from '../../lib/orgProfile'

const ACTIVE_STUDENT_OPTIONS = [
  '1 à 50 élèves',
  '50 à 100 élèves',
  '100 à 300 élèves',
  '300 et +',
]

const emptyForm = {
  schoolName: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  postalCode: '',
  city: '',
  siret: '',
  prefectureApproval: '',
  website: '',
  activeStudents: ACTIVE_STUDENT_OPTIONS[0],
  message: '',
}

export default function DemoRequestForm({
  id = 'demonstration',
  isDark = true,
  selectedOfferId = null,
  onSelectOffer,
}) {
  const inputClass = isDark
    ? 'mt-2 min-h-12 w-full rounded-lg border border-white/15 bg-white/[0.06] px-4 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20'
    : 'mt-2 min-h-12 w-full rounded-lg border border-[#07111F]/12 bg-white px-4 text-sm font-medium text-[#07111F] outline-none placeholder:text-[#5B6B80]/70 focus:border-[#1769FF] focus:ring-2 focus:ring-[#1769FF]/15'
  const selectClass = isDark
    ? 'min-h-12 w-full appearance-none rounded-lg border border-white/15 bg-white/[0.06] py-3 pl-4 pr-12 text-sm font-medium text-white outline-none focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20'
    : 'min-h-12 w-full appearance-none rounded-lg border border-[#07111F]/12 bg-white py-3 pl-4 pr-12 text-sm font-medium text-[#07111F] outline-none focus:border-[#1769FF] focus:ring-2 focus:ring-[#1769FF]/15'
  const labelClass = `block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`
  const errorClass = isDark ? 'mt-1 text-xs font-semibold text-rose-300' : 'mt-1 text-xs font-semibold text-rose-600'
  const hintClass = isDark ? 'ml-1 text-xs font-medium text-slate-500' : 'ml-1 text-xs font-medium text-slate-400'

  const [form, setForm] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (feedback) setFeedback(null)
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedOfferId) {
      setFieldErrors({ offer: 'Choisissez une offre avant d’envoyer vos coordonnées.' })
      setFeedback({ type: 'error', message: 'Choisissez une offre avant d’envoyer vos coordonnées.' })
      return
    }

    const { ok, errors, message } = validateOrgProfileForm({
      orgName: form.schoolName,
      managerName: form.contactName,
      address: form.address,
      postalCode: form.postalCode,
      city: form.city,
      email: form.email,
      phone: form.phone,
      siret: form.siret,
      prefectureApproval: form.prefectureApproval,
      website: form.website,
    })

    if (!ok) {
      setFieldErrors({
        schoolName: errors.orgName,
        contactName: errors.managerName,
        address: errors.address,
        postalCode: errors.postalCode,
        city: errors.city,
        email: errors.email,
        phone: errors.phone,
        siret: errors.siret,
        website: errors.website,
      })
      setFeedback({ type: 'error', message })
      return
    }

    setSubmitting(true)
    setFeedback(null)
    const offer = landingOfferById(selectedOfferId)
    const { error } = await submitDemoRequest({
      ...form,
      offerId: offer?.id,
      offerName: offer ? `${offer.name} — ${offer.price} ${offer.period}` : null,
    })
    setSubmitting(false)

    if (error) {
      setFeedback({ type: 'error', message: getUserFacingError(error, 'save') })
      return
    }

    setFeedback({
      type: 'ok',
      message: 'Demande enregistrée. Nous vous recontacterons rapidement pour organiser une démonstration.',
    })
    trackDemoFormSubmit()
    trackBookDemo({ school_name: form.schoolName.trim() || undefined })
    setForm(emptyForm)
    setFieldErrors({})
  }

  const siretOk = isValidSiret(form.siret)

  return (
    <section className="relative scroll-mt-28" id={id}>
      <div
        className={
          isDark
            ? 'mx-auto max-w-3xl rounded-xl border border-white/10 bg-[#0b1630] p-6 sm:p-10'
            : 'mx-auto max-w-3xl rounded-xl border border-[#07111F]/10 bg-white p-6 sm:p-10'
        }
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className={`text-[13px] font-semibold ${isDark ? 'text-[#6ea6ff]' : 'text-[#1769FF]'}`}>
            Accès sur invitation
          </p>
          <h2 className={`mt-3 text-[1.75rem] font-semibold tracking-[-0.03em] sm:text-[2.25rem] ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Demander une démonstration
          </h2>
          <p className={`mt-3 text-sm leading-7 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            L’offre choisie est indiquée ci-dessous. Renseignez ensuite les coordonnées de l’employeur.
          </p>
        </div>

        <form className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2" noValidate onSubmit={handleSubmit}>
          <fieldset className="sm:col-span-2">
            <legend className={labelClass}>Offre *</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {LANDING_OFFERS.map((offer) => {
                const selected = selectedOfferId === offer.id
                const theme = offerTheme(offer.id)
                return (
                  <label
                    className={`relative flex cursor-pointer flex-col overflow-hidden rounded-xl border px-3 pb-3 pt-4 text-left transition ${
                      selected
                        ? `${theme.ring} ${theme.tint}`
                        : isDark
                          ? 'border-white/15 bg-white/[0.04] hover:border-white/30'
                          : 'border-[#07111F]/12 bg-white hover:border-[#1769FF]/40'
                    }`}
                    key={offer.id}
                  >
                    <input
                      checked={selected}
                      className="sr-only"
                      name="offer"
                      onChange={() => onSelectOffer?.(offer.id)}
                      type="radio"
                      value={offer.id}
                    />
                    <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${theme.bar}`} />
                    <span className={`text-sm font-bold ${theme.name}`}>{offer.name}</span>
                    <span className={`mt-1 text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-[#5b6b80]'}`}>
                      {offer.price} · {offer.period}
                    </span>
                  </label>
                )
              })}
            </div>
            {fieldErrors.offer && <p className={errorClass}>{fieldErrors.offer}</p>}
          </fieldset>

          <p className={`sm:col-span-2 text-sm font-bold ${isDark ? 'text-white' : 'text-[#0b1526]'}`}>
            Coordonnées de l’employeur
          </p>

          <label className={`${labelClass} sm:col-span-2`}>
            Nom de l&apos;auto-école *
            <input
              className={inputClass}
              onChange={(event) => update('schoolName', event.target.value)}
              placeholder="Ex : Auto-École Horizon"
              required
              value={form.schoolName}
            />
            {fieldErrors.schoolName && <p className={errorClass}>{fieldErrors.schoolName}</p>}
          </label>

          <label className={`${labelClass} sm:col-span-2`}>
            Nom de l&apos;employeur *
            <input
              className={inputClass}
              onChange={(event) => update('contactName', event.target.value)}
              placeholder="Nom et prénom"
              required
              value={form.contactName}
            />
            {fieldErrors.contactName && <p className={errorClass}>{fieldErrors.contactName}</p>}
          </label>

          <label className={`${labelClass} sm:col-span-2`}>
            Adresse de l&apos;auto-école *
            <input
              autoComplete="street-address"
              className={inputClass}
              onChange={(event) => update('address', event.target.value)}
              placeholder="Numéro et rue"
              required
              value={form.address}
            />
            {fieldErrors.address && <p className={errorClass}>{fieldErrors.address}</p>}
          </label>

          <label className={labelClass}>
            Code postal *
            <input
              autoComplete="postal-code"
              className={inputClass}
              inputMode="numeric"
              maxLength={5}
              onChange={(event) => update('postalCode', sanitizePostalCode(event.target.value))}
              placeholder="75001"
              required
              value={form.postalCode}
            />
            {fieldErrors.postalCode && <p className={errorClass}>{fieldErrors.postalCode}</p>}
          </label>

          <label className={labelClass}>
            Ville *
            <input
              autoComplete="address-level2"
              className={inputClass}
              onChange={(event) => update('city', event.target.value)}
              placeholder="Paris"
              required
              value={form.city}
            />
            {fieldErrors.city && <p className={errorClass}>{fieldErrors.city}</p>}
          </label>

          <label className={labelClass}>
            Téléphone *
            <input
              className={inputClass}
              inputMode="tel"
              onChange={(event) => update('phone', sanitizePhoneInput(event.target.value))}
              placeholder="06 12 34 56 78"
              required
              type="tel"
              value={form.phone}
            />
            {fieldErrors.phone && <p className={errorClass}>{fieldErrors.phone}</p>}
          </label>

          <label className={labelClass}>
            E-mail *
            <input
              className={inputClass}
              onChange={(event) => update('email', event.target.value)}
              placeholder="contact@auto-ecole.fr"
              required
              type="email"
              value={form.email}
            />
            {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
          </label>

          <label className={`${labelClass} sm:col-span-2`}>
            SIRET *
            <input
              className={inputClass}
              inputMode="numeric"
              maxLength={14}
              onChange={(event) => update('siret', sanitizeSiret(event.target.value))}
              placeholder="14 chiffres"
              required
              value={form.siret}
            />
            {fieldErrors.siret && <p className={errorClass}>{fieldErrors.siret}</p>}
            {!fieldErrors.siret && form.siret.length > 0 && !siretOk && (
              <p className={errorClass}>Le SIRET doit contenir exactement 14 chiffres ({form.siret.length}/14).</p>
            )}
          </label>

          <label className={labelClass}>
            N° agrément préfectoral
            <span className={hintClass}>(facultatif)</span>
            <input
              className={inputClass}
              onChange={(event) => update('prefectureApproval', event.target.value)}
              value={form.prefectureApproval}
            />
          </label>

          <label className={labelClass}>
            Site internet
            <span className={hintClass}>(facultatif)</span>
            <input
              className={inputClass}
              onChange={(event) => update('website', event.target.value)}
              placeholder="https://www.exemple.fr"
              type="url"
              value={form.website}
            />
            {fieldErrors.website && <p className={errorClass}>{fieldErrors.website}</p>}
          </label>

          <label className={`${labelClass} sm:col-span-2`}>
            Nombre d&apos;élèves actifs par année
            <div className="relative mt-2">
              <select
                className={selectClass}
                onChange={(event) => update('activeStudents', event.target.value)}
                required
                value={form.activeStudents}
              >
                {ACTIVE_STUDENT_OPTIONS.map((option) => (
                  <option className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
              />
            </div>
          </label>

          <label className={`${labelClass} sm:col-span-2`}>
            Message
            <textarea
              className={`${inputClass} min-h-28 resize-y py-3`}
              onChange={(event) => update('message', event.target.value)}
              placeholder="Vos besoins, votre organisation, vos questions…"
              value={form.message}
            />
          </label>

          {feedback && (
            <p
              className={`rounded-lg px-4 py-3 text-sm font-semibold sm:col-span-2 ${
                feedback.type === 'error'
                  ? isDark
                    ? 'border border-rose-400/30 bg-rose-500/10 text-rose-100'
                    : 'border border-rose-200 bg-rose-50 text-rose-700'
                  : isDark
                    ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {feedback.message}
            </p>
          )}

          <div className="flex flex-col items-center gap-2 sm:col-span-2">
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#1769FF] px-6 text-sm font-semibold text-white transition hover:bg-[#145fe8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769FF] disabled:opacity-60 sm:w-auto"
              disabled={submitting || (form.siret.length > 0 && !siretOk)}
              type="submit"
            >
              {submitting ? 'Envoi en cours…' : 'Demander une démonstration'}
            </button>
            {form.siret.length > 0 && !siretOk && (
              <p className={errorClass}>Le SIRET doit contenir exactement 14 chiffres pour envoyer le formulaire.</p>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
