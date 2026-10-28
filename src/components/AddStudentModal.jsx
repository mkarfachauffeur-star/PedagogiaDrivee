import { useEffect, useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import StudentRegistrationFormFields from './StudentRegistrationFormFields'
import { createStudent, listOrganizationTeachers, listStudents } from '../services/students'
import { listPricingPackages } from '../services/pricing'
import { useAuth } from '../context/AuthContext'
import {
  buildCreateStudentPayload,
  createEmptyStudentForm,
  previewFileNumber,
  validateStudentRegistrationForm,
} from '../lib/studentRegistration'
import { getUserFacingError } from '../lib/userFacingError'
import AppModal, { AppModalFooter } from './ui/AppModal'

const FORM_ID = 'add-student-form'

export default function AddStudentModal({ open, onClose, onCreated }) {
  const { canWrite } = useAuth()
  const [form, setForm] = useState(createEmptyStudentForm)
  const [errors, setErrors] = useState({})
  const [teachers, setTeachers] = useState([])
  const [packages, setPackages] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    let active = true
    Promise.all([listOrganizationTeachers(), listPricingPackages(true), listStudents()]).then(
      ([teacherRows, pkgRes, studentRes]) => {
        if (!active) return
        setTeachers(teacherRows)
        setPackages(pkgRes.packages || [])
        setStudentCount(studentRes.students?.length || 0)
      },
    )
    return () => {
      active = false
    }
  }, [open])

  const fileNumberPreview = useMemo(
    () => previewFileNumber({
      studentCount,
      lastName: form.lastName,
      firstName: form.firstName,
    }),
    [studentCount, form.lastName, form.firstName],
  )

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: null }))
    setSubmitError(null)
  }

  const toggleDocument = (documentName) => {
    setForm((current) => ({
      ...current,
      documents: current.documents.includes(documentName)
        ? current.documents.filter((item) => item !== documentName)
        : [...current.documents, documentName],
    }))
  }

  const handleClose = () => {
    if (busy) return
    setForm(createEmptyStudentForm())
    setErrors({})
    setSubmitError(null)
    setSuccess(null)
    setCopied(false)
    onClose?.()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      setSubmitError('Compte en lecture seule — consultation et exports autorisés.')
      return
    }
    const nextErrors = validateStudentRegistrationForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    setSubmitError(null)
    const { error, student, email, fullName, message, tempPassword, emailSent } = await createStudent(
      buildCreateStudentPayload(form),
    )
    setBusy(false)
    if (error) {
      setSubmitError(getUserFacingError(error, 'createStudent'))
      return
    }
    setSuccess({ student, email, fullName, message, tempPassword, emailSent })
    onCreated?.(student)
  }

  const copyPassword = async () => {
    if (!success?.tempPassword) return
    try {
      await navigator.clipboard.writeText(success.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      disableClose={busy}
      title="Ajouter un élève"
      subtitle="Création du compte, du dossier et des accès."
      size="2xl"
      zIndex={120}
      footer={success ? (
        <AppModalFooter onClose={handleClose} closeLabel="Fermer" hideSubmit />
      ) : (
        <AppModalFooter
          onClose={handleClose}
          submitForm={FORM_ID}
          submitLabel={busy ? 'Création…' : 'Créer l\'élève'}
          submitDisabled={busy || !canWrite}
        />
      )}
    >
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Élève créé avec succès</p>
          <ul className="mt-3 space-y-2 text-sm text-emerald-900">
            <li><span className="font-semibold">Nom :</span> {success.fullName}</li>
            <li><span className="font-semibold">E-mail (identifiant) :</span> {success.email}</li>
            {success.student?.file_number && (
              <li><span className="font-semibold">N° dossier :</span> {success.student.file_number}</li>
            )}
            {success.tempPassword && (
              <li className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Mot de passe provisoire :</span>
                <code className="rounded-lg bg-white px-2 py-1 font-mono text-sm">{success.tempPassword}</code>
                <button type="button" onClick={copyPassword} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-800">
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-emerald-700">
            {success.message || (success.emailSent
              ? 'Un e-mail d\u2019accès a été envoyé à l\u2019élève avec ses identifiants.'
              : 'Communiquez le mot de passe provisoire à l\u2019élève s\u2019il n\u2019a pas reçu l\u2019e-mail.')}
          </p>
        </div>
      ) : (
        <form id={FORM_ID} className="space-y-4" onSubmit={handleSubmit}>
          <StudentRegistrationFormFields
            form={form}
            errors={errors}
            onChange={update}
            onToggleDocument={toggleDocument}
            teachers={teachers}
            pricingPackages={packages}
            fileNumberPreview={fileNumberPreview}
          />
          {submitError && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{submitError}</p>
          )}
        </form>
      )}
    </AppModal>
  )
}
