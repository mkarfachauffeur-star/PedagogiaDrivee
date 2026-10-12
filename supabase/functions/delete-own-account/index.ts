import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Suppression par l'utilisateur de son propre compte (exigence App Store 5.1.1).
// Le compte de connexion et le profil sont supprimés. Les dossiers tenus par l'auto-école
// (fiche élève, leçons, paiements) restent dans l'organisation, sans lien vers le compte.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405)

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

    const body = await req.json().catch(() => ({}))
    if (body?.confirm !== 'SUPPRIMER') {
      return json({ error: 'Confirmation manquante.' }, 400)
    }

    const admin = createClient(url, serviceKey)
    const userId = caller.id

    // Comptes encore responsables d'éléments obligatoires : le gérant doit d'abord les réattribuer.
    const [{ count: preRegistrations }, { count: supervisedSessions }] = await Promise.all([
      admin.from('pre_registrations').select('id', { count: 'exact', head: true }).eq('teacher_id', userId),
      admin.from('simulator_sessions').select('id', { count: 'exact', head: true }).eq('supervisor_id', userId),
    ])
    if ((preRegistrations ?? 0) > 0 || (supervisedSessions ?? 0) > 0) {
      return json({
        error: 'Des pré-inscriptions ou des séances simulateur sont encore à votre nom. Demandez au gérant de les réattribuer, puis recommencez.',
      }, 409)
    }

    // Références sans suppression en cascade : on retire le lien vers le compte.
    for (const table of ['documents', 'payments', 'expenses']) {
      const { error } = await admin.from(table).update({ created_by: null }).eq('created_by', userId)
      if (error) return json({ error: `Préparation impossible (${table}).` }, 500)
    }
    const { error: reviewsError } = await admin.from('reviews').delete().eq('profile_id', userId)
    if (reviewsError) return json({ error: 'Préparation impossible (avis).' }, 500)

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[delete-own-account]', deleteError.message)
      return json({ error: 'La suppression a échoué. Réessayez plus tard.' }, 500)
    }

    return json({ ok: true, message: 'Votre compte a été supprimé.' })
  } catch (err) {
    console.error('[delete-own-account]', err)
    return json({ error: 'La suppression a échoué. Réessayez plus tard.' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
