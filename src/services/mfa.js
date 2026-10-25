import { supabase } from '../lib/supabase'

/** Double authentification par application (TOTP : Google Authenticator, 1Password, etc.). */

export async function getAssurance() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) return { needsCode: false, error }
  return { needsCode: data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2', error: null }
}

export async function listVerifiedTotp() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return { factors: [], error }
  return { factors: (data?.totp || []).filter((factor) => factor.status === 'verified'), error: null }
}

/** Supprime les essais d'activation abandonnés, puis crée un nouveau facteur avec son QR code. */
export async function startTotpEnrollment() {
  const { data: list } = await supabase.auth.mfa.listFactors()
  const pending = (list?.all || []).filter((factor) => factor.factor_type === 'totp' && factor.status !== 'verified')
  await Promise.all(pending.map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })))
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Pedagogia Drive ${Date.now()}` })
  if (error) return { enrollment: null, error }
  return { enrollment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }, error: null }
}

export async function verifyTotp(factorId, code) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: String(code).replace(/\s/g, '') })
  return { error }
}

export async function removeTotp(factorId) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  return { error }
}

/**
 * Confirme l'identité avant une action définitive : code de l'application si la double
 * authentification est active (la session reste au niveau aal2), sinon mot de passe.
 */
export async function identityCheckMode() {
  const { factors } = await listVerifiedTotp()
  return factors[0] ? { mode: 'totp', factorId: factors[0].id } : { mode: 'password', factorId: null }
}

export async function verifyIdentity({ mode, factorId }, secret) {
  if (!secret) return { ok: false }
  if (mode === 'totp') {
    const { error } = await verifyTotp(factorId, secret)
    return { ok: !error }
  }
  const { data } = await supabase.auth.getUser()
  const email = data?.user?.email
  if (!email) return { ok: false }
  const { error } = await supabase.auth.signInWithPassword({ email, password: secret })
  return { ok: !error }
}
