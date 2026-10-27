import {
  trackAeApproved,
  trackBeginTrial,
  trackDeleteAccount,
  trackPurchase,
  trackSubscriptionCancelled,
  trackSubscriptionRenewed,
} from '../lib/analytics'
import { supabase } from '../lib/supabase'
import {
  PAYING_PLAN_CODES,
  averagePayingPlanCents,
  formatPlatformEur,
  monthlyRevenueForPlan,
  planPriceCents,
  resolveBillingStatus,
  resolveSubscriptionStatus,
} from '../lib/platformPlans'
import { isTestOrganization } from '../lib/platformTestData'
import { quotaLevel, quotaPeriod } from '../lib/studentQuota'

export { formatPlatformEur }

function mapBillingCycle(interval) {
  if (interval === 'year') return 'yearly'
  if (interval === 'month') return 'monthly'
  if (interval === 'trial') return 'trial'
  return interval || 'monthly'
}

async function currentSuperAdminLabel() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email || user?.id || undefined
}

async function readFunctionPayload(error, data) {
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

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export async function fetchPlatformSaasMetrics() {
  try {
    const [subsRes, invoicesRes, orgsRes, plansRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select(`
          id, status, trial_ends_at, current_period_start, current_period_end,
          cancelled_at, created_at, metadata,
          organization:organization_id(id, name, status, created_at, updated_at),
          plan:plan_id(code, name, price_cents, metadata)
        `),
      supabase
        .from('invoices')
        .select('id, status, amount_cents, due_at, paid_at, issued_at, organization_id'),
      supabase.from('organizations').select('id, name, email, status, created_at, updated_at'),
      supabase
        .from('plans')
        .select('id, code, name, price_cents, trial_days, metadata, is_active')
        .in('code', ['trial', 'starter', 'premium']),
    ])

    const error = subsRes.error || invoicesRes.error || orgsRes.error || plansRes.error
    if (error) throw error

    const allOrganizations = orgsRes.data || []
    const subscriptionByOrg = new Map((subsRes.data || []).map((sub) => [sub.organization?.id, sub]))
    const testOrganizationIds = new Set(
      allOrganizations.filter((org) => isTestOrganization(org, subscriptionByOrg.get(org.id))).map((org) => org.id),
    )
    const subscriptions = (subsRes.data || []).filter((sub) => !testOrganizationIds.has(sub.organization?.id))
    const invoices = (invoicesRes.data || []).filter((row) => !testOrganizationIds.has(row.organization_id))
    const organizations = allOrganizations.filter((org) => !testOrganizationIds.has(org.id))
    const saasPlans = plansRes.data || []
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const currentMonth = today.slice(0, 7)
    const thirtyDaysAgo = addDays(now, -30)

    const monthlyPaidCents = invoices
      .filter(
        (row) =>
          row.status === 'paid'
          && row.paid_at
          && String(row.paid_at).slice(0, 7) === currentMonth,
      )
      .reduce((sum, row) => sum + Number(row.amount_cents || 0), 0)

    let mrrCents = 0
    let trialCount = 0
    let starterCount = 0
    let premiumCount = 0

    subscriptions.forEach((sub) => {
      const org = sub.organization
      const plan = sub.plan
      const status = resolveSubscriptionStatus(org, sub, plan, now)

      if (status === 'Essai') trialCount += 1
      if (status === 'Starter') {
        starterCount += 1
        mrrCents += monthlyRevenueForPlan(plan)
      }
      if (status === 'Premium') {
        premiumCount += 1
        mrrCents += monthlyRevenueForPlan(plan)
      }
    })

    const totalPayingClients = starterCount + premiumCount
    const totalOrganizations = organizations.length
    const arrCents = mrrCents * 12

    const endedTrials = subscriptions.filter(
      (sub) => sub.trial_ends_at && new Date(sub.trial_ends_at) <= now,
    )
    const convertedFromTrial = endedTrials.filter((sub) => {
      const status = resolveSubscriptionStatus(sub.organization, sub, sub.plan, now)
      return status === 'Starter' || status === 'Premium'
    })
    const conversionRate =
      endedTrials.length > 0 ? (convertedFromTrial.length / endedTrials.length) * 100 : 0

    const cancelledRecently = organizations.filter(
      (org) =>
        org.status === 'cancelled'
        && org.updated_at
        && new Date(org.updated_at) >= thirtyDaysAgo,
    )
    const churnBase = totalPayingClients + cancelledRecently.length
    const churnRate = churnBase > 0 ? (cancelledRecently.length / churnBase) * 100 : 0

    const pendingInvoices = invoices.filter((row) => row.status === 'sent')
    const failedInvoices = pendingInvoices.filter(
      (row) => row.due_at && row.due_at < today,
    )

    const trialsExpiringNextMonth = subscriptions.filter((sub) => {
      if (!sub.trial_ends_at) return false
      const end = new Date(sub.trial_ends_at)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const monthAfter = new Date(now.getFullYear(), now.getMonth() + 2, 1)
      return end >= nextMonth && end < monthAfter
    })

    const avgPlanCents = averagePayingPlanCents(saasPlans)
    const projectedFromTrials =
      trialsExpiringNextMonth.length * (conversionRate / 100) * avgPlanCents
    const projectedNextMonthCents = Math.round(mrrCents + projectedFromTrials)
    const trialPlan = saasPlans.find((p) => p.code === 'trial')

    return {
      mrrCents,
      arrCents,
      trialCount,
      starterCount,
      premiumCount,
      totalPayingClients,
      totalOrganizations,
      monthlyPaidCents,
      projectedNextMonthCents,
      conversionRate,
      churnRate,
      pendingPayments: pendingInvoices.length,
      failedPayments: failedInvoices.length,
      pendingAmountCents: pendingInvoices.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0),
      failedAmountCents: failedInvoices.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0),
      saasPlans,
      trialDays: trialPlan?.trial_days ?? 30,
      testOrganizationCount: testOrganizationIds.size,
      error: null,
    }
  } catch (error) {
    return {
      mrrCents: 0,
      arrCents: 0,
      trialCount: 0,
      starterCount: 0,
      premiumCount: 0,
      totalPayingClients: 0,
      totalOrganizations: 0,
      monthlyPaidCents: 0,
      projectedNextMonthCents: 0,
      conversionRate: 0,
      churnRate: 0,
      pendingPayments: 0,
      failedPayments: 0,
      pendingAmountCents: 0,
      failedAmountCents: 0,
      saasPlans: [],
      trialDays: 30,
      error,
    }
  }
}

