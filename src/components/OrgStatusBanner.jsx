import { useAuth } from '../context/AuthContext'
import { isNativeApp } from '../lib/nativeApp'

export default function OrgStatusBanner() {
  const { organization, subscription, studentCount, canWrite, isTrial } = useAuth()

  if (!organization) return null

  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : null
  const maxStudents = subscription?.plan?.max_students

  // Dans l'app iPhone, aucune mention d'essai ni d'abonnement : le contrat se gère hors de l'app.
  if (isNativeApp) {
    if (canWrite) return null
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900">
        Compte en lecture seule : consultation et exports autorisés.
      </div>
    )
  }

  if (organization.status === 'suspended' || organization.status === 'cancelled') {
    return (
      <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-800">
        Compte en lecture seule — consultation et exports autorisés. Contactez PEDAGOGIA DRIVE pour réactiver votre abonnement.
      </div>
    )
  }

  if (!canWrite && isTrial && trialEnd && trialEnd < new Date()) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-bold text-amber-900">
        Essai gratuit expiré — mode consultation. Souscrivez un abonnement pour continuer à modifier vos données.
      </div>
    )
  }

  if (isTrial && daysLeft != null) {
    return (
      <div className="border-b border-cyan-200 bg-cyan-50 px-4 py-3 text-center text-sm font-semibold text-cyan-900">
        Essai gratuit — {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
        {maxStudents != null && ` · ${studentCount}/${maxStudents} élèves`}
      </div>
    )
  }

  return null
}
