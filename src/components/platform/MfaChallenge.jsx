import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ui } from '../ui/styles'
import { useAuth } from '../../context/AuthContext'
import { listVerifiedTotp, verifyTotp } from '../../services/mfa'

/** Demande le code de l'application d'authentification avant d'ouvrir l'espace Super Admin. */
export default function MfaChallenge({ onVerified }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [factorId, setFactorId] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listVerifiedTotp().then(({ factors }) => setFactorId(factors[0]?.id || null))
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (!factorId) return
    setBusy(true)
    setError('')
    const { error: verifyError } = await verifyTotp(factorId, code)
    setBusy(false)
    if (verifyError) {
      setError('Code incorrect ou expiré. Saisissez le code affiché actuellement dans votre application.')
      setCode('')
      return
    }
    onVerified()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4">
      <form className={`w-full max-w-sm ${ui.card} ${ui.cardBody}`} onSubmit={submit}>
        <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl bg-[#1769FF] text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Vérification en deux étapes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Saisissez le code à 6 chiffres affiché dans votre application d’authentification.
        </p>
        <label className={`${ui.label} mt-5`}>
          Code
          <input
            autoComplete="one-time-code"
            autoFocus
            className={`${ui.input} text-center text-lg tracking-[0.4em]`}
            inputMode="numeric"
            maxLength={7}
            onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, ''))}
            pattern="[0-9 ]*"
            value={code}
          />
        </label>
        {error ? (
          <p className="mt-3 text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        <button className={`${ui.btnPrimary} mt-5 w-full`} disabled={busy || code.replace(/\s/g, '').length !== 6 || !factorId} type="submit">
          {busy ? 'Vérification…' : 'Valider'}
        </button>
        <button
          className="mt-3 w-full text-center text-sm text-slate-500 hover:text-slate-900"
          onClick={async () => {
            await signOut()
            navigate('/login', { replace: true })
          }}
          type="button"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  )
}
