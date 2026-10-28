import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function formatSupabaseError(error) {
  if (!error) return null
  return {
    message: error.message || String(error),
    code: error.code || null,
    details: error.details || null,
    hint: error.hint || null,
  }
}

/**
 * Charge et diagnostique le compte élève (Auth + profiles + students).
 */
export function useStudentAccount() {
  const { user, profile, profileId, loading: authLoading, session } = useAuth()
  const [student, setStudent] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [studentError, setStudentError] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const userId = user?.id || profileId

    if (!userId || (!session && !profileId)) {
      setStudent(null)
      setProfileError(null)
      setStudentError(null)
      setLoading(false)
      return
    }

    setLoading(true)

    let nextProfileError = null

    if (!profile) {
      const { error } = await supabase
        .from('profiles')
        .select('id, organization_id, role, full_name, email, is_active, access_expires_at')
        .eq('id', userId)
        .maybeSingle()
      nextProfileError = formatSupabaseError(error)
    }

    const { data: studentData, error: studentQueryError } = await supabase
      .from('students')
      .select('id, license_category, package_name, formation_type, first_name, last_name, email, file_number, status')
      .eq('profile_id', userId)
      .maybeSingle()

    const nextStudentError = formatSupabaseError(studentQueryError)
    const fetchedStudent = studentData ?? null

    setProfileError(nextProfileError)
    setStudentError(nextStudentError)
    setStudent(fetchedStudent)
    setLoading(false)
  }, [user, profile, profileId, session])

  useEffect(() => {
    if (authLoading) return
    refresh()
  }, [authLoading, refresh])

  const issue = (() => {
    if (authLoading || loading) return null
    if (!session && !profileId) return { code: 'no_session', message: 'Aucune session active.' }
    if (profileError) {
      return {
        code: 'profile_query_failed',
        message: 'Impossible de charger votre profil.',
        detail: profileError,
      }
    }
    if (!profile && session) {
      return {
        code: 'missing_profile',
        message: 'Votre compte existe dans l\'authentification, mais aucune ligne n\'a été trouvée dans la table profiles.',
        detail: 'Le secrétariat ou le gérant doit finaliser la création de votre dossier, ou contacter le support si le problème persiste.',
      }
    }
    if (profile && profile.role !== 'student') {
      return {
        code: 'wrong_role',
        message: `Ce compte est enregistré avec le rôle « ${profile.role} », pas « student ».`,
      }
    }
    if (profile && profile.is_active === false) {
      return {
        code: 'inactive',
        message: 'Votre compte élève est désactivé.',
      }
    }
    if (
      profile?.access_expires_at
      && new Date(profile.access_expires_at) <= new Date()
    ) {
      return {
        code: 'access_expired',
        message: 'Votre accès Pedagogia Drive a expiré. Contactez votre auto-école pour le réactiver.',
      }
    }
    if (studentError) {
      return {
        code: 'student_query_failed',
        message: 'Impossible de charger votre dossier élève.',
        detail: studentError,
      }
    }
    if (!student) {
      return {
        code: 'missing_student',
        message: 'Votre profil existe, mais aucun dossier élève n\'a été trouvé dans la table students.',
        detail: 'Demandez au secrétariat de vérifier que votre inscription a bien été enregistrée.',
      }
    }
    return null
  })()

  return {
    user,
    profile,
    student,
    profileId: user?.id || profileId,
    userEmail: user?.email || profile?.email || null,
    loading: authLoading || loading,
    profileError,
    studentError,
    issue,
    refresh,
  }
}
