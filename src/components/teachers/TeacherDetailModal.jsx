import { useEffect, useState } from 'react'
import { formatPostalAddress } from '../../lib/address'
import {
  computeAccountStatus,
  computeTeacherStatus,
  formatDateFr,
  formatDateTimeFr,
  staffRoleLabel,
  STATUS_BADGE,
} from '../../lib/staffAccounts'
import { getTeacherAuthorizationSignedUrls } from '../../services/teachers'
import {
  getAuthorizationFieldLabel,
  getResourceTypeLabel,
  TEACHING_RESOURCE_TYPES,
} from '../../lib/teachingResources'
import AppModal, { AppModalFooter } from '../ui/AppModal'

export default function TeacherDetailModal({ open, teacher, onClose, onEdit }) {
  const [authorizationUrls, setAuthorizationUrls] = useState({ rectoUrl: null, versoUrl: null })

  useEffect(() => {
    if (!open || !teacher) {
      setAuthorizationUrls({ rectoUrl: null, versoUrl: null })
      return undefined
    }
    let cancelled = false
    getTeacherAuthorizationSignedUrls(teacher).then((urls) => {
      if (!cancelled) setAuthorizationUrls(urls)
    })
    return () => { cancelled = true }
  }, [open, teacher])

  if (!teacher) return null

  const accountStatus = computeAccountStatus({
    isActive: teacher.account_is_active,
    invitedAt: teacher.invited_at,
    emailConfirmedAt: teacher.email_confirmed_at,
    lastSignInAt: teacher.last_sign_in_at,
  })
  const teacherStatus = computeTeacherStatus({
    isActive: teacher.is_active,
    employmentStatus: teacher.employment_status,
  })
  const isSimulator = teacher.resource_type === TEACHING_RESOURCE_TYPES.SIMULATOR

  return (
    <AppModal
      open={open}
      onClose={onClose}
      eyebrow="Fiche complète"
      title={teacher.full_name}
      size="lg"
      footer={(
        <AppModalFooter onClose={onClose} closeLabel="Fermer" hideSubmit>
          <button type="button" className="pd-btn-primary w-full sm:w-auto" onClick={() => onEdit?.(teacher)}>
            Modifier
          </button>
        </AppModalFooter>
      )}
    >
      <section className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
        <h3 className="text-sm font-extrabold text-slate-900">Compte associé</h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="font-bold text-slate-500">E-mail compte</dt>
            <dd className="font-semibold text-slate-900">{teacher.email || '—'}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Rôle</dt>
            <dd className="font-semibold text-slate-900">{staffRoleLabel('teacher', teacher.gender)}</dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Statut du compte</dt>
            <dd>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${STATUS_BADGE[accountStatus.tone]}`}>
                {accountStatus.label}
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-bold text-slate-500">Dernière connexion</dt>
            <dd className="font-semibold text-slate-900">{formatDateTimeFr(teacher.last_sign_in_at)}</dd>
          </div>
        </dl>
      </section>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
        <div><dt className="font-bold text-slate-500">Type</dt><dd className="mt-1 font-semibold">{getResourceTypeLabel(teacher.resource_type)}</dd></div>
        <div><dt className="font-bold text-slate-500">Téléphone</dt><dd className="mt-1 font-semibold">{teacher.phone || '—'}</dd></div>
        {!isSimulator && (
          <div><dt className="font-bold text-slate-500">Date de naissance</dt><dd className="mt-1 font-semibold">{formatDateFr(teacher.birth_date)}</dd></div>
        )}
        {!isSimulator && (
        <div className="sm:col-span-2">
          <dt className="font-bold text-slate-500">Adresse</dt>
          <dd className="mt-1 font-semibold">
            {formatPostalAddress({
              streetNumber: teacher.street_number,
              street: teacher.street,
              postalCode: teacher.postal_code,
              city: teacher.city,
              fallback: teacher.address,
            })}
          </dd>
        </div>
        )}
        <div><dt className="font-bold text-slate-500">{getAuthorizationFieldLabel(teacher.resource_type)}</dt><dd className="mt-1 font-semibold">{teacher.authorization_number || '—'}</dd></div>
        <div><dt className="font-bold text-slate-500">Validité autorisation</dt><dd className="mt-1 font-semibold">{formatDateFr(teacher.authorization_expires_at)}</dd></div>
        {!isSimulator && (authorizationUrls.rectoUrl || authorizationUrls.versoUrl) && (
          <div className="sm:col-span-2">
            <dt className="font-bold text-slate-500">Autorisation d&apos;enseigner</dt>
            <dd className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {authorizationUrls.rectoUrl && (
                <a className="block overflow-hidden rounded-2xl border-2 border-slate-300 bg-white" href={authorizationUrls.rectoUrl} rel="noreferrer" target="_blank">
                  <img alt="Recto autorisation d'enseigner" className="max-h-44 w-full object-contain p-2" src={authorizationUrls.rectoUrl} />
                  <span className="block border-t-2 border-slate-200 px-3 py-2 text-xs font-bold text-cyan-700">Recto — ouvrir</span>
                </a>
              )}
              {authorizationUrls.versoUrl && (
                <a className="block overflow-hidden rounded-2xl border-2 border-slate-300 bg-white" href={authorizationUrls.versoUrl} rel="noreferrer" target="_blank">
                  <img alt="Verso autorisation d'enseigner" className="max-h-44 w-full object-contain p-2" src={authorizationUrls.versoUrl} />
                  <span className="block border-t-2 border-slate-200 px-3 py-2 text-xs font-bold text-cyan-700">Verso — ouvrir</span>
                </a>
              )}
            </dd>
          </div>
        )}
        {!isSimulator && (
        <div>
          <dt className="font-bold text-slate-500">Statut métier</dt>
          <dd className="mt-1">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${STATUS_BADGE[teacherStatus.tone]}`}>
              {teacherStatus.label}
            </span>
          </dd>
        </div>
        )}
        {!isSimulator && (
        <div className="sm:col-span-2">
          <dt className="font-bold text-slate-500">Catégories enseignées</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {(teacher.authorized_categories || []).length
              ? teacher.authorized_categories.map((c) => (
                <span key={c} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">{c}</span>
              ))
              : '—'}
          </dd>
        </div>
        )}
      </dl>
    </AppModal>
  )
}
