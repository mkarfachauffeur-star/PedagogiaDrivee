import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { computeCanWrite } from '../lib/orgAccess'
import { supabase } from '../lib/supabase'
import { consumeEphemeralSessionFlag } from '../utils/rememberSession'
import { fetchOrganization, fetchStudentCount, fetchSubscription, logLoginAudit } from '../services/organization'
import { checkIsSuperAdmin } from '../services/platform'
import { getUserFacingError } from '../lib/userFacingError'
import { validatePassword } from '../lib/passwordPolicy'

export const VALID_ROLES = ['student', 'teacher', 'secretary', 'manager', 'super_admin']

const AuthContext = createContext(null)

function resolveRoleFromUser(user) {
  if (!user) return null
  const candidate = user.app_metadata?.role || user.user_metadata?.role || null
  return VALID_ROLES.includes(candidate) ? candidate : null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [organization, setOrganization] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [studentCount, setStudentCount] = useState(0)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [supabaseRole, setSupabaseRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setOrganization(null)
      setSubscription(null)
      setStudentCount(0)
      setIsSuperAdmin(false)
      return
    }
    try {
      const superAdmin = await checkIsSuperAdmin(userId)
      setIsSuperAdmin(superAdmin)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, organization_id, role, full_name, avatar_emoji, email, is_active, gender')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      setProfile(data ?? null)

      if (superAdmin) {
        setOrganization(null)
        setSubscription(null)
        setStudentCount(0)
        return
      }

      if (data?.organization_id) {
        const [orgRes, subRes, countRes] = await Promise.all([
          fetchOrganization(),
          fetchSubscription(),
          fetchStudentCount(),
        ])
        setOrganization(orgRes.organization)
        setSubscription(subRes.subscription)
        setStudentCount(countRes.count)
      }
    } catch (err) {
      console.error('[AuthContext] loadProfile failed', {
        userId,
        message: err?.message,
        code: err?.code,
      })
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      // Connexion précédente sans « Se souvenir de moi » : révoquer la session
      // persistée avant toute restauration.
      if (consumeEphemeralSessionFlag()) {
        try {
          await supabase.auth.signOut()
        } catch {
          // La session locale sera de toute façon absente ou ignorée ci-dessous.
        }
      }
      try {
        const { data } = await supabase.auth.getSession()
        if (!active) return
        const nextSession = data.session ?? null
        setSession(nextSession)
        setSupabaseRole(resolveRoleFromUser(nextSession?.user))
        await loadProfile(nextSession?.user?.id)
      } finally {
        if (active) setLoading(false)
      }
    })()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession ?? null)
      setSupabaseRole(resolveRoleFromUser(nextSession?.user))
      loadProfile(nextSession?.user?.id)
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [loadProfile])

  useEffect(() => {
    const orgId = profile?.organization_id
    if (!orgId || isSuperAdmin) return undefined

    const refreshOrgState = async () => {
      const [orgRes, subRes, countRes] = await Promise.all([
        fetchOrganization(),
        fetchSubscription(),
        fetchStudentCount(),
      ])
      setOrganization(orgRes.organization)
      setSubscription(subRes.subscription)
      setStudentCount(countRes.count)
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshOrgState()
    }
    document.addEventListener('visibilitychange', onVisible)

    const channel = supabase
      .channel(`org-access-${orgId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'organizations', filter: `id=eq.${orgId}` },
        () => { void refreshOrgState() },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'subscriptions', filter: `organization_id=eq.${orgId}` },
        () => { void refreshOrgState() },
      )
      .subscribe()

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, isSuperAdmin])

  const signInWithPassword = useCallback(async (email, password) => {
    // Le clavier iPhone ajoute une espace après une adresse suggérée.
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
    if (error) return { error: new Error(getUserFacingError(error, 'login')), role: null, mustChangePassword: false }
    const mustChangePassword = Boolean(data.user?.user_metadata?.must_change_password)
    let nextRole = null
    try {
      const superAdmin = await checkIsSuperAdmin(data.user?.id)
      if (superAdmin) nextRole = 'super_admin'
      else {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role, is_active, access_expires_at')
          .eq('id', data.user?.id)
          .maybeSingle()
        if (prof && prof.is_active === false) {
          await supabase.auth.signOut()
          return { error: new Error('Compte désactivé.'), role: null, mustChangePassword: false }
        }
        if (
          prof?.role === 'student'
          && prof.access_expires_at
          && new Date(prof.access_expires_at) <= new Date()
        ) {
          await supabase.auth.signOut()
          return {
            error: new Error('Votre accès Pedagogia Drive a expiré. Contactez votre auto-école pour le réactiver.'),
            role: null,
            mustChangePassword: false,
          }
        }
        nextRole = prof?.role ?? resolveRoleFromUser(data.user) ?? null
      }
    } catch {
      // ignore
    }
    await loadProfile(data.user?.id)
    if (nextRole !== 'super_admin') await logLoginAudit()
    return { error: null, role: nextRole, mustChangePassword }
  }, [loadProfile])

  const completePasswordChange = useCallback(async (newPassword) => {
    const policy = validatePassword(newPassword)
    if (!policy.ok) return { error: new Error(policy.error) }
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    })
    if (error) return { error: new Error(getUserFacingError(error, 'save')) }
    await loadProfile(data.user?.id)
    return { error: null }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    setSession(null)
    setSupabaseRole(null)
    setProfile(null)
    setOrganization(null)
    setSubscription(null)
    setIsSuperAdmin(false)
  }, [])

  const role = isSuperAdmin ? 'super_admin' : (session ? (profile?.role || supabaseRole) : null)
  const mustChangePassword = Boolean(session?.user?.user_metadata?.must_change_password)
  const isTrial = organization?.status === 'trial'
  const canWrite = useMemo(
    () => computeCanWrite(organization, subscription),
    [organization, subscription],
  )
  const isReadOnly = Boolean(organization) && !canWrite

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      profileId: profile?.id ?? session?.user?.id ?? null,
      organizationId: isSuperAdmin ? null : (profile?.organization_id ?? null),
      organization,
      subscription,
      studentCount,
      isSuperAdmin,
      canWrite,
      isReadOnly,
      isTrial,
      role,
      mustChangePassword,
      isAuthenticated: Boolean(session),
      loading,
      signInWithPassword,
      completePasswordChange,
      signOut,
      refreshOrg: loadProfile,
    }),
    [session, profile, organization, subscription, studentCount, isSuperAdmin, canWrite, isReadOnly, isTrial, role, mustChangePassword, loading, signInWithPassword, completePasswordChange, signOut, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>.')
  }
  return context
}
