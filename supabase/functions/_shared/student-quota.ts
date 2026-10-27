// Quota d'élèves des formules limitées (Starter : 50 élèves), compté par année d'abonnement.
// Même règle que src/lib/studentQuota.js (côté application).
import { emailLog, escapeHtml, normalizeResendKey } from './email-utils.ts'
import { loginUrl } from './app-url.ts'

// deno-lint-ignore no-explicit-any
type Admin = any

export const QUOTA_ALERT_THRESHOLD = 40

type Subscription = {
  id: string
  status?: string | null
  trial_ends_at?: string | null
  current_period_start?: string | null
  created_at?: string | null
  metadata?: Record<string, unknown> | null
  plan?: { max_students?: number | null; code?: string | null; name?: string | null } | null
}

function addYears(date: Date, years: number) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

function toDate(value: unknown) {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Période de comptage : la période d'essai tant qu'elle dure, puis l'année d'abonnement qui
 * commence à la fin de l'essai (ou au dernier changement de formule) et se renouvelle chaque année.
 */
export function quotaPeriod(sub: Subscription | null, now = new Date()) {
  const planStartedAt = toDate(sub?.metadata?.plan_started_at)
  const trialEnd = toDate(sub?.trial_ends_at)
  const subscriptionStart = toDate(sub?.current_period_start) || toDate(sub?.created_at)

  if (trialEnd && now < trialEnd && !(planStartedAt && subscriptionStart && planStartedAt > subscriptionStart)) {
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

export async function loadSubscription(admin: Admin, orgId: string): Promise<Subscription | null> {
  const { data } = await admin
    .from('subscriptions')
    .select('id, status, trial_ends_at, current_period_start, created_at, metadata, plan:plan_id(max_students, code, name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function countStudentsInPeriod(admin: Admin, orgId: string, start: Date) {
  const { count } = await admin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('created_at', start.toISOString())
  return count || 0
}

/** Dernier jour inclus de l'année d'abonnement (la veille de la date anniversaire). */
function lastDay(end: Date) {
  return new Date(end.getTime() - 86400000)
}

function formatDate(date: Date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
}

/** Refuse une nouvelle inscription quand la limite de la formule est atteinte sur l'année d'abonnement. */
export async function checkStudentQuota(admin: Admin, orgId: string, sub: Subscription | null) {
  const max = sub?.plan?.max_students
  if (max === null || max === undefined) return { ok: true as const }
  const period = quotaPeriod(sub)
  if (!period) return { ok: true as const }
  const used = await countStudentsInPeriod(admin, orgId, period.start)
  if (used >= max) {
    return {
      ok: false as const,
      reason:
        `Limite de ${max} élèves atteinte pour ${period.isTrial ? 'la période d\'essai' : 'l\'année d\'abonnement en cours'} (du ${formatDate(period.start)} au ${formatDate(lastDay(period.end))}). `
        + 'Contactez Pedagogia Drive pour passer à une formule supérieure.',
    }
  }
  return { ok: true as const }
}

/** Après une inscription : e-mail au gérant dès 40 élèves sur l'année d'abonnement, une seule fois par année. */
export async function notifyQuotaThreshold(admin: Admin, orgId: string, orgName: string) {
  try {
    const sub = await loadSubscription(admin, orgId)
    const max = sub?.plan?.max_students
    if (!sub || max === null || max === undefined) return
    const period = quotaPeriod(sub)
    if (!period) return
    const threshold = Math.min(QUOTA_ALERT_THRESHOLD, max)
    const used = await countStudentsInPeriod(admin, orgId, period.start)
    const periodKey = period.start.toISOString().slice(0, 10)
    if (used < threshold || sub.metadata?.quota_alert_sent_for === periodKey) return

    const { data: managers } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('organization_id', orgId)
      .eq('role', 'manager')
      .eq('is_active', true)
    const { data: org } = await admin.from('organizations').select('email').eq('id', orgId).maybeSingle()
    const recipients = [...new Set([...(managers || []).map((m: { email?: string }) => m.email), org?.email].filter(Boolean))]

    const apiKey = normalizeResendKey(Deno.env.get('RESEND_API_KEY'))
    const from = Deno.env.get('RESEND_FROM') || 'Pedagogia Drive <noreply@pedagogia-drive.fr>'
    const contact = Deno.env.get('PLATFORM_CONTACT_EMAIL') || 'contact@pedagogia-drive.fr'
    if (!apiKey || recipients.length === 0) {
      emailLog('student-quota', 'warn', 'Alerte quota non envoyée', { orgId, used, recipients: recipients.length })
      return
    }

    const planName = escapeHtml(sub.plan?.name || 'Starter')
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: recipients,
        reply_to: contact,
        subject: `Pedagogia Drive : ${used} élèves inscrits sur ${max} cette année`,
        html: `<p>Bonjour,</p>
<p>${escapeHtml(orgName)} compte <strong>${used} élèves inscrits sur ${max}</strong> inclus dans la formule ${planName}, pour ${period.isTrial ? 'la période d\'essai' : 'l\'année d\'abonnement'} du ${formatDate(period.start)} au ${formatDate(lastDay(period.end))}.</p>
<p>Une fois la limite de ${max} élèves atteinte, il ne sera plus possible d'inscrire de nouvel élève ${period.isTrial ? 'avant le début de votre abonnement' : 'avant la prochaine année d\'abonnement'}.</p>
<p>Pour continuer à inscrire des élèves sans interruption, contactez-nous à <a href="mailto:${contact}">${contact}</a> afin de passer à la formule Premium (élèves illimités).</p>
<p><a href="${loginUrl()}">Accéder à Pedagogia Drive</a></p>
<p>L'équipe Pedagogia Drive</p>`,
      }),
    })
    if (!res.ok) {
      emailLog('student-quota', 'error', 'Resend a refusé l’alerte quota', { status: res.status, body: await res.text() })
      return
    }

    await admin
      .from('subscriptions')
      .update({ metadata: { ...(sub.metadata || {}), quota_alert_sent_for: periodKey } })
      .eq('id', sub.id)
    emailLog('student-quota', 'ok', 'Alerte quota envoyée', { orgId, used, max })
  } catch (error) {
    emailLog('student-quota', 'error', 'Alerte quota en échec', { orgId, error: String(error) })
  }
}
