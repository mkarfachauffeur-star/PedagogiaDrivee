import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import PageHero from '../../components/ui/PageHero'
import { useAuth } from '../../context/AuthContext'
import {
  orgLogoUrl,
  updateOrganization,
  uploadOrgLogo,
} from '../../services/organization'
import {
  SIMULATOR_SESSION_SUPERVISOR_MODE_OPTIONS,
  normalizeSupervisorMode,
} from '../../lib/simulatorSessions'
import {
  isValidSiret,
  sanitizePhoneInput,
  sanitizePostalCode,
  sanitizeSiret,
  toOrganizationPatch,
  validateOrgProfileForm,
} from '../../lib/orgProfile'
import StudentCharterAdminSection from '../../components/students/StudentCharterAdminSection'

const inputClass = 'pd-input mt-2 w-full disabled:bg-slate-50'

export default function AdminSettingsPage() {
  const { profileId, user, profile, organizationId, organization, canWrite, refreshOrg } = useAuth()
  const [form, setForm] = useState({
    name: '',
    managerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    website: '',
    siret: '',
    prefecture_approval: '',
    simulator_session_supervisor_mode: 'admin_supervisor',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!organization) return
    setForm({
      name: organization.name || '',
      managerName: organization.manager_name || profile?.full_name || '',
      email: organization.email || '',
      phone: organization.phone || '',
      address: organization.address || '',
      city: organization.city || '',
      postal_code: organization.postal_code || '',
      website: organization.website || '',
      siret: organization.siret || '',
      prefecture_approval: organization.prefecture_approval || '',
      simulator_session_supervisor_mode: organization.simulator_session_supervisor_mode || 'admin_supervisor',
    })
  }, [organization, profile?.full_name])

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const save = async (e) => {
    e.preventDefault()
    if (!canWrite || !organizationId) return
    setMessage(null)
    setError(null)

    const { ok, errors, message: validationMessage } = validateOrgProfileForm({
      orgName: form.name,
      managerName: form.managerName,
      address: form.address,
      postalCode: form.postal_code,
      city: form.city,
      email: form.email,
      phone: form.phone,
      siret: form.siret,
      prefectureApproval: form.prefecture_approval,
      website: form.website,
    })
    if (!ok) {
      setFieldErrors({
        name: errors.orgName,
        managerName: errors.managerName,
        address: errors.address,
        postal_code: errors.postalCode,
        city: errors.city,
        email: errors.email,
        phone: errors.phone,
        siret: errors.siret,
        website: errors.website,
      })
      setError(validationMessage)
      return
    }

    setSaving(true)
    const patch = {
      ...toOrganizationPatch({
        name: form.name,
        managerName: form.managerName,
        address: form.address,
        postalCode: form.postal_code,
        city: form.city,
        email: form.email,
        phone: form.phone,
        siret: form.siret,
        prefectureApproval: form.prefecture_approval,
        website: form.website,
      }),
      simulator_session_supervisor_mode: form.simulator_session_supervisor_mode,
    }
    const { error: saveError } = await updateOrganization(organizationId, patch)
    setSaving(false)
    if (saveError) {
      setError('Erreur de sauvegarde.')
      return
    }
    setMessage('Profil de l’auto-école enregistré.')
    refreshOrg?.(user?.id)
  }

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !organizationId || !canWrite) return
    setLogoBusy(true)
    setError(null)
    const { path, error: uploadError } = await uploadOrgLogo(organizationId, file)
    if (uploadError || !path) {
      setLogoBusy(false)
      setError('Impossible d’importer le logo.')
      return
    }
    await updateOrganization(organizationId, { logo_storage_path: path })
    setLogoBusy(false)
    setMessage('Logo mis à jour.')
    refreshOrg?.(profileId)
  }

  const logoUrl = orgLogoUrl(organization?.logo_storage_path)
  const siretOk = !form.siret || isValidSiret(form.siret)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHero
        eyebrow="Paramètres"
        title="Profil de l'auto-école"
        subtitle="Identité, coordonnées et logo — réutilisés pour vos documents administratifs."
      />

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous en tant que gérant." icon="⚙️" />
      ) : (
        <>
          <StudentCharterAdminSection canWrite={canWrite} />

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Formules & tarifs</h2>
            <p className="mt-1 text-sm text-slate-500">Forfaits, heures incluses et tarifs AAC / CS de votre auto-école.</p>
            <Link
              to="/manager/packages"
              className="mt-4 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
            >
              Gérer les formules
              <ChevronRight className="h-4 w-4" />
            </Link>
          </section>

          <form className="space-y-6 rounded-2xl border border-slate-300 bg-white p-6" noValidate onSubmit={save}>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Logo</h2>
              <p className="mt-1 text-sm text-slate-500">Affiché sur le tableau de bord et prêt pour vos documents PDF.</p>
              <div className="mt-4 flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={`Logo ${form.name || 'auto-école'}`} className="h-20 w-20 rounded-2xl border border-slate-200 object-cover" />
                ) : (
                  <div className="grid h-20 w-20 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-3xl">🏫</div>
                )}
                {canWrite && (
                  <label className="cursor-pointer text-sm font-semibold text-blue-700">
                    {logoBusy ? 'Import…' : logoUrl ? 'Changer le logo' : 'Importer un logo'}
                    <input type="file" accept="image/*" className="hidden" disabled={logoBusy} onChange={onLogo} />
                  </label>
                )}
              </div>
            </div>

            <hr className="border-slate-300" />

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Identité</h2>
              <div className="mt-4 space-y-4">
                <Field
                  disabled={!canWrite}
                  error={fieldErrors.name}
                  label="Nom de l'auto-école *"
                  value={form.name}
                  onChange={(v) => update('name', v)}
                />
                <Field
                  disabled={!canWrite}
                  error={fieldErrors.managerName}
                  label="Nom du gérant *"
                  value={form.managerName}
                  onChange={(v) => update('managerName', v)}
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Coordonnées</h2>
              <div className="mt-4 space-y-4">
                <Field
                  disabled={!canWrite}
                  error={fieldErrors.address}
                  label="Adresse *"
                  value={form.address}
                  onChange={(v) => update('address', v)}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    disabled={!canWrite}
                    error={fieldErrors.postal_code}
                    inputMode="numeric"
                    label="Code postal *"
                    maxLength={5}
                    value={form.postal_code}
                    onChange={(v) => update('postal_code', sanitizePostalCode(v))}
                  />
                  <Field
                    disabled={!canWrite}
                    error={fieldErrors.city}
                    label="Ville *"
                    value={form.city}
                    onChange={(v) => update('city', v)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    disabled={!canWrite}
                    error={fieldErrors.phone}
                    label="Téléphone *"
                    type="tel"
                    value={form.phone}
                    onChange={(v) => update('phone', sanitizePhoneInput(v))}
                  />
                  <Field
                    disabled={!canWrite}
                    error={fieldErrors.email}
                    label="E-mail *"
                    type="email"
                    value={form.email}
                    onChange={(v) => update('email', v)}
                  />
                </div>
                <Field
                  disabled={!canWrite}
                  error={fieldErrors.website}
                  hint="Facultatif"
                  label="Site internet"
                  placeholder="https://www.exemple.fr"
                  value={form.website}
                  onChange={(v) => update('website', v)}
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Administratif</h2>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  SIRET *
                  <input
                    className={inputClass}
                    disabled={!canWrite}
                    inputMode="numeric"
                    maxLength={14}
                    value={form.siret}
                    onChange={(e) => update('siret', sanitizeSiret(e.target.value))}
                  />
                  {fieldErrors.siret && <p className="mt-1 text-xs font-semibold text-rose-600">{fieldErrors.siret}</p>}
                  {!fieldErrors.siret && form.siret && !siretOk && (
                    <p className="mt-1 text-xs font-semibold text-rose-600">
                      Le SIRET doit contenir exactement 14 chiffres ({form.siret.length}/14).
                    </p>
                  )}
                </label>
                <Field
                  disabled={!canWrite}
                  hint="Facultatif"
                  label="N° agrément préfectoral"
                  value={form.prefecture_approval}
                  onChange={(v) => update('prefecture_approval', v)}
                />
              </div>
            </div>

            <hr className="border-slate-300" />

            <div>
              <h2 className="text-lg font-semibold text-slate-950">Séances simulateur</h2>
              <p className="mt-1 text-sm text-slate-500">Paramètre compatible RdvPermis.</p>
              <div className="mt-4 space-y-3">
                {SIMULATOR_SESSION_SUPERVISOR_MODE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                      normalizeSupervisorMode(form.simulator_session_supervisor_mode) === option.value
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-300 bg-white hover:border-slate-400'
                    } ${!canWrite ? 'cursor-default opacity-80' : ''}`}
                  >
                    <input
                      checked={normalizeSupervisorMode(form.simulator_session_supervisor_mode) === option.value}
                      className="mt-1"
                      disabled={!canWrite}
                      name="simulator_session_supervisor_mode"
                      onChange={() => update('simulator_session_supervisor_mode', option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                      <span className="mt-1 block text-sm text-slate-600">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm font-semibold text-rose-700">{error}</p>}
            {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}
            {canWrite && (
              <button
                type="submit"
                disabled={saving || !siretOk}
                className="pd-btn-primary disabled:opacity-60"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer le profil'}
              </button>
            )}
          </form>
        </>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  disabled,
  error,
  hint,
  type = 'text',
  inputMode,
  maxLength,
  placeholder,
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {hint && <span className="ml-1 text-xs font-medium text-slate-400">({hint})</span>}
      <input
        className={inputClass}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </label>
  )
}
