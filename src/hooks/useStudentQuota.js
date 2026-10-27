import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { quotaLevel, quotaPeriod } from '../lib/studentQuota'

/** Élèves inscrits sur l'année d'abonnement en cours de l'auto-école connectée. */
export function useStudentQuota(subscription, organizationId) {
  const [used, setUsed] = useState(null)
  const max = subscription?.plan?.max_students ?? null
  const period = quotaPeriod(subscription)
  const periodStart = period?.start?.toISOString() || null

  useEffect(() => {
    if (!organizationId || max === null) return undefined
    let active = true
    let query = supabase.from('students').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
    if (periodStart) query = query.gte('created_at', periodStart)
    query.then(({ count, error }) => {
      if (active && !error) setUsed(count || 0)
    })
    return () => {
      active = false
    }
  }, [organizationId, max, periodStart])

  if (max === null || used === null) return null
  return { used, max, period, level: quotaLevel(used, max) }
}
