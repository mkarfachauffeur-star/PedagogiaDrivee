import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { trackFirstLogin } from '../lib/analytics'
import { supabase } from '../lib/supabase'
import BrandLogo from '../components/BrandLogo'
import PageSeo from '../components/seo/PageSeo'
import { getUserFacingError } from '../lib/userFacingError'
import { SITE_NAME } from '../lib/seo'
import {
  authHashErrorMessage,
  clearAuthHash,
  logAuthHash,
} from '../lib/authHashParams'
import { roleDestinations } from '../utils/authSession'
import { PASSWORD_POLICY_HINT, validatePassword } from '../lib/passwordPolicy'

const inputClass =
  'mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100'

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [hashError, setHashError] = useState(null)
  const [userEmail, setUserEmail] = useState(null)

  useEffect(() => {
    const parsed = logAuthHash('AcceptInvitePage')
    if (parsed?.error) {
      setHashError(authHashErrorMessage(parsed))
      clearAuthHash()
    }

    let active = true

    async function syncSession() {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return

      if (sessionError) {
        console.warn('[AcceptInvitePage] getSession:', sessionError)
      }

      if (data.session?.user) {
        setReady(true)
        setUserEmail(data.session.user.email ?? null)
        console.info('[AcceptInvitePage] Session établie pour', data.session.user.email)
        console.info('[AcceptInvitePage] auth.users id:', data.session.user.id)
        clearAuthHash()
      }
    }

    void syncSession()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.info('[AcceptInvitePage] onAuthStateChange:', event, session?.user?.email ?? '(sans session)')

      if (session?.user) {
        setReady(true)
        setUserEmail(session.user.email ?? null)
        console.info('[AcceptInvitePage] auth.users id:', session.user.id)
        clearAuthHash()
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setHashError(null)
      }
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe?.()
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const policy = validatePassword(password)
    if (!policy.ok) {
      setError(policy.error)
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    setError(null)

    const { data: userData } = await supabase.auth.getUser()
    let destination = '/login'
    let profileRole = null
    if (userData.user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle()
      profileRole = profile?.role ?? null
      destination = roleDestinations[profileRole] || destination
    }

    const isNewManager = profileRole === 'manager'
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: {
        must_change_password: false,
        ...(isNewManager ? { manager_onboarding_pending: true } : {}),
      },
    })
    if (updateError) {
      setBusy(false)
      setError(getUserFacingError(updateError, 'password'))
      return
    }

    if (userData.user?.id) {
      trackFirstLogin(userData.user.id, profileRole)
      console.info('[AcceptInvitePage] Compte activé — redirection vers', destination)
    }

    setBusy(false)
    navigate(destination, {
      replace: true,
      state: {
        message: 'Compte activé. Bienvenue !',
        ...(isNewManager ? { managerOnboarding: true } : {}),
      },
    })
  }

  const blocked = Boolean(hashError)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-navy-950 to-blue-950 p-4">
      <PageSeo
        description="Activation de compte Pedagogia Drive — lien d'invitation sécurisé."
        noindex
        path="/accept-invite"
        title={`Activation de compte — ${SITE_NAME}`}
      />
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <BrandLogo />
        <h1 className="mt-6 text-2xl font-semibold text-slate-950">Activer votre compte</h1>
        <p className="mt-2 text-sm text-slate-500">
          Définissez votre mot de passe pour accéder à PEDAGOGIA DRIVE.
        </p>

        {hashError && (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {hashError}
          </p>
        )}

        {!hashError && !ready && (
          <p className="mt-4 text-sm text-amber-700">
            Ouvrez le lien reçu par e-mail pour activer cette page. Si vous venez de cliquer le lien,
            patientez quelques secondes…
          </p>
        )}

        {!hashError && ready && userEmail && (
          <p className="mt-4 text-sm text-emerald-700">
            Compte trouvé : <strong>{userEmail}</strong>. Choisissez votre mot de passe.
          </p>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Nouveau mot de passe</span>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="Ex. Pedagogia1"
              disabled={blocked || !ready}
            />
            <span className="mt-1 block text-xs font-semibold text-slate-500">{PASSWORD_POLICY_HINT}</span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Confirmation</span>
            <input
              className={inputClass}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={blocked || !ready}
            />
          </label>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || blocked || !ready}
            className="pd-btn-primary w-full disabled:opacity-60"
          >
            {busy ? 'Enregistrement…' : 'Activer mon compte'}
          </button>
        </form>
        <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-blue-700">
          Déjà un compte ? Se connecter
        </Link>
      </div>
    </div>
  )
}
