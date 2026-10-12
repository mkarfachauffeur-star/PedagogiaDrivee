import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  createTeacher,
  EMPLOYMENT_STATUS_OPTIONS,
  getTeacherAuthorizationSignedUrls,
  listTeacherRoleProfilesWithoutRecord,
  saveTeacherAuthorizationImages,
  TEACHER_CATEGORY_OPTIONS,
  updateTeacher,
} from '../../services/teachers'
import { getUserFacingError } from '../../lib/userFacingError'
import { teacherAddressFromRecord } from '../../lib/address'
import { normalizePhoneDigits, validatePhoneDigits } from '../../lib/phone'
import { splitFullName } from '../../lib/staffAccounts'
import { GENDER_OPTIONS, normalizeGender } from '../../lib/genderedRoles'
import {
  AUTHORIZATION_NUMBER_HINTS,
  getAuthorizationFieldLabel,
  normalizeAuthorizationNumber,
  normalizeTeachingResourceType,
  TEACHING_RESOURCE_TYPE_OPTIONS,
  TEACHING_RESOURCE_TYPES,
  validateTeachingResourceAuthorization,
} from '../../lib/teachingResources'
import AppModal, { AppModalFooter } from '../ui/AppModal'
import ImageUploadField from '../ui/ImageUploadField'

const FORM_ID = 'teacher-form'
const inputClass =
  'mt-2 min-h-11 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100'

function teacherToForm(teacher) {
  const { firstName, lastName } = splitFullName(teacher?.full_name || '')
  const address = teacherAddressFromRecord(teacher)
  return {
    linkProfileId: teacher?.profile_id || '',
    resourceType: normalizeTeachingResourceType(teacher?.resource_type),
    firstName,
    lastName,
    email: teacher?.email || '',
    phone: normalizePhoneDigits(teacher?.phone || ''),
    birthDate: teacher?.birth_date || '',
    authorizationNumber: teacher?.authorization_number || '',
    authorizationExpiresAt: teacher?.authorization_expires_at || '',
    categories: teacher?.authorized_categories || [],
    streetNumber: address.streetNumber,
    street: address.street,
    postalCode: address.postalCode,
    city: address.city,
    employmentStatus: teacher?.employment_status || 'Salarié',
    gender: teacher?.gender || '',
  }
}

function emptyForm() {
  return teacherToForm(null)
}

function validate(form, isEdit) {
  const errors = {}
  const resourceType = normalizeTeachingResourceType(form.resourceType)
  const isSimulator = resourceType === TEACHING_RESOURCE_TYPES.SIMULATOR

  if (!form.lastName.trim()) {
    errors.lastName = isSimulator ? 'Le nom du simulateur est obligatoire.' : 'Le nom est obligatoire.'
  }
  if (!isSimulator && !form.firstName.trim()) errors.firstName = 'Le prénom est obligatoire.'
  if (!isEdit && !form.linkProfileId && !isSimulator) {
    if (!form.email.trim()) errors.email = "L'e-mail est obligatoire."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'E-mail invalide.'
  }
  if (!isSimulator && !form.categories.length) errors.categories = 'Sélectionnez au moins une catégorie.'

  const authorizationError = validateTeachingResourceAuthorization(resourceType, form.authorizationNumber)
  if (authorizationError) errors.authorizationNumber = authorizationError

  if (!isSimulator) {
    const phoneError = validatePhoneDigits(form.phone)
    if (phoneError) errors.phone = phoneError
  }

  if (!isSimulator && !normalizeGender(form.gender)) {
    errors.gender = 'Le genre est obligatoire.'
  }

  return errors
}