/** @deprecated Utiliser fetchPlatformSaasMetrics — ne plus inclure les élèves. */
export async function fetchPlatformStats() {
  const metrics = await fetchPlatformSaasMetrics()
  const demoRes = await supabase.from('demo_requests').select('id', { count: 'exact', head: true })
  return {
    ...metrics,
    totalDemoRequests: demoRes.count ?? 0,
  }
}

export async function listAllOrganizations() {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select(`
        id, name, email, phone, status, siret, prefecture_approval, created_at,
        subscriptions(id, status, trial_ends_at, current_period_end, metadata, plan:plan_id(name, code))
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { organizations: data || [], error: null }
  } catch (error) {
    return { organizations: [], error }
  }
}

export async function createOrganization({ name, email, phone }) {
  try {
    const { data, error } = await supabase.rpc('platform_create_organization', {
      p_name: name,
      p_email: email || null,
      p_phone: phone || null,
    })
    if (error) throw error
    if (data) {
      const approvedBy = await currentSuperAdminLabel()
      const approvedAt = new Date().toISOString()
      const trialDays = 30

      trackAeApproved({
        organizationId: data,
        organizationName: name,
        approvedBy,
        approvedAt,
        trialDays,
        planSelected: 'starter',
      })
      trackBeginTrial({
        organizationId: data,
        plan: 'starter',
        trialDays,
      })
    }
    return { organizationId: data, error: null }
  } catch (error) {
    return { organizationId: null, error }
  }
}

export async function deleteOrganization(orgId) {
  try {
    const { data, error } = await supabase.functions.invoke('platform-organization', {
      body: { action: 'delete', organization_id: orgId },
    })
    const payload = (await readFunctionPayload(error, data)) || data || {}
    if (error || payload.error) {
      throw new Error(payload.error || error?.message || 'Suppression impossible.')
    }
    trackDeleteAccount({ organizationId: orgId, scope: 'organization' })
    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function updateOrganizationStatus(orgId, status) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select('id, name, status')
      .single()
    if (error) throw error

    const subscriptionPatch = { updated_at: new Date().toISOString() }
    if (status === 'suspended') {
      subscriptionPatch.status = 'suspended'
    } else if (status === 'cancelled') {
      subscriptionPatch.status = 'cancelled'
      subscriptionPatch.cancelled_at = new Date().toISOString()
    } else if (status === 'active' || status === 'trial') {
      subscriptionPatch.status = 'active'
      subscriptionPatch.cancelled_at = null
    }

    await supabase
      .from('subscriptions')
      .update(subscriptionPatch)
      .eq('organization_id', orgId)

    await supabase.from('billing_history').insert({
      organization_id: orgId,
      event_type: status === 'suspended' ? 'suspended' : 'reactivated',
      new_value: { status },
    })
    return { organization: data, error: null }
  } catch (error) {
    return { organization: null, error }
  }
}

async function fetchManagersByOrg() {
  const { data } = await supabase
    .from('profiles')
    .select('organization_id, full_name, email')
    .eq('role', 'manager')
    .eq('is_active', true)
  const map = new Map()
  ;(data || []).forEach((row) => {
    if (row.organization_id && !map.has(row.organization_id)) {
      map.set(row.organization_id, row)
    }
  })
  return map
}

async function fetchLatestPaidInvoices() {
  const { data } = await supabase
    .from('invoices')
    .select('organization_id, paid_at, amount_cents, status, metadata')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })

  const map = new Map()
  ;(data || []).forEach((row) => {
    if (row.organization_id && !map.has(row.organization_id)) {
      map.set(row.organization_id, row)
    }
  })
  return map
}

export async function listAllSubscriptions() {
  try {
    const [subsRes, managers, lastPayments, invoicesRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select(`
          id, status, trial_ends_at, current_period_start, current_period_end,
          created_at, metadata, cancelled_at,
          organization:organization_id(id, name, status, email, created_at),
          plan:plan_id(id, code, name, price_cents, metadata)
        `)
        .order('created_at', { ascending: false }),
      fetchManagersByOrg(),
      fetchLatestPaidInvoices(),
      supabase.from('invoices').select('organization_id, status, due_at').eq('status', 'sent'),
    ])

    if (subsRes.error) throw subsRes.error

    const today = new Date().toISOString().slice(0, 10)
    const failedOrgIds = new Set(
      (invoicesRes.data || [])
        .filter((row) => row.due_at && row.due_at < today)
        .map((row) => row.organization_id),
    )

    const now = new Date()
    const rows = (subsRes.data || []).map((sub) => {
      const org = sub.organization
      const plan = sub.plan
      const manager = managers.get(org?.id)
      const lastInvoice = lastPayments.get(org?.id)
      const displayStatus = resolveSubscriptionStatus(org, sub, plan, now)
      const billingStatus = resolveBillingStatus(org, sub, plan, failedOrgIds.has(org?.id), now)
      const amountCents = displayStatus === 'Essai' ? 0 : planPriceCents(plan)

      return {
        ...sub,
        managerName: manager?.full_name || '—',
        managerEmail: manager?.email || org?.email || '—',
        displayStatus,
        billingStatus,
        offer: displayStatus,
        trialStartAt: sub.current_period_start || org?.created_at || sub.created_at,
        trialEndAt: sub.trial_ends_at,
        nextBillingAt: displayStatus === 'Essai' ? sub.trial_ends_at : sub.current_period_end,
        amountCents,
        paymentMethod: sub.metadata?.payment_method || lastInvoice?.metadata?.payment_method || '—',
        lastPaymentAt: lastInvoice?.paid_at || null,
        lastPaymentCents: lastInvoice?.amount_cents ?? null,
        isTest: isTestOrganization(org, sub),
        requestedPlan: sub.metadata?.requested_plan || null,
      }
    })

    return { subscriptions: rows, error: null }
  } catch (error) {
    return { subscriptions: [], error }
  }
}

export async function listPlatformPlans() {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('id, code, name, price_cents, metadata, max_students, trial_days, is_active')
      .in('code', ['trial', 'starter', 'premium'])
      .order('price_cents')
    if (error) throw error
    return { plans: data || [], error: null }
  } catch (error) {
    return { plans: [], error }
  }
}

export async function updateSaasPlan(planId, patch) {
  try {
    const { data, error } = await supabase
      .from('plans')
      .update(patch)
      .eq('id', planId)
      .select('*')
      .single()
    if (error) throw error
    return { plan: data, error: null }
  } catch (error) {
    return { plan: null, error }
  }
}

export async function updateSubscriptionBySuperAdmin(subscriptionId, payload) {
  try {
    const { data: current, error: readError } = await supabase
      .from('subscriptions')
      .select(`
        id, organization_id, metadata, plan_id, status, current_period_end,
        plan:plan_id(code, price_cents, interval)
      `)
      .eq('id', subscriptionId)
      .single()
    if (readError) throw readError

    const patch = { updated_at: new Date().toISOString() }
    let resolvedPlan = current.plan

    if (payload.planCode) {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id, code, price_cents, interval')
        .eq('code', payload.planCode)
        .maybeSingle()
      if (planError) throw planError
      if (!plan) throw new Error('Plan introuvable.')
      patch.plan_id = plan.id
      resolvedPlan = plan
    }

    if (payload.planCode && PAYING_PLAN_CODES.has(payload.planCode) && !payload.status) {
      patch.status = 'active'
    }

    if (payload.trialEndsAt !== undefined) patch.trial_ends_at = payload.trialEndsAt || null
    if (payload.currentPeriodEnd !== undefined) patch.current_period_end = payload.currentPeriodEnd || null
    if (payload.status) patch.status = payload.status

    const planChanged = Boolean(payload.planCode && payload.planCode !== current.plan?.code)
    if (payload.paymentMethod !== undefined || payload.isTest !== undefined || planChanged) {
      patch.metadata = { ...(current.metadata || {}) }
      if (payload.paymentMethod !== undefined) patch.metadata.payment_method = payload.paymentMethod || null
      if (payload.isTest !== undefined) patch.metadata.is_test = Boolean(payload.isTest)
      // Nouvelle formule : nouvelle année d'abonnement pour le quota d'élèves.
      if (planChanged) patch.metadata.plan_started_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(patch)
      .eq('id', subscriptionId)
      .select('id, organization_id, status')
      .single()
    if (error) throw error

    if (payload.orgStatus) {
      await updateOrganizationStatus(current.organization_id, payload.orgStatus)
    } else if (payload.status === 'active' && payload.planCode && PAYING_PLAN_CODES.has(payload.planCode)) {
      await supabase
        .from('organizations')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', current.organization_id)
    }

    await supabase.from('billing_history').insert({
      organization_id: current.organization_id,
      subscription_id: subscriptionId,
      event_type: 'subscription_updated',
      new_value: payload,
      notes: 'Modification Super Admin',
    })

    const planCode = resolvedPlan?.code || payload.planCode
    const orgId = current.organization_id
    const previousStatus = current.status
    const newStatus = data?.status ?? patch.status ?? current.status
    const wasPaying = PAYING_PLAN_CODES.has(current.plan?.code || '')
    const isPayingPlan = planCode && PAYING_PLAN_CODES.has(planCode)
    const becameActive = newStatus === 'active' && previousStatus !== 'active'
    const activatedPayingPlan =
      isPayingPlan
      && newStatus === 'active'
      && (becameActive || !wasPaying || (payload.planCode && payload.planCode !== current.plan?.code))

    if (activatedPayingPlan) {
      trackPurchase({
        organizationId: orgId,
        subscriptionPlan: planCode,
        amount: planPriceCents(resolvedPlan) / 100,
        currency: 'EUR',
        billingCycle: mapBillingCycle(resolvedPlan?.interval),
      })
    }

    if (payload.currentPeriodEnd) {
      const previousEnd = current.current_period_end ? new Date(current.current_period_end) : null
      const nextEnd = new Date(payload.currentPeriodEnd)
      if (!Number.isNaN(nextEnd.getTime()) && (!previousEnd || nextEnd > previousEnd)) {
        trackSubscriptionRenewed({
          organizationId: orgId,
          subscriptionPlan: planCode || undefined,
        })
      }
    }

    return { subscription: data, error: null }
  } catch (error) {
    return { subscription: null, error }
  }
}

export async function suspendSubscription(subscriptionId, orgId) {
  await supabase
    .from('subscriptions')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  return updateOrganizationStatus(orgId, 'suspended')
}

export async function reactivateSubscription(subscriptionId, orgId) {
  await supabase
    .from('subscriptions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  return updateOrganizationStatus(orgId, 'active')
}

export async function cancelSubscription(subscriptionId, orgId) {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan:plan_id(code)')
    .eq('id', subscriptionId)
    .maybeSingle()

  const now = new Date().toISOString()
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
    .eq('id', subscriptionId)

  trackSubscriptionCancelled({
    organizationId: orgId,
    subscriptionPlan: sub?.plan?.code || undefined,
  })

  return updateOrganizationStatus(orgId, 'cancelled')
}

export async function listPlatformInvoices(limit = 200) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id, invoice_number, amount_cents, currency, status,
        issued_at, due_at, paid_at, notes, metadata, created_at,
        organization:organization_id(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return { invoices: data || [], error: null }
  } catch (error) {
    return { invoices: [], error }
  }
}

export async function updateSubscriptionStatus(subscriptionId, status) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId)
      .select('id, status, organization_id')
      .single()
    if (error) throw error
    return { subscription: data, error: null }
  } catch (error) {
    return { subscription: null, error }
  }
}

export async function listAllProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, full_name, email, role, is_active, created_at,
        organization:organization_id(id, name)
      `)
      .not('organization_id', 'is', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return { profiles: data || [], error: null }
  } catch (error) {
    return { profiles: [], error }
  }
}

