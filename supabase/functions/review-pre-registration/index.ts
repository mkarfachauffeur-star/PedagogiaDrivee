// PEDAGOGIA DRIVE — Accepter / refuser une pré-inscription élève
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkStudentQuota, loadSubscription, notifyQuotaThreshold } from '../_shared/student-quota.ts'
import { canActAsSecretary, SECRETARY_ONLY_MESSAGE } from '../_shared/secretary-duties.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function formatNamePart(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join('')
}

function mapDesiredTraining(training: string) {
  const map: Record<string, { license_category: string; formation_type: string; package_name: string }> = {
    'Permis B': { license_category: 'Permis B', formation_type: 'Permis B', package_name: 'Permis B' },
    AAC: { license_category: 'Permis B', formation_type: 'AAC', package_name: 'AAC' },
    'Conduite supervisée': {
      license_category: 'Permis B',
      formation_type: 'Conduite supervisée',
      package_name: 'Conduite supervisée',
    },
    'Moto A1': { license_category: 'Permis A1', formation_type: 'Moto A1', package_name: 'Moto A1' },
    'Moto A2': { license_category: 'Permis A2', formation_type: 'Moto A2', package_name: 'Moto A2' },
    'Permis AM': { license_category: 'Permis AM', formation_type: 'Permis AM', package_name: 'Permis AM' },
  }
  return map[training] || map['Permis B']
}

