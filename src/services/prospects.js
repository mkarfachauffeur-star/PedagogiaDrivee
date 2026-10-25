import { trackAeApproved, trackBeginTrial } from '../lib/analytics'
import { supabase } from '../lib/supabase'
import { isTestProspect } from '../lib/platformTestData'

export const PROSPECT_STATUS = {
  NEW: 'Nouvelle demande',
  REFUSED: 'Refusée',
  ACCEPTED: 'Acceptée',
  /** @deprecated alias historique */
  TRIAL: 'Essai gratuit',
}

function normalizeError(error) {
  if (!error) return null
  return error instanceof Error ? error : new Error(error.message || String(error))
}

async function readInvokePayload(error, data) {
  if (data && typeof data === 'object') return data
  try {
    if (error?.context && typeof error.context.json === 'function') {
      return await error.context.json()
    }
  } catch {
    // ignore
  }
  try {
    const body = error?.context?.body
    if (typeof body === 'string' && body.trim()) return JSON.parse(body)
  } catch {
    // ignore
  }
  return null
}

function formatStepsMessage(payload) {
  if (!payload?.steps?.length) return null
  const lines = payload.steps.map((step) => {
    const icon = step.status === 'ok' ? '✓' : step.status === 'error' ? '✗' : '·'
    const detail = step.message ? ` — ${step.message}` : ''
    let line = `${icon} ${step.step}${detail}`
    if (step.detail && typeof step.detail === 'object') {
      const extras = []
      if (step.detail.http_status != null) extras.push(`HTTP ${step.detail.http_status}`)
      if (step.detail.body) extras.push(JSON.stringify(step.detail.body))
      else if (step.detail.resend_error) extras.push(JSON.stringify(step.detail.resend_error))
      if (extras.length) line += `\n    ${extras.join(' — ')}`
    }
    return line
  })
  if (payload.resend_response) {
    lines.push(`\nRéponse Resend complète :\n${JSON.stringify(payload.resend_response, null, 2)}`)
  }
  return lines.join('\n')
}

async function invokePlatformProspect(body) {
  const { data, error } = await supabase.functions.invoke('platform-prospect', { body })
  const payload = (await readInvokePayload(error, data)) || data || {}

  if (error || payload.error) {
    const stepsText = formatStepsMessage(payload)
    const failedStep = payload.failed_step ? `[${payload.failed_step}] ` : ''
    const message = payload.error || error?.message || 'Opération impossible.'
    const fullMessage = stepsText
      ? `${failedStep}${message}\n\n${stepsText}`
      : `${failedStep}${message}`
    throw new Error(fullMessage)
  }

  return payload
}

export async function listProspects() {
  const rpc = await supabase.rpc('platform_list_demo_requests')
  if (!rpc.error) {
    return { prospects: rpc.data || [], error: null }
  }

  const direct = await supabase
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (direct.error) {
    console.error('[prospects] listProspects failed', {
      rpc: rpc.error?.message,
      direct: direct.error?.message,
    })
    return {
      prospects: [],
      error: normalizeError(direct.error || rpc.error),
    }
  }

  return { prospects: direct.data || [], error: null }
}

/** Demandes à traiter, hors demandes de test : même règle que la page Demandes de démo. */
export async function countNewProspects() {
  const { prospects, error: listError } = await listProspects()
  if (!listError) {
    return prospects.filter(
      (row) => !row.organization_id && (row.status || PROSPECT_STATUS.NEW) === PROSPECT_STATUS.NEW && !isTestProspect(row),
    ).length
  }

  const rpc = await supabase.rpc('platform_count_new_demo_requests')
  if (!rpc.error && rpc.data != null) {
    return Number(rpc.data) || 0
  }

  const { count, error } = await supabase
    .from('demo_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', PROSPECT_STATUS.NEW)

  if (error) {
    const { count: totalCount } = await supabase
      .from('demo_requests')
      .select('id', { count: 'exact', head: true })
    return totalCount ?? 0
  }

  return count ?? 0
}

export async function updateProspect(prospectId, patch) {
  const rpc = await supabase.rpc('platform_update_demo_request', {
    p_id: prospectId,
    p_status: patch.status ?? null,
    p_internal_notes: patch.internal_notes ?? null,
  })

  if (!rpc.error && rpc.data) {
    return { prospect: rpc.data, error: null }
  }

  const { data, error } = await supabase
    .from('demo_requests')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', prospectId)
    .select('*')
    .single()

  if (error) return { prospect: null, error: normalizeError(error) }
  return { prospect: data, error: null }
}

export async function refuseProspect(prospectId) {
  return updateProspect(prospectId, { status: PROSPECT_STATUS.REFUSED })
}

export async function acceptProspect(prospectId) {
  try {
    const { data: prospect } = await supabase
      .from('demo_requests')
      .select('school_name')
      .eq('id', prospectId)
      .maybeSingle()

    const data = await invokePlatformProspect({
      action: 'accept_prospect',
      prospect_id: prospectId,
    })

    if (data?.organization_id) {
      const { data: authData } = await supabase.auth.getUser()
      const approvedBy = authData?.user?.email || authData?.user?.id || undefined
      const approvedAt = new Date().toISOString()
      const trialDays = 30

      trackAeApproved({
        organizationId: data.organization_id,
        organizationName: prospect?.school_name,
        approvedBy,
        approvedAt,
        trialDays,
        planSelected: 'starter',
      })
      trackBeginTrial({
        organizationId: data.organization_id,
        plan: 'starter',
        trialDays,
      })
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

export async function resendManagerInvite(prospectId) {
  try {
    const data = await invokePlatformProspect({
      action: 'resend_invite',
      prospect_id: prospectId,
    })
    return { data, error: null }
  } catch (error) {
    return { data: null, error: normalizeError(error) }
  }
}

export async function deleteProspectRecord(prospectId) {
  const rpc = await supabase.rpc('platform_delete_demo_request', { p_id: prospectId })
  if (!rpc.error) {
    return { error: null }
  }

  const { error } = await supabase.from('demo_requests').delete().eq('id', prospectId)
  if (error) return { error: normalizeError(error) }
  return { error: null }
}

export function formatAcceptSteps(data) {
  return formatStepsMessage(data)
}