export async function updateProfileBySuperAdmin(profileId, patch) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', profileId)
      .select('id, full_name, email, role, is_active')
      .single()
    if (error) throw error
    return { profile: data, error: null }
  } catch (error) {
    return { profile: null, error }
  }
}

export async function fetchPlatformSettings() {
  try {
    const { data, error } = await supabase.from('platform_settings').select('key, value')
    if (error) throw error
    const map = Object.fromEntries((data || []).map((row) => [row.key, row.value]))
    return { settings: map, error: null }
  } catch (error) {
    return { settings: {}, error }
  }
}

export async function savePlatformSettings(key, value) {
  try {
    const { error } = await supabase.from('platform_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function listAuditLogs({ organizationId, action, dateFrom, dateTo, limit = 100 } = {}) {
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (organizationId) query = query.eq('organization_id', organizationId)
    if (action) query = query.eq('action', action)
    if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`)
    if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`)
    const { data, error } = await query
    if (error) throw error
    return { logs: data || [], error: null }
  } catch (error) {
    return { logs: [], error }
  }
}

export async function checkIsSuperAdmin(userId) {
  try {
    const { data, error } = await supabase
      .from('super_admins')
      .select('profile_id')
      .eq('profile_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    if (data) return true

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .maybeSingle()
    return profile?.role === 'super_admin' && profile?.is_active !== false
  } catch {
    return false
  }
}

/** Note l'offre choisie sur la page d'accueil dans l'abonnement créé à l'acceptation (l'essai reste inchangé). */
export async function recordRequestedPlan(organizationId, planCode) {
  try {
    const { data: sub, error: readError } = await supabase
      .from('subscriptions')
      .select('id, metadata')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (readError) throw readError
    if (!sub) return { error: null }
    const { error } = await supabase
      .from('subscriptions')
      .update({ metadata: { ...(sub.metadata || {}), requested_plan: planCode }, updated_at: new Date().toISOString() })
      .eq('id', sub.id)
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

/** Fiche d'une auto-école : établissement, abonnement, comptes, factures. */
export async function getOrganizationOverview(organizationId) {
  try {
    const [orgRes, profilesRes, invoicesRes] = await Promise.all([
      supabase
        .from('organizations')
        .select(`
          id, name, manager_name, email, phone, status, siret, prefecture_approval, address, postal_code, city, created_at, updated_at,
          subscriptions(id, status, trial_ends_at, current_period_start, current_period_end, metadata,
            plan:plan_id(code, name, price_cents))
        `)
        .eq('id', organizationId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true }),
      supabase
        .from('invoices')
        .select('id, invoice_number, amount_cents, status, issued_at, due_at, paid_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
    ])
    const error = orgRes.error || profilesRes.error || invoicesRes.error
    if (error) throw error
    return {
      organization: orgRes.data,
      profiles: profilesRes.data || [],
      invoices: invoicesRes.data || [],
      error: null,
    }
  } catch (error) {
    return { organization: null, profiles: [], invoices: [], error }
  }
}

/**
 * Élèves inscrits sur l'année d'abonnement en cours, par auto-école, avec la limite de la formule.
 * Retourne une Map : organization_id → { used, max, level, period, planName }.
 */
export async function fetchStudentQuotas() {
  try {
    const [subsRes, studentsRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('organization_id, trial_ends_at, current_period_start, created_at, metadata, plan:plan_id(name, code, max_students)')
        .order('created_at', { ascending: false }),
      supabase.from('students').select('organization_id, created_at'),
    ])
    if (subsRes.error) throw subsRes.error
    if (studentsRes.error) throw studentsRes.error

    const quotas = new Map()
    ;(subsRes.data || []).forEach((sub) => {
      if (quotas.has(sub.organization_id)) return
      const period = quotaPeriod(sub)
      const used = (studentsRes.data || []).filter(
        (student) =>
          student.organization_id === sub.organization_id
          && (!period || new Date(student.created_at) >= period.start),
      ).length
      const max = sub.plan?.max_students ?? null
      quotas.set(sub.organization_id, { used, max, level: quotaLevel(used, max), period, planName: sub.plan?.name || null })
    })
    return { quotas, error: null }
  } catch (error) {
    return { quotas: new Map(), error }
  }
}
