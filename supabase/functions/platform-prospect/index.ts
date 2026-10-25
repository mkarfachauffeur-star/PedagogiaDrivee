// PEDAGOGIA DRIVE — Super Admin : accepter un prospect (transaction + invitation Supabase)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type AdminClient = ReturnType<typeof createClient>

type AuthInviteResult = {
  userId: string
  created: boolean
  activateLink: string
  inviteType: 'invite' | 'recovery'
}

type PriorProfile = {
  id: string
  organization_id: string | null
  role: string
  full_name: string | null
  email: string | null
  is_active: boolean | null
}

type StepLog = {
  step: string
  status: 'ok' | 'error' | 'skip'
  message?: string
  detail?: Record<string, unknown>
}

class PipelineLog {
  steps: StepLog[] = []

  ok(step: string, message?: string, detail?: Record<string, unknown>) {
    this.steps.push({ step, status: 'ok', message, detail })
    console.log(`[platform-prospect][${step}] OK`, message ?? '', JSON.stringify(detail ?? {}))
  }

  skip(step: string, message?: string) {
    this.steps.push({ step, status: 'skip', message })
    console.log(`[platform-prospect][${step}] SKIP`, message ?? '')
  }

  error(step: string, message: string, detail?: Record<string, unknown>) {
    this.steps.push({ step, status: 'error', message, detail })
    console.error(`[platform-prospect][${step}] ERROR`, message, JSON.stringify(detail ?? {}))
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function errorResponse(
  log: PipelineLog,
  failedStep: string,
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  log.error(failedStep, message, extra)
  return json(
    {
      error: message,
      failed_step: failedStep,
      steps: log.steps,
      ...extra,
    },
    status,
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function appBaseUrl() {
  return (Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || 'https://www.pedagogia-drive.fr')
    .replace(/\/$/, '')
}

function inviteRedirectUrl() {
  return `${appBaseUrl()}/accept-invite`
}

function formatFrDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR')
  } catch {
    return iso
  }
}

const DEFAULT_EMAIL_FROM = 'Pedagogia Drive <noreply@pedagogia-drive.fr>'

function resolveEmailFrom(): string {
  return Deno.env.get('ACCESS_EMAIL_FROM') || DEFAULT_EMAIL_FROM
}

/** Strip whitespace, quotes and BOM often pasted with dashboard/CLI secrets. */
function normalizeResendApiKey(raw: string | undefined): string {
  if (!raw) return ''
  let key = raw.replace(/^\uFEFF/, '').trim()
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim()
  }
  return key
}

function readResendApiKey(): string {
  return normalizeResendApiKey(Deno.env.get('RESEND_API_KEY'))
}

function logEnvConfig(log: PipelineLog) {
  const resendKey = readResendApiKey()
  const resendConfigured = Boolean(resendKey)
  log.ok('config_check', 'Configuration edge function', {
    resend_configured: resendConfigured,
    resend_key_length: resendKey?.length ?? 0,
    resend_key_prefix: resendKey ? `${resendKey.slice(0, 6)}…` : null,
    resend_key_format_ok: resendKey ? resendKey.startsWith('re_') : false,
    site_url: appBaseUrl(),
    redirect_to: inviteRedirectUrl(),
    email_from: resolveEmailFrom(),
    supabase_invite_note:
      'generateLink ne déclenche pas d\'e-mail Supabase — l\'e-mail part uniquement via Resend.',
  })
  if (!resendConfigured) {
    log.error(
      'config_check',
      'RESEND_API_KEY absente des secrets Supabase — aucun e-mail ne peut être envoyé.',
    )
  }
}

type ResendSendResult = {
  emailId: string | null
  httpStatus: number
  resendResponse: Record<string, unknown>
  from: string
  to: string
  subject: string
}

async function callResendApi(
  log: PipelineLog,
  params: { from: string; to: string; subject: string; html: string },
): Promise<ResendSendResult> {
  const resendKey = readResendApiKey()
  if (!resendKey) {
    throw new Error(
      'RESEND_API_KEY absente — configurez-la dans Supabase → Edge Functions → Secrets puis redéployez platform-prospect.',
    )
  }
  if (!resendKey.startsWith('re_')) {
    throw new Error(
      'RESEND_API_KEY invalide — la clé Resend doit commencer par re_ (copiez-la depuis Resend → API Keys, sans guillemets).',
    )
  }

  const requestBody = {
    from: params.from,
    to: [params.to],
    subject: params.subject,
    html: params.html,
  }

  log.ok('resend_request', 'Requête POST https://api.resend.com/emails', {
    from: requestBody.from,
    to: requestBody.to,
    subject: requestBody.subject,
    html_length: params.html.length,
    api_key_present: true,
    api_key_prefix: `${resendKey.slice(0, 6)}…`,
  })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  const responseText = await res.text().catch(() => '')
  let responseJson: Record<string, unknown> = {}
  try {
    responseJson = responseText ? JSON.parse(responseText) : {}
  } catch {
    responseJson = { raw: responseText }
  }

  log.ok('resend_response', `Réponse Resend HTTP ${res.status}`, {
    http_status: res.status,
    http_ok: res.ok,
    from: params.from,
    to: params.to,
    subject: params.subject,
    body: responseJson,
  })

  if (res.status !== 200) {
    log.error('send_email', `Resend a refusé l'envoi (HTTP ${res.status})`, {
      http_status: res.status,
      from: params.from,
      to: params.to,
      subject: params.subject,
      resend_error: responseJson,
    })
    const reason =
      typeof responseJson.message === 'string'
        ? responseJson.message
        : JSON.stringify(responseJson)
    throw new Error(`Resend HTTP ${res.status} — ${reason}`)
  }

  log.ok('send_email', 'E-mail accepté par Resend (HTTP 200)', {
    http_status: 200,
    resend_id: responseJson.id ?? null,
    to: params.to,
    from: params.from,
    subject: params.subject,
  })

  return {
    emailId: typeof responseJson.id === 'string' ? responseJson.id : null,
    httpStatus: res.status,
    resendResponse: responseJson,
    from: params.from,
    to: params.to,
    subject: params.subject,
  }
}

async function assertSuperAdmin(admin: AdminClient, userId: string): Promise<boolean> {
  const { data: sa } = await admin
    .from('super_admins')
    .select('profile_id')
    .eq('profile_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (sa) return true

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return profile?.role === 'super_admin'
}

async function findUserByEmail(admin: AdminClient, email: string) {
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = (data.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if ((data.users || []).length < 200) return null
    page += 1
  }
}

async function sendWelcomeEmail(
  log: PipelineLog,
  payload: {
    to: string
    contactName: string
    schoolName: string
    email: string
    activateLink: string
    loginUrl: string
    trialStartedAt: string
    trialEndsAt: string
  },
): Promise<ResendSendResult> {
  const from = resolveEmailFrom()
  const subject = `[Pedagogia Drive] Bienvenue — activez votre compte gérant (${payload.schoolName})`

  log.ok('send_email_prepare', 'Préparation e-mail invitation gérant', {
    to: payload.to,
    from,
    subject,
    activate_link_host: (() => {
      try {
        return new URL(payload.activateLink).host
      } catch {
        return 'invalid-url'
      }
    })(),
  })

  const html = `
    <h2>Bienvenue sur Pedagogia Drive</h2>
    <p>Bonjour ${escapeHtml(payload.contactName)},</p>
    <p>Votre demande de démonstration pour <strong>${escapeHtml(payload.schoolName)}</strong> a été acceptée.</p>
    <p>Votre essai gratuit de 30 jours, avec toutes les fonctionnalités, est activé du <strong>${escapeHtml(formatFrDate(payload.trialStartedAt))}</strong> au <strong>${escapeHtml(formatFrDate(payload.trialEndsAt))}</strong>.</p>
    <p>Pour accéder à votre espace gérant, définissez votre mot de passe via le lien sécurisé ci-dessous :</p>
    <p><a href="${escapeHtml(payload.activateLink)}" style="display:inline-block;padding:12px 24px;background:#0891b2;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Définir mon mot de passe</a></p>
    <p style="font-size:13px;color:#64748b">Identifiant : ${escapeHtml(payload.email)}</p>
    <p style="font-size:13px;color:#64748b">Une fois votre mot de passe défini, connectez-vous sur <a href="${escapeHtml(payload.loginUrl)}">${escapeHtml(payload.loginUrl)}</a>.</p>
    <p>— L'équipe Pedagogia Drive</p>
  `

  return callResendApi(log, { from, to: payload.to, subject, html })
}

async function createManagerAuthInvite(
  log: PipelineLog,
  admin: AdminClient,
  params: { email: string; contactName: string },
): Promise<AuthInviteResult> {
  const { email, contactName } = params
  const redirectTo = inviteRedirectUrl()
  const metadata = {
    role: 'manager',
    full_name: contactName,
  }

  log.ok('auth_invite_prepare', 'Génération lien Supabase Auth', {
    email,
    redirect_to: redirectTo,
    method: 'auth.admin.generateLink (pas inviteUserByEmail — e-mail custom Resend)',
  })

  const existing = await findUserByEmail(admin, email)

  if (existing) {
    log.ok('auth_user_lookup', 'Compte Auth existant trouvé', {
      user_id: existing.id,
      email: existing.email,
      created_at: existing.created_at,
    })

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', existing.id)
      .maybeSingle()

    if (profile?.role === 'super_admin') {
      throw new Error('Cette adresse e-mail est réservée au Super Admin de la plateforme.')
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
    if (linkError) {
      log.error('auth_invite', linkError.message, { code: linkError.code, type: 'recovery' })
      throw linkError
    }

    const activateLink = linkData?.properties?.action_link
    if (!activateLink) throw new Error('Lien d\'activation introuvable (recovery).')

    log.ok('auth_invite', 'Lien recovery Supabase généré', {
      user_id: existing.id,
      invite_type: 'recovery',
      link_preview: `${activateLink.slice(0, 80)}…`,
    })

    return { userId: existing.id, created: false, activateLink, inviteType: 'recovery' }
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: metadata,
      redirectTo,
    },
  })
  if (linkError) {
    log.error('auth_invite', linkError.message, { code: linkError.code, type: 'invite' })
    throw linkError
  }

  const userId = linkData?.user?.id
  const activateLink = linkData?.properties?.action_link
  if (!userId || !activateLink) {
    throw new Error('Invitation gérant impossible (userId ou action_link Supabase manquant).')
  }

  log.ok('auth_user_create', 'Compte Auth créé via generateLink invite', {
    user_id: userId,
    email,
    invite_type: 'invite',
  })

  const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'manager' },
    user_metadata: metadata,
  })
  if (metaError) {
    log.error('auth_metadata', metaError.message, { user_id: userId })
    throw metaError
  }

  log.ok('auth_invite', 'Lien invite Supabase généré', {
    user_id: userId,
    invite_type: 'invite',
    link_preview: `${activateLink.slice(0, 80)}…`,
  })

  return { userId, created: true, activateLink, inviteType: 'invite' }
}

