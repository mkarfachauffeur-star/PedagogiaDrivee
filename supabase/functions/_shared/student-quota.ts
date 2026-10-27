// Quota d'élèves des formules limitées (Starter : 50 élèves), compté par année d'abonnement.
// Même règle que src/lib/studentQuota.js (côté application).
import { emailLog, escapeHtml, normalizeResendKey } from './email-utils.ts'
import { loginUrl } from './app-url.ts'
import { emailHighlight, emailParagraph, renderEmail } from './email-layout.ts'

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

type QuotaEmailInput = {
  orgName: string
  used: number
  max: number
  planName: string
  period: { start: Date; end: Date; isTrial: boolean }
  contact: string
}

/** Objet et contenu de l'e-mail d'alerte quota (40 élèves). */
export function buildQuotaAlertEmail({ orgName, used, max, planName, period, contact }: QuotaEmailInput) {
  const periodLabel = period.isTrial ? 'la période d’essai' : 'l’année d’abonnement'
  const after = period.isTrial ? 'jusqu’au début de votre abonnement' : 'jusqu’à la prochaine année d’abonnement'
  const remaining = Math.max(0, max - used)
  const subject = `${orgName} : ${used} élèves inscrits sur ${max}`
  const html = renderEmail({
    title: 'Votre limite d’élèves approche',
    preheader: `${used} élèves sur ${max} inclus dans votre formule ${planName}. Passez à Premium pour continuer sans interruption.`,
    bodyHtml: [
      emailParagraph('Bonjour,'),
      emailParagraph(
        `<strong>${escapeHtml(orgName)}</strong> a inscrit <strong>${used} élèves</strong> sur les ${max} inclus dans la formule ${escapeHtml(planName)}, pour ${periodLabel} du ${formatDate(period.start)} au ${formatDate(lastDay(period.end))}.`,
      ),
      emailHighlight(`${used} / ${max}`, `élèves inscrits · encore ${remaining} possible${remaining > 1 ? 's' : ''}`, '#B45309'),
      emailParagraph(
        `À ${max} élèves, l’inscription de nouveaux élèves sera suspendue ${after}.`,
      ),
      emailParagraph(
        `Pour continuer à inscrire des élèves sans interruption, passez à la formule <strong>Premium</strong> (élèves illimités) : il suffit de nous écrire à <a href="mailto:${contact}" style="color:#1769FF;">${contact}</a>, nous nous occupons du changement.`,
      ),
    ].join('\n'),
    cta: { label: 'Contacter Pedagogia Drive', url: `mailto:${contact}?subject=${encodeURIComponent(`Passage à Premium — ${orgName}`)}` },
    footerNote: `Vous recevez cet e-mail car ${escapeHtml(orgName)} utilise la formule ${escapeHtml(planName)}. <a href="${loginUrl()}" style="color:#5B6B80;">Accéder à votre espace</a>`,
  })
  return { subject, html }
}

/** Envoie un e-mail via Resend. */
export async function sendEmail(to: string[], subject: string, html: string, replyTo?: string) {
  const apiKey = normalizeResendKey(Deno.env.get('RESEND_API_KEY'))
  const from = Deno.env.get('RESEND_FROM') || 'Pedagogia Drive <noreply@pedagogia-drive.fr>'
  if (!apiKey) return { sent: false, reason: 'missing_resend_api_key' }
  if (!to.length) return { sent: false, reason: 'no_recipient' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  })
  if (!res.ok) return { sent: false, reason: await res.text() }
  return { sent: true, reason: null }
}

export function platformContactEmail() {
  return Deno.env.get('PLATFORM_CONTACT_EMAIL') || 'contact@pedagogia-drive.fr'
}

/** État du quota d'une auto-école sur sa période en cours. */
export async function quotaState(admin: Admin, orgId: string) {
  const sub = await loadSubscription(admin, orgId)
  const max = sub?.plan?.max_students
  const period = quotaPeriod(sub)
  const used = period ? await countStudentsInPeriod(admin, orgId, period.start) : 0
  return { sub, max: max ?? null, period, used }
}

/** Après une inscription : e-mail au gérant dès 40 élèves sur la période, une seule fois par période. */
export async function notifyQuotaThreshold(admin: Admin, orgId: string, orgName: string) {
  try {
    const { sub, max, period, used } = await quotaState(admin, orgId)
    if (!sub || max === null || !period) return
    const threshold = Math.min(QUOTA_ALERT_THRESHOLD, max)
    const periodKey = period.start.toISOString().slice(0, 10)
    if (used < threshold || sub.metadata?.quota_alert_sent_for === periodKey) return

    const { data: managers } = await admin
      .from('profiles')
      .select('email')
      .eq('organization_id', orgId)
      .eq('role', 'manager')
      .eq('is_active', true)
    const { data: org } = await admin.from('organizations').select('email').eq('id', orgId).maybeSingle()
    const recipients = [...new Set([...(managers || []).map((m: { email?: string }) => m.email), org?.email].filter(Boolean))] as string[]

    const contact = platformContactEmail()
    const { subject, html } = buildQuotaAlertEmail({ orgName, used, max, planName: sub.plan?.name || 'Starter', period, contact })
    const result = await sendEmail(recipients, subject, html, contact)
    if (!result.sent) {
      emailLog('student-quota', 'warn', 'Alerte quota non envoyée', { orgId, used, reason: result.reason })
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
