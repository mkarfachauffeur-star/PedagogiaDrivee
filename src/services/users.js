import { trackDeleteAccount } from '../lib/analytics'
import { supabase } from '../lib/supabase'
import { formatPersonName } from '../lib/staffAccounts'
import { normalizeGender } from '../lib/genderedRoles'
import { inviteUser } from './invitations'
import { subscribePostgresChanges } from './realtime'
import { toUserError } from '../lib/userFacingError'

export async function listOrganizationUsers() {
  try {
    const { data, error } = await supabase.rpc('list_organization_users')
    if (error) throw error
    return { users: data || [], error: null }
  } catch (error) {
    const rpcMissing = error?.code === 'PGRST202'
      || /list_organization_users/i.test(error?.message || '')

    if (rpcMissing) {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, phone, role, is_active, gender')
          .in('role', ['manager', 'teacher', 'secretary'])
          .order('full_name')
        if (profileError) throw profileError
        return { users: data || [], error: null }
      } catch (fallbackError) {
        return { users: [], error: fallbackError }
      }
    }

    return { users: [], error }
  }
}

export function staffToSelectOptions(users, { roles } = {}) {
  const allowedRoles = roles?.length ? new Set(roles) : null
  return (users || [])
    .filter((user) => user.is_active !== false)
    .filter((user) => !allowedRoles || allowedRoles.has(user.role))
    .map((user) => {
      const name = user.full_name?.trim() || user.email || 'Utilisateur'
      return { label: name, value: name }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}

export async function createOrganizationUser({ firstName, lastName, email, phone, role, gender }) {
  const fullName = formatPersonName({ firstName, lastName })
  const normalizedGender = role === 'secretary' ? null : normalizeGender(gender)
  const { error: inviteError, userId } = await inviteUser({
    email,
    role,
    fullName,
    gender: normalizedGender,
  })
  if (inviteError) return { user: null, error: inviteError }

  const profilePatch = {
    phone: phone?.trim() || null,
    full_name: fullName,
  }
  if (normalizedGender) profilePatch.gender = normalizedGender

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .update(profilePatch)
    .eq('id', userId)
    .select('id, full_name, email, phone, role, is_active, gender')
    .single()

  if (profileError) return { user: null, error: toUserError(profileError, 'save') }

  if (role === 'teacher') {
    await supabase.rpc('ensure_teacher_record', { p_profile_id: userId })
  }

  return { user: profile, error: null }
}

export async function manageUser(action, userId, { newEmail } = {}) {
  const body = { action, user_id: userId }
  if (newEmail) body.new_email = newEmail
  const { data, error } = await supabase.functions.invoke('manage-user', { body })
  if (error) return { error: toUserError(error, 'permission') }
  if (data?.error) return { error: toUserError(data.error, 'permission') }
  if (action === 'delete') {
    trackDeleteAccount({ userId, scope: 'user' })
  }
  return { error: null, message: data?.message || 'Action effectuée.' }
}

export async function changeUserEmail(userId, newEmail) {
  return manageUser('change_email', userId, { newEmail })
}

export async function sendStaffPasswordReset(userId) {
  try {
    const { data: email, error: rpcError } = await supabase.rpc('manager_staff_password_reset_target', {
      p_user_id: userId,
    })
    if (rpcError) throw rpcError
    if (!email) throw new Error('E-mail introuvable pour cet utilisateur.')

    const redirectTo = `${window.location.origin}/accept-invite`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error

    return { error: null, message: 'E-mail de réinitialisation envoyé.' }
  } catch (error) {
    return { error: toUserError(error, 'L’e-mail de réinitialisation n’a pas pu être envoyé. Veuillez réessayer.'), message: null }
  }
}

export async function setStaffAccountActive(userId, isActive) {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!profile) throw new Error('Utilisateur introuvable.')

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)
    if (profileError) throw profileError

    return { error: null, message: isActive ? 'Compte réactivé.' : 'Compte désactivé.' }
  } catch (error) {
    return { error: toUserError(error, 'permission'), message: null }
  }
}

export function subscribeOrganizationUsers(onChange) {
  return subscribePostgresChanges({
    topicBase: 'org-users-list',
    listeners: [
      { config: { event: '*', schema: 'public', table: 'profiles' }, callback: onChange },
    ],
  })
}
