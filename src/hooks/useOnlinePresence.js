import { useEffect, useMemo, useState } from 'react'
import { watchPresence } from '../services/presence'

/** Comptes connectés en ce moment, et regroupement par auto-école. */
export function useOnlinePresence() {
  const [online, setOnline] = useState([])

  useEffect(() => watchPresence(setOnline), [])

  const byOrganization = useMemo(() => {
    const map = new Map()
    online.forEach((entry) => {
      if (!entry.organizationId) return
      const list = map.get(entry.organizationId) || []
      list.push(entry)
      map.set(entry.organizationId, list)
    })
    return map
  }, [online])

  return { online, byOrganization }
}
