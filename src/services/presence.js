import { supabase } from '../lib/supabase'

/**
 * Présence en direct : chaque compte d'auto-école connecté met à jour sa ligne de
 * `platform_presence` toutes les minutes (fonction `touch_presence`). Seul le Super Admin
 * peut lire cette table ; il reçoit les changements en temps réel.
 * Un compte est « connecté » tant que sa dernière mise à jour date de moins de 2 min 30.
 */
const HEARTBEAT_MS = 60_000
const ONLINE_WINDOW_MS = 150_000

/** Retire le compte de la liste des connectés (à appeler avant la déconnexion). */
export function leavePresence() {
  return supabase.rpc('leave_presence').then(() => {}, () => {})
}

/**
 * Signale le compte connecté tant que la page est ouverte. Retourne la fonction d'arrêt.
 * Changer de page ne retire pas le compte : seuls la fermeture de l'onglet ou la déconnexion le font.
 */
export function announcePresence({ profileId, role }) {
  if (!profileId || !role || role === 'super_admin') return () => {}

  const touch = () => {
    if (document.visibilityState === 'visible') supabase.rpc('touch_presence').then(() => {}, () => {})
  }
  touch()
  const timer = window.setInterval(touch, HEARTBEAT_MS)
  document.addEventListener('visibilitychange', touch)
  window.addEventListener('pagehide', leavePresence)

  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', touch)
    window.removeEventListener('pagehide', leavePresence)
  }
}

function toEntries(rows) {
  const threshold = Date.now() - ONLINE_WINDOW_MS
  return (rows || [])
    .filter((row) => new Date(row.last_seen_at).getTime() >= threshold)
    .map((row) => ({
      profileId: row.profile_id,
      role: row.role,
      organizationId: row.organization_id,
      onlineAt: row.online_since,
    }))
}

/** Écoute la liste des comptes connectés (Super Admin). Retourne la fonction d'arrêt. */
export function watchPresence(listener) {
  let rows = []
  let stopped = false

  const publish = () => {
    if (!stopped) listener(toEntries(rows))
  }

  const load = async () => {
    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()
    const { data, error } = await supabase
      .from('platform_presence')
      .select('profile_id, organization_id, role, online_since, last_seen_at')
      .gte('last_seen_at', since)
    rows = error ? [] : data || []
    publish()
  }

  const channel = supabase
    .channel('platform-presence-watch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_presence' }, (payload) => {
      if (payload.eventType === 'DELETE') {
        rows = rows.filter((row) => row.profile_id !== payload.old?.profile_id)
      } else if (payload.new?.profile_id) {
        rows = [...rows.filter((row) => row.profile_id !== payload.new.profile_id), payload.new]
      }
      publish()
    })
    .subscribe()

  load()
  // Fait disparaître les comptes partis sans prévenir (onglet fermé, réseau coupé).
  const timer = window.setInterval(load, 30_000)

  return () => {
    stopped = true
    window.clearInterval(timer)
    supabase.removeChannel(channel)
  }
}
