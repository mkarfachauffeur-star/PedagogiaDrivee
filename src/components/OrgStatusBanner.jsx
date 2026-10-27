import { useAuth } from '../context/AuthContext'
import { useStudentQuota } from '../hooks/useStudentQuota'
import { formatDate } from '../lib/format'
import { isNativeApp } from '../lib/nativeApp'

export default function OrgStatusBanner() {
  const { organization, subscription, canWrite, isTrial } = useAuth()
  const quota = useStudentQuota(subscription, organization?.id)

  if (!organization) return null

  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - Date.now()) / 86400000)) : null

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
        {quota && ` · ${quota.used}/${quota.max} élèves`}
      </div>
    )
  }

  // Formule limitée (Starter) : alerte à 40 élèves, blocage à la limite, sur l'année d'abonnement.
  if (quota && quota.level !== 'ok') {
    const lastDay = quota.period ? formatDate(new Date(quota.period.end.getTime() - 86400000)) : null
    const periodLabel = quota.period?.isTrial ? 'période d’essai' : 'année d’abonnement'
    const planName = subscription?.plan?.name || 'actuelle'
    const contact = (
      <a className="underline underline-offset-2" href="mailto:contact@pedagogia-drive.fr">
        contactez Pedagogia Drive
      </a>
    )
    return quota.level === 'full' ? (
      <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-800">
        Limite de {quota.max} élèves atteinte pour votre formule {planName}
        {lastDay ? ` (${periodLabel} jusqu’au ${lastDay})` : ''} : vous ne pouvez plus inscrire de nouvel élève.
        Pour continuer, {contact} afin de passer à la formule Premium.
      </div>
    ) : (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900">
        {quota.used} élèves inscrits sur {quota.max} inclus dans votre formule {planName}
        {lastDay ? ` (${periodLabel} jusqu’au ${lastDay})` : ''}. Pour ne pas être bloqué à {quota.max}, {contact} afin de
        passer à la formule Premium.
      </div>
    )
  }

  return null
}
