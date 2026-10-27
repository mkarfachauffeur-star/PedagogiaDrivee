// PEDAGOGIA DRIVE — Création élève (compte + dossier + accès provisoire)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { loginUrl } from '../_shared/app-url.ts'
import { emailLog, escapeHtml } from '../_shared/email-utils.ts'
import { checkStudentQuota, loadSubscription, notifyQuotaThreshold } from '../_shared/student-quota.ts'

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

async function sendAccessEmail(
  email: string,
  fullName: string,
  tempPassword: string,
  orgName: string,
): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('[create-student] RESEND_API_KEY absent — e-mail d’accès non envoyé')
    return { sent: false, reason: 'missing_resend_api_key' }
  }

  const appUrl = loginUrl()
  const from = Deno.env.get('ACCESS_EMAIL_FROM') || 'Pedagogia Drive <noreply@pedagogia-drive.fr>'

  const html = `
    <p>Bonjour ${escapeHtml(fullName)},</p>
    <p>Votre compte élève a été créé chez <strong>${escapeHtml(orgName)}</strong>.</p>
    <p><strong>Identifiant :</strong> ${escapeHtml(email)}<br/>
    <strong>Mot de passe provisoire :</strong> ${escapeHtml(tempPassword)}</p>
    <p>Connectez-vous sur <a href="${appUrl}">${appUrl}</a> puis modifiez votre mot de passe dès la première connexion.</p>
    <p>— Pedagogia Drive</p>
  `

  emailLog('create-student', 'info', 'send_access_email', { email, appUrl })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Accès élève — ${orgName}`,
      html,
    }),
  })
  if (res.ok) return { sent: true }
  const body = await res.text().catch(() => '')
  console.error('[create-student] Resend a échoué', res.status, body)
  return { sent: false, reason: `resend_${res.status}` }
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

    const orgId = callerProfile.organization_id
    const gate = await canCreateStudent(admin, orgId)
    if (!gate.ok) return json({ error: gate.reason }, 403)

    const body = await req.json()
    const firstName = String(body.first_name || '').trim()
    const lastName = String(body.last_name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim()
    const rawGender = String(body.gender || '').trim().toLowerCase()
    const gender = rawGender === 'male' || rawGender === 'female' ? rawGender : null
    const birthDate = body.birth_date ? String(body.birth_date) : null
    const birthPlace = String(body.birth_place || '').trim()
    const streetNumber = String(body.street_number || '').trim()
    const street = String(body.street || '').trim()
    const postalCode = String(body.postal_code || '').trim()
    const city = String(body.city || '').trim()
    const neph = String(body.neph || '').trim()
    const licenseCategory = String(body.license_category || 'Permis B').trim()
    const packageId = body.package_id ? String(body.package_id) : null
    const packageNameInput = String(body.package_name || '').trim()
    const teacherId = body.teacher_id ? String(body.teacher_id) : null
    const extraHours = Math.max(0, Math.floor(Number(body.extra_hours) || 0))
    const codeStatus = String(body.code_status || 'Non obtenu').trim()
    const status = String(body.status || 'En attente').trim()
    const registrationDate = body.registration_date ? String(body.registration_date) : new Date().toISOString().slice(0, 10)
    const documents = Array.isArray(body.documents) ? body.documents.map(String) : []
    const paymentCollected = Math.max(0, Number(body.payment_collected) || 0)
    const remainingPayment = body.remaining_payment != null && body.remaining_payment !== ''
      ? Math.max(0, Number(body.remaining_payment) || 0)
      : null
    const sendAccessEmailFlag = body.send_access_email !== false

    if (!firstName || !lastName || !email) {
      return json({ error: 'Nom, prénom et e-mail sont obligatoires.' }, 400)
    }
    if (!gender) {
      return json({ error: 'Le genre est obligatoire.' }, 400)
    }

    const fullName = `${lastName} ${firstName}`.trim()
    const tempPassword = generateTempPassword()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        organization_id: orgId,
        role: 'student',
        full_name: fullName,
        gender,
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
      organization_id: orgId,
      role: 'student',
      full_name: fullName,
      email,
      phone: phone || null,
      gender,
    }, { onConflict: 'id' })

    if (profileUpsertError) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: `Profil élève non créé : ${profileUpsertError.message}` }, 500)
    }

    const fileNumber = await generateFileNumber(admin, orgId, lastName, firstName)

    let packageName: string | null = packageNameInput || null
    let pkg: Record<string, unknown> | null = null
    if (packageId) {
      const { data } = await admin.from('pricing_packages').select('*').eq('id', packageId).eq('organization_id', orgId).maybeSingle()
      pkg = data
      packageName = data?.name || packageName
    }

    const { data: student, error: studentError } = await admin
      .from('students')
      .insert({
        organization_id: orgId,
        profile_id: userId,
        file_number: fileNumber,
        first_name: firstName,
        last_name: lastName,
        email,
        phone: phone || null,
        birth_date: birthDate || null,
        birth_place: birthPlace || null,
        street_number: streetNumber || null,
        street: street || null,
        postal_code: postalCode || null,
        city: city || null,
        neph: neph || null,
        license_category: licenseCategory || null,
        package_id: packageId,
        package_name: packageName,
        formation_type: packageName,
        extra_hours: extraHours,
        code_status: codeStatus,
        status,
        registration_date: registrationDate,
      })
      .select('id, file_number, first_name, last_name, email, status')
      .single()

    if (studentError) {
      await admin.auth.admin.deleteUser(userId)
      return json({ error: studentError.message }, 400)
    }

    if (pkg) {
      const examTtc = pkg.exam_presentation_included ? Number(pkg.exam_presentation_ttc || 0) : 0
      const extraAmount = extraHours * Number(pkg.extra_hour_price_ttc || 0)
      await admin.from('contracts').insert({
        organization_id: orgId,
        student_id: student.id,
        package_id: packageId,
        package_price_ttc: Number(pkg.price_ttc || 0),
        admin_fee_ttc: Number(pkg.admin_fee_ttc || 0),
        exam_presentation_ttc: examTtc,
        extra_hours: extraHours,
        extra_hours_amount_ttc: extraAmount,
        signed_at: registrationDate,
      })
    } else {
      const manualTotal = paymentCollected + (remainingPayment ?? 0)
      await admin.from('contracts').insert({
        organization_id: orgId,
        student_id: student.id,
        contract_total: manualTotal,
        signed_at: registrationDate,
      })
    }

    if (paymentCollected > 0) {
      await admin.from('payments').insert({
        organization_id: orgId,
        student_id: student.id,
        amount: paymentCollected,
        method: 'Espèces',
        nature: 'Inscription',
        created_by: caller.id,
      })
    }

    if (documents.length) {
      await admin.from('documents').insert(
        documents.map((type) => ({
          organization_id: orgId,
          student_id: student.id,
          type,
          status: 'Reçu',
          created_by: caller.id,
        })),
      )
    }

    if (teacherId) {
      await admin.from('student_assignments').insert({
        student_id: student.id,
        teacher_id: teacherId,
        is_referent: true,
      })
    }

    await notifyQuotaThreshold(admin, orgId, gate.orgName || 'votre auto-école')

    let emailSent = false
    let emailError: string | null = null
    if (sendAccessEmailFlag) {
      const emailResult = await sendAccessEmail(email, fullName, tempPassword, gate.orgName || 'votre auto-école')
      emailSent = emailResult.sent
      emailError = emailResult.reason ?? null
    }

    return json({
      ok: true,
      student,
      email,
      full_name: fullName,
      temp_password: tempPassword,
      email_sent: emailSent,
      email_error: emailError,
      message: emailSent
        ? 'Compte créé. Un e-mail d’accès avec le mot de passe provisoire a été envoyé.'
        : sendAccessEmailFlag
          ? emailError === 'missing_resend_api_key'
            ? 'Compte créé. Communiquez le mot de passe provisoire à l’élève (service e-mail non configuré : RESEND_API_KEY).'
            : 'Compte créé. Communiquez le mot de passe provisoire à l’élève (envoi e-mail échoué).'
          : 'Compte créé. Communiquez le mot de passe provisoire à l’élève.',
    })
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500)
  }
})
