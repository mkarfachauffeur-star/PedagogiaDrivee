import { useState } from 'react'
import { PRE_REGISTRATION_TRAININGS } from '../../data/preRegistration'
import { createPreRegistration } from '../../services/preRegistrations'

const emptyForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  desiredTraining: PRE_REGISTRATION_TRAININGS[0],
  notes: '',
}

export default function PreRegistrationFormModal({ open, onClose, onCreated, organizationId, teacherId }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  const handleClose = () => {
    if (saving) return
    setForm(emptyForm)
    setError(null)
    setSuccess(false)
    onClose?.()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!organizationId || !teacherId) return

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    if (!firstName || !lastName) {
      setError('Le nom et le prénom sont obligatoires.')
      return
    }

    setSaving(true)
    setError(null)

    const { preRegistration, error: saveError } = await createPreRegistration({
      organizationId,
      teacherId,
      firstName,
      lastName,
      phone: form.phone,
      email: form.email,
      desiredTraining: form.desiredTraining,
      notes: form.notes,
    })

    setSaving(false)

    if (saveError || !preRegistration) {
      setError(typeof saveError === 'string' ? saveError : saveError?.message || 'Enregistrement impossible.')
      return
    }

    setSuccess(true)
    onCreated?.(preRegistration)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-[1.75rem] border-2 border-slate-300 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Pré-inscrire un élève</h2>
            <p className="mt-1 text-sm text-slate-500">
              Votre demande sera transmise au secrétariat pour validation du dossier.
            </p>
          </div>
          <button
            className="rounded-xl border-2 border-slate-300 px-3 py-1 text-sm font-bold text-slate-500"
            onClick={handleClose}
            type="button"
          >
            Fermer
          </button>
        </div>

        {success ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm font-semibold text-emerald-800">
            Pré-inscription enregistrée avec succès.
            <button
              className="mt-4 rounded-xl bg-navy-950 px-4 py-2 text-sm font-extrabold text-white"
              onClick={handleClose}
              type="button"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
                Nom
                <input
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  required
                  value={form.lastName}
                />
              </label>
              <label className="text-sm font-bold text-slate-700">
                Prénom
                <input
                  className="mt-2 w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  required
                  value={form.firstName}
                />
              </label>
            </div>

            <label className="text-sm font-bold text-slate-700">
              Téléphone
              <input
                className="mt-2 w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                type="tel"
                value={form.phone}
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              E-mail
              <input
                className="mt-2 w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                type="email"
                value={form.email}
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Formation souhaitée
              <select
                className="mt-2 w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setForm((current) => ({ ...current, desiredTraining: event.target.value }))}
                value={form.desiredTraining}
              >
                {PRE_REGISTRATION_TRAININGS.map((training) => (
                  <option key={training} value={training}>
                    {training}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Commentaires
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Informations utiles pour le secrétariat…"
                value={form.notes}
              />
            </label>

            {error && (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {error}
              </p>
            )}

            <button
              className="rounded-xl bg-navy-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-cyan-700 disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Enregistrement…' : 'Envoyer la pré-inscription'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
