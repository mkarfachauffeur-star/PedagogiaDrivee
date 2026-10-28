import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Tâches du secrétariat (planning, inscriptions, paiements, simulateur, rendez-vous AAC).
 * Le secrétariat les fait toujours ; le gérant seulement si l'auto-école n'a aucun
 * compte secrétaire actif. Même règle côté Supabase : app.can_act_as_secretary().
 */
export function useSecretaryDuties() {
  const { role, organizationId, canWrite } = useAuth()
  const [state, setState] = useState({ key: '', hasSecretary: null })
  const key = role === 'manager' && organizationId ? organizationId : ''

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', key)
      .eq('role', 'secretary')
      .eq('is_active', true)
      .then(({ count, error }) => {
        // En cas d'erreur, on ne retire rien au gérant : Supabase reste juge en dernier ressort.
        if (!cancelled) setState({ key, hasSecretary: error ? false : (count || 0) > 0 })
      })
    return () => {
      cancelled = true
    }
  }, [key])

  if (role === 'secretary') {
    return { loading: false, actsAsSecretary: true, canDoSecretaryTasks: canWrite, managerCovers: false }
  }
  if (role !== 'manager') {
    return { loading: false, actsAsSecretary: false, canDoSecretaryTasks: false, managerCovers: false }
  }
  const loading = state.key !== key
  const actsAsSecretary = !loading && state.hasSecretary === false
  return {
    loading,
    actsAsSecretary,
    canDoSecretaryTasks: canWrite && actsAsSecretary,
    // Le gérant fait le secrétariat faute de secrétaire : on le lui signale.
    managerCovers: actsAsSecretary,
  }
}
