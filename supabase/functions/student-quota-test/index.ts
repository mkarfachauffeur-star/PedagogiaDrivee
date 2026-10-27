// PEDAGOGIA DRIVE — Envoi d'un e-mail de test « alerte quota élèves » (Super Admin uniquement).
// L'e-mail est construit avec les vrais chiffres de l'auto-école, mais envoyé uniquement à l'adresse
// du Super Admin connecté. Aucune donnée n'est modifiée.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildQuotaAlertEmail, platformContactEmail, quotaState, sendEmail } from '../_shared/student-quota.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function isSuperAdmin(admin: ReturnType<typeof createClient>, userId: string) {
  const { data } = await admin.from('super_admins').select('profile_id').eq('profile_id', userId).eq('is_active', true).maybeSingle()
  return Boolean(data)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })
    const { data: userData } = await asCaller.auth.getUser()
    const caller = userData?.user
    if (!caller?.email) return json({ error: 'Non authentifié' }, 401)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    if (!(await isSuperAdmin(admin, caller.id))) return json({ error: 'Accès réservé au Super Admin' }, 403)

    const body = await req.json().catch(() => ({}))
    const orgId = String(body.organization_id || '').trim()
    if (!orgId) return json({ error: 'organization_id requis' }, 400)

    const { data: org } = await admin.from('organizations').select('name').eq('id', orgId).maybeSingle()
    if (!org) return json({ error: 'Auto-école introuvable' }, 404)

    const { sub, max, period, used } = await quotaState(admin, orgId)
    if (!period) return json({ error: 'Aucun abonnement pour cette auto-école' }, 400)

    const contact = platformContactEmail()
    const email = buildQuotaAlertEmail({
      orgName: org.name,
      used,
      max: max ?? 50,
      planName: sub?.plan?.name || 'Starter',
      period,
      contact,
    })
    const result = await sendEmail([caller.email], `[Test] ${email.subject}`, email.html, contact)
    if (!result.sent) return json({ error: `Envoi impossible : ${result.reason}` }, 502)

    return json({ ok: true, to: caller.email, used, max })
  } catch (error) {
    return json({ error: String((error as Error)?.message || error) }, 500)
  }
})
