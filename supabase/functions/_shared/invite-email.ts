// Invitation d'un membre de l'auto-école (gérant, secrétariat, enseignant) avec un e-mail
// Pedagogia Drive en français, envoyé par Resend, au lieu du modèle anglais de Supabase.
// Sans clé Resend, on revient à l'invitation Supabase pour ne jamais bloquer la création du compte.
import { emailLog, escapeHtml, normalizeResendKey } from './email-utils.ts'
import { acceptInviteUrl } from './app-url.ts'
import { emailParagraph, renderEmail } from './email-layout.ts'

// deno-lint-ignore no-explicit-any
type Admin = any

const ROLE_LABELS: Record<string, string> = {
  manager: 'gérant',
  secretary: 'secrétariat',
  teacher: 'enseignant',
  student: 'élève',
}

type InviteOptions = {
  email: string
  fullName: string
  role: string
  organizationName: string
  /** Métadonnées du compte (organization_id, role, full_name, gender…). */
  data: Record<string, unknown>
}

export async function inviteMember(admin: Admin, { email, fullName, role, organizationName, data }: InviteOptions) {
  const redirectTo = acceptInviteUrl()
  const apiKey = normalizeResendKey(Deno.env.get('RESEND_API_KEY'))

  if (!apiKey) {
    emailLog('invite-email', 'warn', 'resend_key_missing_fallback_supabase', { email, role })
    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, { data, redirectTo })
    return { userId: invited?.user?.id as string | undefined, error }
  }

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data, redirectTo },
  })
  if (error) return { userId: undefined, error }

  const actionLink = link?.properties?.action_link as string | undefined
  const userId = link?.user?.id as string | undefined
  if (!actionLink) return { userId, error: new Error('Lien d’invitation introuvable.') }

  const roleLabel = ROLE_LABELS[role] || 'membre'
  const firstName = fullName.split(' ')[0] || fullName
  const html = renderEmail({
    title: `Bienvenue chez ${organizationName}`,
    preheader: `Créez votre mot de passe pour accéder à votre espace ${roleLabel}.`,
    bodyHtml: [
      emailParagraph(`Bonjour ${escapeHtml(firstName)},`),
      emailParagraph(
        `Un compte <strong>${escapeHtml(roleLabel)}</strong> vient d’être créé pour vous chez <strong>${escapeHtml(
          organizationName,
        )}</strong> sur Pedagogia Drive, le livret d’apprentissage numérique de l’auto-école.`,
      ),
      emailParagraph('Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et ouvrir votre espace.'),
    ].join(''),
    cta: { label: 'Créer mon mot de passe', url: actionLink },
    footerNote: 'Ce lien est personnel et valable pour une durée limitée. Si vous n’attendiez pas cette invitation, ignorez cet e-mail.',
  })

  const sent = await sendBrandedEmail(apiKey, email, `Votre accès Pedagogia Drive — ${organizationName}`, html)
  return { userId, error: sent.error }
}

/** Lien de réinitialisation du mot de passe, en français, envoyé par Resend. */
export async function sendPasswordReset(admin: Admin, { email, fullName }: { email: string; fullName: string }) {
  const redirectTo = acceptInviteUrl()
  const apiKey = normalizeResendKey(Deno.env.get('RESEND_API_KEY'))
  if (!apiKey) {
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo })
    return { error }
  }
  const { data: link, error } = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })
  if (error) return { error }
  const actionLink = link?.properties?.action_link as string | undefined
  if (!actionLink) return { error: new Error('Lien de réinitialisation introuvable.') }

  const firstName = (fullName || '').split(' ')[0]
  const html = renderEmail({
    title: 'Choisissez un nouveau mot de passe',
    preheader: 'Votre auto-école vous envoie un lien pour réinitialiser votre mot de passe.',
    bodyHtml: [
      emailParagraph(firstName ? `Bonjour ${escapeHtml(firstName)},` : 'Bonjour,'),
      emailParagraph('Votre auto-école vous envoie un lien pour choisir un nouveau mot de passe Pedagogia Drive.'),
    ].join(''),
    cta: { label: 'Choisir mon mot de passe', url: actionLink },
    footerNote: 'Ce lien est personnel et valable pour une durée limitée. Si vous n’avez rien demandé, ignorez cet e-mail.',
  })
  return sendBrandedEmail(apiKey, email, 'Réinitialisation de votre mot de passe Pedagogia Drive', html)
}

async function sendBrandedEmail(apiKey: string, email: string, subject: string, html: string) {
  const from = Deno.env.get('ACCESS_EMAIL_FROM') || Deno.env.get('RESEND_FROM') || 'Pedagogia Drive <noreply@pedagogia-drive.fr>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject, html }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    emailLog('invite-email', 'error', 'resend_failed', { email, status: res.status, body })
    return { error: new Error('Le compte est à jour, mais l’e-mail n’a pas pu être envoyé.') }
  }
  emailLog('invite-email', 'ok', 'email_sent', { email, subject })
  return { error: null }
}
