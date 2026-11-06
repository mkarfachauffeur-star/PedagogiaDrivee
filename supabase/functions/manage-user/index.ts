import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { acceptInviteUrl } from '../_shared/app-url.ts'
import { emailLog } from '../_shared/email-utils.ts'
import { inviteMember, sendPasswordReset } from '../_shared/invite-email.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ACTIONS = ['reset_password', 'resend_invite', 'disable', 'enable', 'delete', 'change_email'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await asCaller.auth.getUser()
    const caller = userData?.user
    if (!caller) return json({ error: 'Non authentifié' }, 401)

    const admin = createClient(url, serviceKey)

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', caller.id)
      .maybeSingle()

    if (!callerProfile || callerProfile.role !== 'manager') {
      return json({ error: 'Action réservée au gérant' }, 403)
    }

    const body = await req.json()
    const action = String(body.action || '')
    const userId = String(body.user_id || '')

    if (!ACTIONS.includes(action as typeof ACTIONS[number])) {
      return json({ error: 'Action invalide' }, 400)
    }
    if (!userId) return json({ error: 'Utilisateur requis' }, 400)
    if (userId === caller.id && action === 'delete') {
      return json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, 400)
    }
    if (userId === caller.id && action === 'disable') {
      return json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' }, 400)
    }

    const { data: targetProfile } = await admin
      .from('profiles')
      .select('id, email, full_name, role, organization_id, is_active')
      .eq('id', userId)
      .maybeSingle()

    if (!targetProfile || targetProfile.organization_id !== callerProfile.organization_id) {
      return json({ error: 'Utilisateur introuvable' }, 404)
    }
    if (!['manager', 'teacher', 'secretary'].includes(targetProfile.role)) {
      return json({ error: 'Ce compte ne peut pas être géré ici' }, 400)
    }

    const redirectTo = acceptInviteUrl()

    if (action === 'disable') {
      await admin.from('profiles').update({ is_active: false }).eq('id', userId)
      return json({ ok: true, message: 'Compte désactivé.' })
    }

    if (action === 'enable') {
      const updates: Record<string, unknown> = { is_active: true }
      if (targetProfile.role === 'student') {
        updates.access_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        updates.access_expiry_warned_at = null
      }
      await admin.from('profiles').update(updates).eq('id', userId)
      return json({
        ok: true,
        message: targetProfile.role === 'student'
          ? 'Compte élève réactivé pour 365 jours.'
          : 'Compte réactivé.',
      })
    }

    if (action === 'delete') {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, message: 'Compte supprimé.' })
    }

    if (action === 'change_email') {
      const newEmail = String(body.new_email || '').trim().toLowerCase()
      if (!newEmail || !newEmail.includes('@')) {
        return json({ error: 'Nouvel e-mail invalide.' }, 400)
      }
      if (newEmail === targetProfile.email?.toLowerCase()) {
        return json({ error: 'Le nouvel e-mail est identique à l\'actuel.' }, 400)
      }

      const { error: authError } = await admin.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true,
      })
      if (authError) return json({ error: authError.message }, 400)

      await admin.from('profiles').update({ email: newEmail }).eq('id', userId)
      return json({ ok: true, message: 'E-mail mis à jour.' })
    }

    const email = targetProfile.email
    if (!email) return json({ error: 'E-mail introuvable pour cet utilisateur' }, 400)

    if (action === 'reset_password') {
      emailLog('manage-user', 'info', 'reset_password', { email, redirectTo })
      const { error } = await sendPasswordReset(admin, { email, fullName: targetProfile.full_name || '' })
      if (error) {
        emailLog('manage-user', 'error', 'reset_password_failed', { email, error: error.message })
        return json({ error: error.message }, 400)
      }
      emailLog('manage-user', 'ok', 'reset_password_sent', { email })
      return json({ ok: true, message: 'E-mail de réinitialisation envoyé.' })
    }

    if (action === 'resend_invite') {
      const { data: authUser } = await admin.auth.admin.getUserById(userId)
      const meta = authUser.user?.user_metadata || {}
      const confirmed = Boolean(authUser.user?.email_confirmed_at || authUser.user?.confirmed_at)

      emailLog('manage-user', 'info', 'resend_invite', { email, redirectTo, confirmed })

      if (confirmed) {
        const { error: sendError } = await sendPasswordReset(admin, { email, fullName: targetProfile.full_name || '' })
        if (sendError) {
          emailLog('manage-user', 'error', 'recovery_email_failed', { email, error: sendError.message })
          return json({ error: sendError.message }, 400)
        }
        return json({ ok: true, message: 'Lien de réinitialisation renvoyé.' })
      }

      const { data: org } = await admin
        .from('organizations')
        .select('name')
        .eq('id', targetProfile.organization_id)
        .maybeSingle()
      const { error } = await inviteMember(admin, {
        email,
        fullName: meta.full_name || targetProfile.full_name || '',
        role: targetProfile.role,
        organizationName: org?.name || 'votre auto-école',
        data: {
          organization_id: targetProfile.organization_id,
          role: targetProfile.role,
          full_name: meta.full_name || '',
          ...(meta.gender ? { gender: meta.gender } : {}),
        },
      })
      if (error) {
        emailLog('manage-user', 'error', 'invite_failed', { email, error: error.message })
        return json({ error: error.message }, 400)
      }
      emailLog('manage-user', 'ok', 'invite_sent', { email })
      return json({ ok: true, message: 'Invitation renvoyée.' })
    }

    return json({ error: 'Action non prise en charge' }, 400)
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
