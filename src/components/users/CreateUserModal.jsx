import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { createOrganizationUser } from '../../services/users'
import { getUserFacingError } from '../../lib/userFacingError'
import { USER_ROLE_LABELS } from '../../lib/staffAccounts'
import { GENDER_OPTIONS, normalizeGender } from '../../lib/genderedRoles'
import AppModal, { AppModalFooter } from '../ui/AppModal'

const FORM_ID = 'create-user-form'
const inputClass =
  'mt-2 min-h-11 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100'

const ROLE_OPTIONS = [
  { value: 'manager', label: USER_ROLE_LABELS.manager },
  { value: 'teacher', label: USER_ROLE_LABELS.teacher },
  { value: 'secretary', label: USER_ROLE_LABELS.secretary },
]

function emptyForm() {
  return { firstName: '', lastName: '', email: '', phone: '', role: 'teacher', gender: '' }
}

function validate(form) {
  const errors = {}
  if (!form.firstName.trim()) errors.firstName = 'Le prénom est obligatoire.'
  if (!form.lastName.trim()) errors.lastName = 'Le nom est obligatoire.'
  if (!form.email.trim()) errors.email = "L'e-mail est obligatoire."
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'E-mail invalide.'
  if (!form.role) errors.role = 'Le rôle est obligatoire.'
  if (form.role !== 'secretary' && !normalizeGender(form.gender)) {
    errors.gender = 'Le genre est obligatoire.'
  }
  return errors
}

export default function CreateUserModal({ open, onClose, onCreated }) {
  const { canWrite } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [success, setSuccess] = useState(null)

  const reset = () => {
    setForm(emptyForm())
    setErrors({})
    setSubmitError(null)
    setSuccess(null)
    onClose?.()
  }

  const update = (field, value) => {
    setForm((c) => ({ ...c, [field]: value }))
    setErrors((c) => ({ ...c, [field]: null }))
    setSubmitError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const next = validate(form)
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    setSubmitError(null)
    const { user, error } = await createOrganizationUser(form)
    setBusy(false)
    if (error) {
      setSubmitError(getUserFacingError(error, 'invite'))
      return
    }
    setSuccess(user)
    onCreated?.(user)
  }

  return (
    <AppModal
      open={open}
      onClose={reset}
      disableClose={busy}
      eyebrow="Utilisateurs"
      title="Créer un compte"
      subtitle="Une invitation sera envoyée par e-mail."
      size="md"
      footer={success ? (
        <AppModalFooter onClose={reset} closeLabel="Fermer" hideSubmit />
      ) : (
        <AppModalFooter
          onClose={reset}
          submitForm={FORM_ID}
          submitLabel={busy ? 'Création…' : 'Créer et inviter'}
          submitDisabled={!canWrite || busy}
        />
      )}
    >
      {success ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Compte créé. Invitation envoyée à {form.email}.
        </p>
      ) : (
        <form id={FORM_ID} className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Nom</span>
              <input className={inputClass} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} disabled={!canWrite || busy} />
              {errors.lastName && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.lastName}</p>}
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Prénom</span>
              <input className={inputClass} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} disabled={!canWrite || busy} />
              {errors.firstName && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.firstName}</p>}
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">E-mail</span>
            <input className={inputClass} type="email" value={form.email} onChange={(e) => update('email', e.target.value)} disabled={!canWrite || busy} />
            {errors.email && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.email}</p>}
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Téléphone</span>
            <input className={inputClass} type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} disabled={!canWrite || busy} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Rôle</span>
            <select className={inputClass} value={form.role} onChange={(e) => update('role', e.target.value)} disabled={!canWrite || busy}>
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          {form.role !== 'secretary' && (
            <fieldset className="block">
              <legend className="text-sm font-bold text-slate-700">Genre *</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {GENDER_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border-2 px-4 text-sm font-semibold transition ${
                      form.gender === option.value
                        ? 'border-cyan-400 bg-cyan-50 text-cyan-900'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="create-user-gender"
                      className="accent-cyan-600"
                      checked={form.gender === option.value}
                      disabled={!canWrite || busy}
                      onChange={() => update('gender', option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {errors.gender && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.gender}</p>}
            </fieldset>
          )}
          {submitError && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{submitError}</p>
          )}
        </form>
      )}
    </AppModal>
  )
}
