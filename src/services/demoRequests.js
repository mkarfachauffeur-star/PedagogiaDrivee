import { supabase } from '../lib/supabase'
import { trackAePendingValidation, trackSignUp } from '../lib/analytics'
import { sanitizeSiret, toOrganizationPatch } from '../lib/orgProfile'
import { toUserError } from '../lib/userFacingError'

export async function submitDemoRequest(payload) {
  try {
    const patch = toOrganizationPatch({
      orgName: payload.schoolName,
      managerName: payload.contactName,
      address: payload.address,
      postalCode: payload.postalCode,
      city: payload.city,
      phone: payload.phone,
      email: payload.email,
      siret: payload.siret,
      prefectureApproval: payload.prefectureApproval,
      website: payload.website,
    })

    const row = {
      school_name: patch.name,
      contact_name: patch.manager_name,
      phone: patch.phone,
      email: patch.email,
      address: patch.address,
      postal_code: patch.postal_code,
      city: patch.city,
      siret: sanitizeSiret(patch.siret) || null,
      prefecture_approval: patch.prefecture_approval,
      website: patch.website,
      approximate_students: payload.activeStudents?.trim() || null,
      message: [payload.offerName ? `Offre choisie : ${payload.offerName}` : null, payload.message?.trim() || null]
        .filter(Boolean)
        .join('\n') || null,
    }

    // INSERT seul : le RETURNING (.select) est bloqué par RLS pour anon et rôles non Super Admin.
    const { error } = await supabase.from('demo_requests').insert(row)
    if (error) throw error

    trackSignUp({
      organizationName: row.school_name,
      email: row.email,
      planSelected: payload.offerId || 'starter',
    })
    trackAePendingValidation({
      organizationName: row.school_name,
      email: row.email,
      planSelected: payload.offerId || 'starter',
    })

    const { error: notifyError } = await supabase.functions.invoke('notify-demo-request', {
      body: {
        school_name: row.school_name,
        contact_name: row.contact_name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        postal_code: row.postal_code,
        city: row.city,
        siret: row.siret,
        prefecture_approval: row.prefecture_approval,
        website: row.website,
        approximate_students: row.approximate_students,
        message: row.message,
      },
    })

    if (notifyError) {
      console.warn('[demoRequests] Notification e-mail non envoyée:', notifyError.message)
    }

    return { error: null }
  } catch (error) {
    return { error: toUserError(error, 'save') }
  }
}
