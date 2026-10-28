import { useState } from 'react'
import Dialog from '../ui/Dialog'
import Notice from '../ui/Notice'
import { ui } from '../ui/styles'
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

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  return (
    <Dialog
      description="Votre demande est transmise au secrétariat, qui valide le dossier."
      footer={
        success ? (
          <button className={ui.btnPrimary} onClick={handleClose} type="button">
            Fermer
          </button>
        ) : (
          <>
            <button className={ui.btnSecondary} disabled={saving} onClick={handleClose} type="button">
              Annuler
            </button>
            <button className={ui.btnPrimary} disabled={saving} form="pre-registration-form" type="submit">
              {saving ? 'Envoi…' : 'Envoyer la pré-inscription'}
            </button>
          </>
        )
      }
      onClose={handleClose}
      open={open}
      size="max-w-lg"
      title="Pré-inscrire un élève"
    >
      {success ? (
        <Notice tone="success">Pré-inscription envoyée. Le secrétariat va la traiter.</Notice>
      ) : (
        <form className="grid gap-4" id="pre-registration-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={ui.label}>
              Nom
              <input autoComplete="family-name" className={ui.input} onChange={update('lastName')} required value={form.lastName} />
            </label>
            <label className={ui.label}>
              Prénom
              <input autoComplete="given-name" className={ui.input} onChange={update('firstName')} required value={form.firstName} />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={ui.label}>
              Téléphone
              <input autoComplete="tel" className={ui.input} inputMode="tel" onChange={update('phone')} type="tel" value={form.phone} />
            </label>
            <label className={ui.label}>
              E-mail
              <input autoComplete="email" className={ui.input} onChange={update('email')} type="email" value={form.email} />
            </label>
          </div>

          <label className={ui.label}>
            Formation souhaitée
            <select className={ui.input} onChange={update('desiredTraining')} value={form.desiredTraining}>
              {PRE_REGISTRATION_TRAININGS.map((training) => (
                <option key={training} value={training}>
                  {training}
                </option>
              ))}
            </select>
          </label>

          <label className={ui.label}>
            Commentaire <span className="font-normal text-slate-400">(facultatif)</span>
            <textarea
              className={`${ui.input} h-auto min-h-20 py-2`}
              onChange={update('notes')}
              placeholder="Informations utiles pour le secrétariat…"
              rows={3}
              value={form.notes}
            />
          </label>

          {error ? <Notice tone="danger">{error}</Notice> : null}
        </form>
      )}
    </Dialog>
  )
}
