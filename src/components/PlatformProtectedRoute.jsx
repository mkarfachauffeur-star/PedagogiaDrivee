import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAssurance } from '../services/mfa'
import MfaChallenge from './platform/MfaChallenge'
import LoadingSpinner from './ui/LoadingSpinner'

export default function PlatformProtectedRoute({ children }) {
  const { isAuthenticated, isSuperAdmin, loading } = useAuth()
  const location = useLocation()
  // null : vérification en cours ; true : code de double authentification attendu.
  const [needsCode, setNeedsCode] = useState(null)

  useEffect(() => {
    if (loading || !isAuthenticated || !isSuperAdmin) return undefined
    let active = true
    getAssurance().then(({ needsCode: required }) => {
      if (active) setNeedsCode(required)
    })
    return () => {
      active = false
    }
  }, [loading, isAuthenticated, isSuperAdmin])

  if (loading) return <LoadingSpinner label="Vérification accès plateforme…" />
  if (!isAuthenticated || !isSuperAdmin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (needsCode === null) return <LoadingSpinner label="Vérification accès plateforme…" />
  if (needsCode) return <MfaChallenge onVerified={() => setNeedsCode(false)} />
  return children
}
