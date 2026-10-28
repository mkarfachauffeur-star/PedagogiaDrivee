// Inscriptions et pré-inscriptions relèvent du secrétariat ; le gérant ne les fait
// que si l'auto-école n'a aucun compte secrétaire actif (même règle que
// app.can_act_as_secretary() côté base et useSecretaryDuties() côté application).
// deno-lint-ignore no-explicit-any
export async function canActAsSecretary(admin: any, role: string, organizationId: string) {
  if (role === 'secretary') return true
  if (role !== 'manager' || !organizationId) return false
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('role', 'secretary')
    .eq('is_active', true)
  if (error) return false
  return (count || 0) === 0
}

export const SECRETARY_ONLY_MESSAGE =
  'Votre auto-école a un secrétariat : c’est lui qui gère les inscriptions.'