export default function TeacherFormModal({ open, mode = 'create', teacher, onClose, onSaved }) {
  const { canWrite, organizationId } = useAuth()
  const isEdit = mode === 'edit'
  const readOnly = mode === 'view'
  const [form, setForm] = useState(emptyForm())
  const [linkableProfiles, setLinkableProfiles] = useState([])
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [rectoFile, setRectoFile] = useState(null)
  const [versoFile, setVersoFile] = useState(null)
  const [existingRectoUrl, setExistingRectoUrl] = useState(null)
  const [existingVersoUrl, setExistingVersoUrl] = useState(null)
  const [rectoBlobUrl, setRectoBlobUrl] = useState(null)
  const [versoBlobUrl, setVersoBlobUrl] = useState(null)

  useEffect(() => {
    if (!open) return undefined
    setForm(teacher ? teacherToForm(teacher) : emptyForm())
    setErrors({})
    setSubmitError(null)
    setRectoFile(null)
    setVersoFile(null)
    setRectoBlobUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })
    setVersoBlobUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })
    setExistingRectoUrl(null)
    setExistingVersoUrl(null)

    let cancelled = false
    if (teacher) {
      getTeacherAuthorizationSignedUrls(teacher).then(({ rectoUrl, versoUrl }) => {
        if (!cancelled) {
          setExistingRectoUrl(rectoUrl)
          setExistingVersoUrl(versoUrl)
        }
      })
    }
    if (!isEdit && !readOnly) {
      listTeacherRoleProfilesWithoutRecord().then(({ profiles }) => setLinkableProfiles(profiles))
    }

    return () => {
      cancelled = true
    }
  }, [open, teacher, isEdit, readOnly])

  useEffect(() => () => {
    if (rectoBlobUrl) URL.revokeObjectURL(rectoBlobUrl)
    if (versoBlobUrl) URL.revokeObjectURL(versoBlobUrl)
  }, [rectoBlobUrl, versoBlobUrl])

  const handleRectoChange = (file) => {
    if (rectoBlobUrl) URL.revokeObjectURL(rectoBlobUrl)
    setRectoFile(file)
    setRectoBlobUrl(file ? URL.createObjectURL(file) : null)
  }

  const handleVersoChange = (file) => {
    if (versoBlobUrl) URL.revokeObjectURL(versoBlobUrl)
    setVersoFile(file)
    setVersoBlobUrl(file ? URL.createObjectURL(file) : null)
  }

  const update = (field, value) => {
    setForm((c) => ({ ...c, [field]: value }))
    setErrors((c) => ({ ...c, [field]: null }))
    setSubmitError(null)
  }

  const toggleCategory = (category) => {
    if (readOnly) return
    setForm((c) => ({
      ...c,
      categories: c.categories.includes(category)
        ? c.categories.filter((item) => item !== category)
        : [...c.categories, category],
    }))
    setErrors((c) => ({ ...c, categories: null }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (readOnly) return
    const next = validate(form, isEdit)
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    setSubmitError(null)
    const action = isEdit
      ? updateTeacher(teacher.profile_id, form)
      : createTeacher(form)
    const { teacher: saved, error } = await action
    if (error) {
      setBusy(false)
      setSubmitError(getUserFacingError(error, 'save'))
      return
    }

    const profileId = saved?.profile_id || teacher?.profile_id
    if ((rectoFile || versoFile) && profileId && organizationId) {
      const { error: uploadError } = await saveTeacherAuthorizationImages(profileId, organizationId, {
        rectoFile,
        versoFile,
      })
      if (uploadError) {
        setBusy(false)
        setSubmitError(getUserFacingError(uploadError, 'document'))
        return
      }
    }

    setBusy(false)
    onSaved?.()
    onClose?.()
  }

  const title = readOnly
    ? (form.resourceType === TEACHING_RESOURCE_TYPES.SIMULATOR ? 'Fiche simulateur' : 'Fiche enseignant')
    : isEdit
      ? (form.resourceType === TEACHING_RESOURCE_TYPES.SIMULATOR ? 'Modifier le simulateur' : 'Modifier l\'enseignant')
      : 'Ajouter une ressource pédagogique'

  const isSimulator = form.resourceType === TEACHING_RESOURCE_TYPES.SIMULATOR
  const authorizationHint = AUTHORIZATION_NUMBER_HINTS[form.resourceType]

  return (
    <AppModal
      open={open}
      onClose={onClose}
      disableClose={busy}
      eyebrow="Équipe pédagogique"
      title={title}
      size="lg"
      footer={!readOnly ? (
        <AppModalFooter
          onClose={onClose}
          submitForm={FORM_ID}
          submitLabel={busy ? 'Enregistrement…' : isEdit ? 'Enregistrer' : isSimulator ? 'Créer le simulateur' : 'Créer l\'enseignant'}
          submitDisabled={!canWrite || busy}
        />
      ) : (
        <AppModalFooter onClose={onClose} closeLabel="Fermer" hideSubmit />
      )}
    >
      <form id={FORM_ID} className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Type de ressource</span>
          <select
            className={inputClass}
            value={form.resourceType}
            onChange={(e) => {
              const nextType = normalizeTeachingResourceType(e.target.value)
              setForm((current) => ({
                ...current,
                resourceType: nextType,
                ...(nextType === TEACHING_RESOURCE_TYPES.SIMULATOR
                  ? {
                    phone: '',
                    email: '',
                    firstName: '',
                    birthDate: '',
                    categories: [],
                    employmentStatus: 'Salarié',
                  }
                  : {}),
              }))
              setErrors({})
              setSubmitError(null)
            }}
            disabled={readOnly || !canWrite || busy || isEdit}
          >
            {TEACHING_RESOURCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        {!isEdit && !readOnly && !isSimulator && linkableProfiles.length > 0 && (
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Lier à un compte enseignant existant (optionnel)</span>
            <select
              className={inputClass}
              value={form.linkProfileId}
              onChange={(e) => {
                const id = e.target.value
                if (!id) {
                  update('linkProfileId', '')
                  return
                }
                const profile = linkableProfiles.find((p) => p.id === id)
                if (profile) {
                  const { firstName, lastName } = splitFullName(profile.full_name)
                  setForm((c) => ({
                    ...c,
                    linkProfileId: id,
                    firstName,
                    lastName,
                    email: profile.email || c.email,
                    phone: profile.phone || c.phone,
                  }))
                }
              }}
              disabled={!canWrite || busy}
            >
              <option value="">Créer un nouveau compte + fiche</option>
              {linkableProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} — {p.email}</option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">{isSimulator ? 'Nom du simulateur' : 'Nom'}</span>
            <input className={inputClass} value={form.lastName} onChange={(e) => update('lastName', e.target.value)} disabled={readOnly || !canWrite || busy} />
            {errors.lastName && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.lastName}</p>}
          </label>
          {!isSimulator && (
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Prénom</span>
              <input className={inputClass} value={form.firstName} onChange={(e) => update('firstName', e.target.value)} disabled={readOnly || !canWrite || busy} />
              {errors.firstName && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.firstName}</p>}
            </label>
          )}
        </div>

        {!isSimulator && (
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
                    name="teacher-gender"
                    className="accent-cyan-600"
                    checked={form.gender === option.value}
                    disabled={readOnly || !canWrite || busy}
                    onChange={() => update('gender', option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {errors.gender && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.gender}</p>}
          </fieldset>
        )}

        {!isSimulator && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">E-mail</span>
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              disabled={readOnly || !canWrite || busy || Boolean(form.linkProfileId)}
            />
            {errors.email && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.email}</p>}
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Téléphone</span>
            <input
              className={inputClass}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              placeholder="10 chiffres"
              value={form.phone}
              onChange={(e) => update('phone', normalizePhoneDigits(e.target.value))}
              disabled={readOnly || !canWrite || busy}
            />
            {errors.phone && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.phone}</p>}
          </label>
        </div>
        )}

        {!isSimulator && (
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Date de naissance</span>
            <input className={inputClass} type="date" value={form.birthDate} onChange={(e) => update('birthDate', e.target.value)} disabled={readOnly || !canWrite || busy} />
          </label>
        )}

        {!isSimulator && (
        <fieldset className="rounded-2xl border-2 border-slate-300 bg-slate-50/50 p-4">
          <legend className="px-1 text-sm font-bold text-slate-700">Adresse</legend>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">N° de rue</span>
              <input
                autoComplete="address-line2"
                className={inputClass}
                disabled={readOnly || !canWrite || busy}
                onChange={(e) => update('streetNumber', e.target.value)}
                placeholder="Ex. 12"
                value={form.streetNumber}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-bold text-slate-700">Rue / voie</span>
              <input
                autoComplete="street-address"
                className={inputClass}
                disabled={readOnly || !canWrite || busy}
                onChange={(e) => update('street', e.target.value)}
                placeholder="Ex. avenue de la République"
                value={form.street}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Code postal</span>
              <input
                autoComplete="postal-code"
                className={inputClass}
                disabled={readOnly || !canWrite || busy}
                inputMode="numeric"
                maxLength={5}
                onChange={(e) => update('postalCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Ex. 75001"
                value={form.postalCode}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Commune</span>
              <input
                autoComplete="address-level2"
                className={inputClass}
                disabled={readOnly || !canWrite || busy}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Ex. Paris"
                value={form.city}
              />
            </label>
          </div>
        </fieldset>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">{getAuthorizationFieldLabel(form.resourceType)}</span>
            <input
              className={inputClass}
              value={form.authorizationNumber}
              onChange={(e) => update('authorizationNumber', normalizeAuthorizationNumber(e.target.value))}
              disabled={readOnly || !canWrite || busy}
              placeholder={authorizationHint}
              maxLength={11}
            />
            {errors.authorizationNumber && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.authorizationNumber}</p>}
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Validité de l&apos;autorisation</span>
            <input className={inputClass} type="date" value={form.authorizationExpiresAt} onChange={(e) => update('authorizationExpiresAt', e.target.value)} disabled={readOnly || !canWrite || busy} />
          </label>
        </div>

        {!isSimulator && (
        <fieldset className="rounded-2xl border-2 border-slate-300 bg-slate-50/80 p-4">
          <legend className="px-1 text-sm font-bold text-slate-700">Autorisation d&apos;enseigner — dossier</legend>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Ajoutez le recto et le verso de la carte pour archivage dans le dossier moniteur.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ImageUploadField
              disabled={readOnly || !canWrite || busy}
              file={rectoFile}
              hint="Photo ou scan — face avant"
              label="Recto"
              onChange={handleRectoChange}
              previewUrl={rectoBlobUrl || existingRectoUrl}
            />
            <ImageUploadField
              disabled={readOnly || !canWrite || busy}
              file={versoFile}
              hint="Photo ou scan — face arrière"
              label="Verso"
              onChange={handleVersoChange}
              previewUrl={versoBlobUrl || existingVersoUrl}
            />
          </div>
        </fieldset>
        )}

        {!isSimulator && (
        <fieldset>
          <legend className="text-sm font-bold text-slate-700">Catégories enseignées</legend>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [-webkit-overflow-scrolling:touch]">
            {TEACHER_CATEGORY_OPTIONS.map((category) => {
              const selected = form.categories.includes(category)
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  disabled={readOnly || !canWrite || busy}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                    selected ? 'bg-cyan-600 text-white' : 'border-2 border-slate-300 bg-slate-50 text-slate-700'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
          {errors.categories && <p className="mt-2 text-xs font-semibold text-rose-600">{errors.categories}</p>}
        </fieldset>
        )}

        {!isSimulator && (
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Statut</span>
          <select className={inputClass} value={form.employmentStatus} onChange={(e) => update('employmentStatus', e.target.value)} disabled={readOnly || !canWrite || busy}>
            {EMPLOYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        )}

        {submitError && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {submitError}
          </p>
        )}
      </form>
    </AppModal>
  )
}
