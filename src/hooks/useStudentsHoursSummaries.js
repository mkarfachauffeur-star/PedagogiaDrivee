import { useEffect, useState } from 'react'
import { getStudentHoursSummary } from '../services/initialAssessment'

const CONCURRENCY = 4

/**
 * Heures effectuées / préconisées de plusieurs élèves, chargées par petits lots
 * pour ne pas saturer Supabase. Renvoie un objet { [studentId]: résumé }.
 * Changer `refreshToken` recharge les chiffres (après l'enregistrement d'une leçon).
 */
export function useStudentsHoursSummaries(studentIds, refreshToken = 0) {
  const [summaries, setSummaries] = useState({})
  const key = studentIds.join(',')

  useEffect(() => {
    const ids = key ? key.split(',') : []
    if (!ids.length) return undefined
    let cancelled = false
    let cursor = 0

    async function worker() {
      while (!cancelled && cursor < ids.length) {
        const id = ids[cursor]
        cursor += 1
        const summary = await getStudentHoursSummary(id)
        if (!cancelled) setSummaries((current) => ({ ...current, [id]: summary }))
      }
    }

    for (let index = 0; index < Math.min(CONCURRENCY, ids.length); index += 1) void worker()
    return () => {
      cancelled = true
    }
  }, [key, refreshToken])

  return summaries
}
