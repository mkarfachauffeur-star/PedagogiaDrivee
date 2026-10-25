/** Helpers SaaS — les tarifs sont lus depuis la table `plans` (jamais codés en dur). */

import { formatDate, formatDateTime, formatEuros } from './format'

export const PAYING_PLAN_CODES = new Set(['starter', 'premium', 'monthly'])

export function formatPlatformEur(centsOrEuros, { fromCents = false } = {}) {
  return formatEuros(Number(centsOrEuros || 0), { fromCents })
}

export function formatPlatformDate(value) {
  return formatDate(value)
}

export function formatPlatformDateTime(value) {
  return formatDateTime(value)
}

export function resolveSubscriptionStatus(org, sub, plan, now = new Date()) {
  if (!org || !sub) return '—'
  if (org.status === 'cancelled' || sub.status === 'cancelled') return 'Résilié'
  if (org.status === 'suspended' || sub.status === 'suspended') return 'Suspendu'

  const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null
  const planCode = plan?.code || 'trial'
  const inTrial =
    org.status === 'trial'
    || planCode === 'trial'
    || (trialEnd && trialEnd > now && !PAYING_PLAN_CODES.has(planCode))

  if (inTrial) return 'Essai'
  if (planCode === 'starter' || planCode === 'monthly') return 'Starter'
  if (planCode === 'premium') return 'Premium'
  return 'Essai'
}

export function resolveBillingStatus(org, sub, plan, hasFailedPayment, now = new Date()) {
  if (hasFailedPayment) return 'Paiement échoué'
  const base = resolveSubscriptionStatus(org, sub, plan, now)
  if (base === 'Essai' || base === 'Starter' || base === 'Premium') return 'Actif'
  return base
}

export function planPriceCents(plan) {
  if (!plan) return 0
  return Number(plan.price_cents || 0)
}

export function monthlyRevenueForPlan(plan) {
  const code = plan?.code
  if (!PAYING_PLAN_CODES.has(code)) return 0
  return planPriceCents(plan)
}

export function averagePayingPlanCents(plans = []) {
  const paying = plans.filter((p) => PAYING_PLAN_CODES.has(p.code))
  if (!paying.length) return 0
  return paying.reduce((sum, p) => sum + planPriceCents(p), 0) / paying.length
}