async function generateFileNumber(
  admin: ReturnType<typeof createClient>,
  orgId: string,
  lastName: string,
  firstName: string,
) {
  const year = new Date().getFullYear()
  const { count } = await admin
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)

  const seq = String((count || 0) + 1).padStart(3, '0')
  const base = `PD-${year}-${seq}`
  const parts = [base, formatNamePart(lastName), formatNamePart(firstName)].filter(Boolean)
  let candidate = parts.join('-')

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: existing } = await admin
      .from('students')
      .select('id')
      .eq('organization_id', orgId)
      .eq('file_number', candidate)
      .maybeSingle()
    if (!existing) return candidate
    candidate = `${base}-${String(attempt + 2).padStart(2, '0')}`
  }
  return `${base}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
}

async function canCreateStudent(admin: ReturnType<typeof createClient>, orgId: string) {
  const { data: org } = await admin.from('organizations').select('status, name').eq('id', orgId).single()
  if (!org || ['suspended', 'cancelled'].includes(org.status)) return { ok: false, reason: 'Organisation en lecture seule.' }

  const sub = await loadSubscription(admin, orgId)

  if (sub?.status && ['suspended', 'expired', 'cancelled'].includes(sub.status)) {
    return { ok: false, reason: 'Abonnement inactif.' }
  }
  if (org.status === 'trial' && sub?.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
    return { ok: false, reason: 'Essai gratuit expiré.' }
  }

  // Formule limitée (Starter) : quota compté par année d'abonnement.
  const quota = await checkStudentQuota(admin, orgId, sub)
  if (!quota.ok) return { ok: false, reason: quota.reason }
  return { ok: true, orgName: org.name || 'votre auto-école' }
}

async function notifyTeacher(
  admin: ReturnType<typeof createClient>,
  orgId: string,
  teacherId: string,
  preRegistrationId: string,
  approved: boolean,
  studentName: string,
) {
  await admin.from('notifications').insert({
    organization_id: orgId,
    profile_id: teacherId,
    notification_type: 'pre_registration',
    title: approved ? 'Votre pré-inscription a été acceptée' : 'Votre pré-inscription a été refusée',
    body: approved
      ? `${studentName} — dossier élève créé.`
      : `${studentName} — la demande a été refusée par le secrétariat.`,
    pre_registration_id: preRegistrationId,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await asCaller.auth.getUser()
    const caller = userData?.user
    if (!caller) return json({ error: 'Non authentifié' }, 401)

    const admin = createClient(url, serviceKey)

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', caller.id)
      .maybeSingle()

    if (!callerProfile || !['manager', 'secretary'].includes(callerProfile.role)) {
      return json({ error: 'Action réservée au gérant ou au secrétariat' }, 403)
    }
    if (!(await canActAsSecretary(admin, callerProfile.role, callerProfile.organization_id))) {
      return json({ error: SECRETARY_ONLY_MESSAGE }, 403)
    }

    const body = await req.json()
    const preRegistrationId = String(body.pre_registration_id || '').trim()
    const action = String(body.action || '').trim()

    if (!preRegistrationId) return json({ error: 'Pré-inscription introuvable.' }, 400)
    if (!['approve', 'reject'].includes(action)) return json({ error: 'Action invalide.' }, 400)

    const { data: preReg, error: preRegError } = await admin
      .from('pre_registrations')
      .select('*')
      .eq('id', preRegistrationId)
      .eq('organization_id', callerProfile.organization_id)
      .maybeSingle()

    if (preRegError || !preReg) return json({ error: 'Pré-inscription introuvable.' }, 404)
    if (preReg.status !== 'pending') return json({ error: 'Cette pré-inscription a déjà été traitée.' }, 400)

    const studentName = `${preReg.last_name} ${preReg.first_name}`.trim()

    if (action === 'reject') {
      const { data: updated, error: updateError } = await admin
        .from('pre_registrations')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: caller.id,
        })
        .eq('id', preRegistrationId)
        .select('*')
        .single()

      if (updateError) return json({ error: updateError.message }, 400)

      await notifyTeacher(admin, preReg.organization_id, preReg.teacher_id, preRegistrationId, false, studentName)

      return json({ ok: true, pre_registration: updated, message: 'Pré-inscription refusée.' })
    }

    const email = String(preReg.email || '').trim().toLowerCase()
    if (!email) {
      return json({ error: 'Un e-mail est requis pour accepter et créer le dossier élève.' }, 400)
    }

    const gate = await canCreateStudent(admin, preReg.organization_id)
    if (!gate.ok) return json({ error: gate.reason }, 403)

    const firstName = String(preReg.first_name || '').trim()
    const lastName = String(preReg.last_name || '').trim()
    const phone = String(preReg.phone || '').trim()
    const training = mapDesiredTraining(String(preReg.desired_training || 'Permis B'))
    const fullName = `${lastName} ${firstName}`.trim()
    const tempPassword = generateTempPassword()
    const registrationDate = new Date().toISOString().slice(0, 10)

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: preReg.organization_id,
        role: 'student',
        full_name: fullName,
        must_change_password: true,
      },
    })

    if (authError) {
      const message = authError.message?.includes('already')
        ? 'Un compte existe déjà avec cet e-mail.'
        : authError.message
      return json({ error: message }, 400)
    }

    const userId = authData.user?.id
    if (!userId) return json({ error: 'Création du compte impossible.' }, 500)

    const { error: profileUpsertError } = await admin.from('profiles').upsert({
      id: userId,
      organization_id: preReg.organization_id,
      role: 'student',
      full_name: fullName,
      email,
      phone: phone || null,
    }, { onConflict: 'id' })

    if (profileUpsertError) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: `Profil élève non créé : ${profileUpsertError.message}` }, 500)
    }

    const fileNumber = await generateFileNumber(admin, preReg.organization_id, lastName, firstName)

    const { data: student, error: studentError } = await admin
      .from('students')
      .insert({
        organization_id: preReg.organization_id,
        profile_id: userId,
        file_number: fileNumber,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        license_category: training.license_category,
        package_name: training.package_name,
        formation_type: training.formation_type,
        code_status: 'Non obtenu',
        status: 'En attente',
        registration_date: registrationDate,
      })
      .select('id, file_number, first_name, last_name, email, status')
      .single()

    if (studentError) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: studentError.message }, 400)
    }

    await admin.from('contracts').insert({
      organization_id: preReg.organization_id,
      student_id: student.id,
      contract_total: 0,
      signed_at: registrationDate,
    })

    await admin.from('student_assignments').insert({
      student_id: student.id,
      teacher_id: preReg.teacher_id,
      is_referent: true,
    })

    const { data: updated, error: updateError } = await admin
      .from('pre_registrations')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: caller.id,
        student_id: student.id,
      })
      .eq('id', preRegistrationId)
      .select('*')
      .single()

    if (updateError) return json({ error: updateError.message }, 400)

    await notifyTeacher(admin, preReg.organization_id, preReg.teacher_id, preRegistrationId, true, studentName)
    await notifyQuotaThreshold(admin, preReg.organization_id, gate.orgName || 'votre auto-école')

    return json({
      ok: true,
      pre_registration: updated,
      student,
      temp_password: tempPassword,
      message: `Pré-inscription acceptée. Dossier élève créé et affecté à l'enseignant demandeur. Communiquez le mot de passe provisoire à l'élève (${email}).`,
    })
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500)
  }
})
