import { isNativeApp } from './nativeApp'
import { supabase } from './supabase'

// L'app iPhone ne parle pas d'abonnement : le contrat se gère hors de l'app.
const READ_ONLY_MESSAGE = isNativeApp
  ? 'Compte en lecture seule : consultation et exports autorisés.'
  : 'Compte en lecture seule — consultation et exports autorisés. Contactez PEDAGOGIA DRIVE pour réactiver votre abonnement.'

export function computeCanWrite(organization, subscription) {
  if (!organization) return false
  if (['suspended', 'cancelled'].includes(organization.status)) return false
  if (subscription?.status && ['suspended', 'expired', 'cancelled'].includes(subscription.status)) {
    return false
  }
  if (organization.status === 'trial' && subscription?.trial_ends_at) {
    if (new Date(subscription.trial_ends_at) < new Date()) return false
  }
  return true
}

export function isOrgReadOnly(organization, subscription) {
  return !computeCanWrite(organization, subscription)
}

export async function fetchOrgWriteAccess() {
  const [orgRes, subRes] = await Promise.all([
    supabase.from('organizations').select('status').maybeSingle(),
    supabase.from('subscriptions').select('status, trial_ends_at').maybeSingle(),
  ])
  return computeCanWrite(orgRes.data, subRes.data)
}

export async function assertOrgCanWrite() {
  const allowed = await fetchOrgWriteAccess()
  if (!allowed) {
    const error = new Error(READ_ONLY_MESSAGE)
    error.code = 'ORG_READ_ONLY'
    throw error
  }
  return true
}

export { READ_ONLY_MESSAGE }