async function rollbackAuthUser(
  admin: AdminClient,
  log: PipelineLog,
  authResult: AuthInviteResult,
  priorProfile: PriorProfile | null,
) {
  if (authResult.created) {
    const { error } = await admin.auth.admin.deleteUser(authResult.userId)
    if (error) {
      log.error('rollback_auth', error.message, { user_id: authResult.userId })
    } else {
      log.ok('rollback_auth', 'Compte Auth supprimé (rollback)', { user_id: authResult.userId })
    }
    return
  }

  if (priorProfile) {
    await admin.from('profiles').upsert({
      id: priorProfile.id,
      organization_id: priorProfile.organization_id,
      role: priorProfile.role,
      full_name: priorProfile.full_name,
      email: priorProfile.email,
      is_active: priorProfile.is_active ?? true,
    })
    log.ok('rollback_auth', 'Profil précédent restauré', { user_id: priorProfile.id })
  }
}

async function rollbackAcceptance(
  admin: AdminClient,
  asCaller: AdminClient,
  log: PipelineLog,
  params: {
    prospectId: string
    orgId: string | null
    authResult: AuthInviteResult
    priorProfile: PriorProfile | null
  },
) {
  if (params.orgId) {
    const { error } = await asCaller.rpc('platform_rollback_demo_acceptance', {
      p_prospect_id: params.prospectId,
      p_org_id: params.orgId,
    })
    if (error) {
      log.error('rollback_org', error.message, { org_id: params.orgId })
    } else {
      log.ok('rollback_org', 'Organisation supprimée (rollback)', { org_id: params.orgId })
    }
  }

  await rollbackAuthUser(admin, log, params.authResult, params.priorProfile)
}

