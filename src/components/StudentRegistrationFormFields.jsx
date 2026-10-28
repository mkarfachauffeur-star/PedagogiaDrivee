import { useMemo } from 'react'
import {
  DOCUMENT_OPTIONS,
  LICENSE_CATEGORY_OPTIONS,
  PACKAGE_OPTIONS,
  STATUS_OPTIONS,
  computeRegistrationCompletion,
} from '../lib/studentRegistration'
import { GENDER_OPTIONS } from '../lib/genderedRoles'
import {
  formatPackageSelectLabel,
  groupPackagesForSelect,
  packageMatchesLicenseCategory,
} from '../services/pricing'

export const inputClass =
  'mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100'

function Field({ label, required, children, error, hint, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs font-medium text-slate-400">{hint}</span>}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </label>
  )
}

function FormSection({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-300 bg-white/80 p-5">
      <h3 className="mb-4 text-lg font-semibold text-slate-950">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  )
}

export default function StudentRegistrationFormFields({
  form,
  errors = {},
  onChange,
  onToggleDocument,
  teachers = [],
  pricingPackages = [],
  fileNumberPreview,
}) {
  const completion = computeRegistrationCompletion(form)

  const visiblePackages = useMemo(
    () => pricingPackages.filter((pkg) => packageMatchesLicenseCategory(pkg, form.licenseCategory)),
    [pricingPackages, form.licenseCategory],
  )
  const packageGroups = useMemo(
    () => groupPackagesForSelect(visiblePackages),
    [visiblePackages],
  )

  const packageSelectValue = form.packageId || form.packageName || ''
  const fallbackPackages = PACKAGE_OPTIONS.filter(
    (name) => !pricingPackages.some((pkg) => pkg.name === name),
  )

  const handlePackageChange = (value) => {
    const pkg = pricingPackages.find((row) => row.id === value)
    if (pkg) {
      onChange('packageId', pkg.id)
      onChange('packageName', pkg.name)
      return
    }
    onChange('packageId', '')
    onChange('packageName', value)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-blue-800">Complétion dossier</p>
          <p className="text-xl font-semibold text-blue-700">{completion}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-300 transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <FormSection title="Informations élève">
        <Field label="Nom" required error={errors.lastName}>
          <input className={inputClass} value={form.lastName} onChange={(e) => onChange('lastName', e.target.value)} autoComplete="family-name" />
        </Field>
        <Field label="Prénom" required error={errors.firstName}>
          <input className={inputClass} value={form.firstName} onChange={(e) => onChange('firstName', e.target.value)} autoComplete="given-name" />
        </Field>
        <Field label="Genre" required error={errors.gender} className="md:col-span-2 xl:col-span-2">
          <div className="mt-2 flex flex-wrap gap-3">
            {GENDER_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                  form.gender === option.value
                    ? 'border-blue-400 bg-blue-50 text-blue-900'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="student-gender"
                  className="accent-blue-600"
                  checked={form.gender === option.value}
                  onChange={() => onChange('gender', option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </Field>
        <Field label="E-mail" required error={errors.email}>
          <input className={inputClass} type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Téléphone">
          <input className={inputClass} type="tel" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} autoComplete="tel" />
        </Field>
        <Field label="Date de naissance">
          <input className={inputClass} type="date" value={form.birthDate} onChange={(e) => onChange('birthDate', e.target.value)} />
        </Field>
        <Field label="Lieu de naissance">
          <input className={inputClass} value={form.birthPlace} onChange={(e) => onChange('birthPlace', e.target.value)} />
        </Field>
        <Field label="N° de rue">
          <input className={inputClass} value={form.streetNumber} onChange={(e) => onChange('streetNumber', e.target.value)} placeholder="Ex. 12" />
        </Field>
        <Field label="Rue / voie" className="md:col-span-1 xl:col-span-3">
          <input className={inputClass} value={form.street} onChange={(e) => onChange('street', e.target.value)} placeholder="Ex. avenue de la République" autoComplete="street-address" />
        </Field>
        <Field label="Code postal">
          <input className={inputClass} value={form.postalCode} onChange={(e) => onChange('postalCode', e.target.value)} autoComplete="postal-code" />
        </Field>
        <Field label="Commune" className="md:col-span-1 xl:col-span-3">
          <input className={inputClass} value={form.city} onChange={(e) => onChange('city', e.target.value)} autoComplete="address-level2" />
        </Field>
        <Field label="NEPH">
          <input className={inputClass} value={form.neph} onChange={(e) => onChange('neph', e.target.value)} />
        </Field>
        <Field label="Catégorie permis">
          <select
            className={inputClass}
            value={form.licenseCategory}
            onChange={(e) => {
              onChange('licenseCategory', e.target.value)
              onChange('packageId', '')
              onChange('packageName', '')
            }}
          >
            {LICENSE_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Formule" required error={errors.packageName} className="md:col-span-2 xl:col-span-3">
          <select className={inputClass} value={packageSelectValue} onChange={(e) => handlePackageChange(e.target.value)}>
            <option value="">— Sélectionner —</option>
            {packageGroups.map((group) => (
              <optgroup key={group.key} label={group.label}>
                {group.items.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>{formatPackageSelectLabel(pkg)}</option>
                ))}
              </optgroup>
            ))}
            {fallbackPackages.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Field>
        <Field label="Heures supplémentaires" error={errors.extraHours} hint="Tarif horaire défini par le gérant dans les forfaits.">
          <input className={inputClass} type="text" inputMode="decimal" value={form.extraHours} onChange={(e) => onChange('extraHours', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Code obtenu">
          <select className={inputClass} value={form.codeStatus} onChange={(e) => onChange('codeStatus', e.target.value)}>
            <option value="Non obtenu">Non</option>
            <option value="Obtenu">Oui</option>
          </select>
        </Field>
        <Field label="Enseignant référent (optionnel)" className="md:col-span-2 xl:col-span-4">
          <select className={inputClass} value={form.teacherId} onChange={(e) => onChange('teacherId', e.target.value)}>
            <option value="">Aucun pour le moment</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection title="Informations administratives">
        <Field label="Paiement encaissé (€)" error={errors.payment} hint="À saisir manuellement.">
          <input className={inputClass} type="text" inputMode="decimal" value={form.payment} onChange={(e) => onChange('payment', e.target.value)} />
        </Field>
        <Field label="Reste à payer (€)" error={errors.remainingPayment} hint="À saisir manuellement.">
          <input className={inputClass} type="text" inputMode="decimal" value={form.remainingPayment} onChange={(e) => onChange('remainingPayment', e.target.value)} />
        </Field>
        <Field label="Date d'inscription">
          <input className={inputClass} type="date" value={form.registrationDate} onChange={(e) => onChange('registrationDate', e.target.value)} />
        </Field>
        {fileNumberPreview && (
          <Field label="Numéro dossier" hint="Généré automatiquement à l'enregistrement (aperçu).">
            <input className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`} readOnly value={fileNumberPreview} />
          </Field>
        )}
        <Field label="Statut du dossier">
          <select className={inputClass} value={form.status} onChange={(e) => onChange('status', e.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2 xl:col-span-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Documents fournis</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOCUMENT_OPTIONS.map((documentName) => (
              <button
                key={documentName}
                type="button"
                onClick={() => onToggleDocument(documentName)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  form.documents.includes(documentName)
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-blue-50'
                }`}
              >
                {form.documents.includes(documentName) ? '✓ ' : '+ '}
                {documentName}
              </button>
            ))}
          </div>
        </div>
      </FormSection>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-4">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          checked={form.sendAccessEmail !== false}
          onChange={(e) => onChange('sendAccessEmail', e.target.checked)}
        />
        <span>
          <span className="block text-sm font-semibold text-slate-800">
            Envoyer un e-mail d’accès avec mot de passe provisoire
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            L’élève recevra ses identifiants à l’adresse renseignée pour accéder à l’application, consulter son dossier et être rattaché à votre auto-école.
          </span>
        </span>
      </label>
    </div>
  )
}
