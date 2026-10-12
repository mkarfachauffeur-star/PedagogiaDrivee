import { useEffect, useState } from 'react'

// Sans réseau, les écrans restent vides : on le dit clairement à l'utilisateur.
export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[400] bg-slate-900 px-4 pt-3 text-center text-sm font-semibold text-white pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      role="status"
    >
      Pas de connexion internet. Les données s’afficheront dès le retour du réseau.
    </div>
  )
}