async function handleResendInvite(
  admin: AdminClient,
  log: PipelineLog,
  prospectId: string,
) {
  logEnvConfig(log)

  const { data: prospect, error: prospectError } = await admin
    .from('demo_requests')
    .select('*')
    .eq('id', prospectId)
    .single()

  if (prospectError || !prospect) {
    return errorResponse(log, 'load_prospect', 'Prospect introuvable.', 404)
  }

  if (!prospect.organization_id || !['Acceptée', 'Essai gratuit'].includes(prospect.status)) {
    return errorResponse(
      log,
      'load_prospect',
      'Seules les demandes déjà acceptées peuvent recevoir un renvoi d\'invitation.',
      400,
    )
  }

  log.ok('load_prospect', 'Prospect accepté chargé', {
    prospect_id: prospectId,
    email: prospect.email,
    organization_id: prospect.organization_id,
  })

  let authResult: AuthInviteResult
  try {
    authResult = await createManagerAuthInvite(log, admin, {
      email: prospect.email,
      contactName: prospect.contact_name || 'Gérant',
    })
  } catch (authErr) {
    return errorResponse(log, 'auth_invite', String(authErr?.message || authErr), 400)
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('trial_ends_at, current_period_start')
    .eq('organization_id', prospect.organization_id)
    .maybeSingle()

  let emailResult: ResendSendResult
  try {
    emailResult = await sendWelcomeEmail(log, {
      to: prospect.email,
      contactName: prospect.contact_name,
      schoolName: prospect.school_name,
      loginUrl: `${appBaseUrl()}/login`,
      email: prospect.email,
      activateLink: authResult.activateLink,
      trialStartedAt: sub?.current_period_start || new Date().toISOString(),
      trialEndsAt: sub?.trial_ends_at || new Date().toISOString(),
    })
  } catch (emailErr) {
    const resendStep = log.steps.find((s) => s.step === 'resend_response' || s.step === 'send_email')
    return errorResponse(log, 'send_email', String(emailErr?.message || emailErr), 502, {
      resend_http_status: resendStep?.detail?.http_status ?? null,
      resend_response: resendStep?.detail?.body ?? resendStep?.detail?.resend_error ?? null,
    })
  }

  await admin
    .from('demo_requests')
    .update({
      updated_at: new Date().toISOString(),
      internal_notes: prospect.internal_notes
        ? `${prospect.internal_notes}\n[${new Date().toISOString()}] Invitation renvoyée — Resend ${emailResult.emailId || 'ok'}`
        : `[${new Date().toISOString()}] Invitation renvoyée — Resend ${emailResult.emailId || 'ok'}`,
    })
    .eq('id', prospectId)

  return json({
    ok: true,
    action: 'resend_invite',
    email_sent: true,
    resend_id: emailResult.emailId,
    resend_http_status: emailResult.httpStatus,
    email_from: emailResult.from,
    email_to: emailResult.to,
    email_subject: emailResult.subject,
    steps: log.steps,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const log = new PipelineLog()

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await asCaller.auth.getUser()
    const caller = userData?.user
    if (!caller) return errorResponse(log, 'auth', 'Non authentifié', 401)

    const admin = createClient(url, serviceKey)
    if (!(await assertSuperAdmin(admin, caller.id))) {
      return errorResponse(log, 'auth', 'Accès réservé au Super Admin', 403)
    }

    log.ok('auth', 'Super Admin vérifié', { caller_id: caller.id, email: caller.email })

    const body = await req.json()
    const action = String(body.action || '').trim()

    if (action === 'resend_invite') {
      const prospectId = String(body.prospect_id || '').trim()
      if (!prospectId) return errorResponse(log, 'input', 'prospect_id requis', 400)
      return await handleResendInvite(admin, log, prospectId)
    }

    if (action === 'accept_prospect' || action === 'create_organization') {
      logEnvConfig(log)

      const prospectId = String(body.prospect_id || '').trim()
      if (!prospectId) return errorResponse(log, 'input', 'prospect_id requis', 400)

      const { data: prospect, error: prospectError } = await admin
        .from('demo_requests')
        .select('*')
        .eq('id', prospectId)
        .single()
      if (prospectError || !prospect) {
        return errorResponse(log, 'load_prospect', 'Prospect introuvable.', 404, {
          detail: prospectError?.message,
        })
      }
      if (prospect.organization_id) {
        return errorResponse(log, 'load_prospect', 'Une auto-école est déjà associée à ce prospect.', 400)
      }
      if (prospect.status === 'Refusée') {
        return errorResponse(log, 'load_prospect', 'Impossible d\'accepter une demande refusée.', 400)
      }
      if (prospect.status === 'Acceptée') {
        return errorResponse(log, 'load_prospect', 'Cette demande a déjà été acceptée.', 400)
      }

      log.ok('load_prospect', 'Prospect chargé', {
        prospect_id: prospectId,
        email: prospect.email,
        school_name: prospect.school_name,
      })

      let authResult: AuthInviteResult
      let priorProfile: PriorProfile | null = null

      try {
        const existing = await findUserByEmail(admin, prospect.email)
        if (existing) {
          const { data } = await admin
            .from('profiles')
            .select('id, organization_id, role, full_name, email, is_active')
            .eq('id', existing.id)
            .maybeSingle()
          priorProfile = data ?? null
        }

        authResult = await createManagerAuthInvite(log, admin, {
          email: prospect.email,
          contactName: prospect.contact_name,
        })
      } catch (authErr) {
        return errorResponse(
          log,
          'auth_invite',
          String(authErr?.message || authErr),
          400,
        )
      }

      const { data: acceptData, error: acceptError } = await asCaller.rpc('platform_accept_demo_request', {
        p_prospect_id: prospectId,
        p_manager_user_id: authResult.userId,
        p_manager_email: prospect.email,
        p_manager_name: prospect.contact_name,
      })

      if (acceptError || !acceptData) {
        await rollbackAuthUser(admin, log, authResult, priorProfile)
        return errorResponse(
          log,
          'create_organization',
          acceptError?.message || 'Création auto-école impossible.',
          400,
          { rpc_error: acceptError },
        )
      }

      const orgId = String(acceptData.organization_id || '')
      const trialStartedAt = String(acceptData.trial_started_at || '')
      const trialEndsAt = String(acceptData.trial_ends_at || '')

      log.ok('create_organization', 'Organisation créée', {
        organization_id: orgId,
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
      })
      log.ok('create_profile', 'Profil Manager + abonnement Starter créés via RPC', {
        manager_user_id: authResult.userId,
        manager_created: authResult.created,
      })

      const { error: metaError } = await admin.auth.admin.updateUserById(authResult.userId, {
        app_metadata: { role: 'manager' },
        user_metadata: {
          organization_id: orgId,
          role: 'manager',
          full_name: prospect.contact_name,
        },
      })
      if (metaError) {
        await rollbackAcceptance(admin, asCaller, log, {
          prospectId,
          orgId,
          authResult,
          priorProfile,
        })
        return errorResponse(log, 'auth_metadata', metaError.message, 400)
      }
      log.ok('auth_metadata', 'Métadonnées Auth gérant mises à jour', { user_id: authResult.userId })

      let emailResult
      try {
        emailResult = await sendWelcomeEmail(log, {
          to: prospect.email,
          contactName: prospect.contact_name,
          schoolName: prospect.school_name,
          loginUrl: `${appBaseUrl()}/login`,
          email: prospect.email,
          activateLink: authResult.activateLink,
          trialStartedAt,
          trialEndsAt,
        })
      } catch (emailErr) {
        await rollbackAcceptance(admin, asCaller, log, {
          prospectId,
          orgId,
          authResult,
          priorProfile,
        })
        const resendStep = log.steps.find((s) => s.step === 'resend_response' || s.step === 'send_email')
        return errorResponse(
          log,
          'send_email',
          String(emailErr?.message || emailErr),
          502,
          {
            resend_http_status: resendStep?.detail?.http_status ?? null,
            resend_response: resendStep?.detail?.body ?? resendStep?.detail?.resend_error ?? null,
          },
        )
      }

      return json({
        ok: true,
        organization_id: orgId,
        manager_user_id: authResult.userId,
        manager_created: authResult.created,
        invite_type: authResult.inviteType,
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
        status: 'Acceptée',
        email_sent: true,
        resend_id: emailResult.emailId,
        resend_http_status: emailResult.httpStatus,
        email_from: emailResult.from,
        email_to: emailResult.to,
        email_subject: emailResult.subject,
        redirect_to: inviteRedirectUrl(),
        steps: log.steps,
      })
    }

    if (action === 'send_email') {
      const to = String(body.to || '').trim()
      const subject = String(body.subject || '').trim()
      const html = String(body.html || body.message || '').trim()
      if (!to || !subject || !html) {
        return errorResponse(log, 'input', 'to, subject et message requis.', 400)
      }

      const result = await callResendApi(log, {
        from: resolveEmailFrom(),
        to,
        subject,
        html,
      })

      return json({
        ok: true,
        email_sent: true,
        resend_id: result.emailId,
        resend_http_status: result.httpStatus,
        steps: log.steps,
      })
    }

    return errorResponse(log, 'input', 'Action non supportée', 400)
  } catch (err) {
    return errorResponse(log, 'unexpected', String(err?.message || err), 500)
  }
})
