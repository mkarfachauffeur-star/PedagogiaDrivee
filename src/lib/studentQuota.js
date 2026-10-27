/**
 * Quota d'élèves des formules limitées (Starter : 50 élèves).
 *
 * Pendant l'essai gratuit, les élèves sont comptés sur la période d'essai. L'année d'abonnement
 * commence à la fin de l'essai, quand l'abonnement payant démarre : 12 mois, puis le compteur
 * repart à zéro à chaque date anniversaire. Un changement de formule par Pedagogia Drive ouvre
 * une nouvelle année. Un e-mail prévient l'auto-école à 40 élèves ; à 50, l'inscription d'un
 * nouvel élève est bloquée jusqu'au passage manuel à une formule supérieure.
 *
 * Même règle que supabase/functions/_shared/student-quota.ts (côté serveur).
 */

export const QUOTA_ALERT_THRESHOLD = 40

function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function addYears(date, years) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

/** Période de comptage en cours : { start, end, isTrial } (fin exclue). */
export function quotaPeriod(subscription, now = new Date()) {
  const planStartedAt = toDate(subscription?.metadata?.plan_started_at)
  const trialEnd = toDate(subscription?.trial_ends_at)
  const subscriptionStart = toDate(subscription?.current_period_start) || toDate(subscription?.created_at)

  // Essai en cours (et pas de changement de formule depuis) : on compte sur la période d'essai.
  if (trialEnd && now < trialEnd && !(planStartedAt && planStartedAt > (subscriptionStart || 0))) {
    return { start: subscriptionStart || now, end: trialEnd, isTrial: true }
  }

  const anchor = planStartedAt || trialEnd || subscriptionStart
  if (!anchor) return null
  let start = anchor
  if (anchor <= now) {
    let years = now.getFullYear() - anchor.getFullYear()
    start = addYears(anchor, years)
    while (start > now) {
      years -= 1
      start = addYears(anchor, years)
    }
  }
  return { start, end: addYears(start, 1), isTrial: false }
}

/** 'unlimited' | 'ok' | 'warning' (≥ 40) | 'full' (limite atteinte). */
export function quotaLevel(used, max) {
  if (max === null || max === undefined) return 'unlimited'
  if (used >= max) return 'full'
  if (used >= Math.min(QUOTA_ALERT_THRESHOLD, max)) return 'warning'
  return 'ok'
}
