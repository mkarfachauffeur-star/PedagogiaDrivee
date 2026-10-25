import { useEffect, useState } from 'react'
import Notice from '../ui/Notice'
import StatusBadge from '../ui/StatusBadge'
import { ui } from '../ui/styles'
import { useConfirm } from '../ui/useConfirm'
import { formatDate } from '../../lib/format'
import { listVerifiedTotp, removeTotp, startTotpEnrollment, verifyTotp } from '../../services/mfa'

/** Activation et désactivation de la double authentification du compte Super Admin. */
export default function MfaSettings() {
  const [factors, setFactors] = useState(null)
  const [enrollment, setEnrollment] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [confirm, confirmDialog] = useConfirm()

  const refresh = () => listVerifiedTotp().then(({ factors: rows }) => setFactors(rows))

  useEffect(() => {
    refresh()
  }, [])

  const start = async () => {
    setBusy(true)
    setFeedback(null)
    const { enrollment: next, error } = await startTotpEnrollment()
    setBusy(false)
    if (error) {
      setFeedback({
        type: 'error',
        message: 'Activation impossible. Vérifiez que l’authentification TOTP est activée dans Supabase (Authentication → Multi-Factor).',
      })
      return
    }
    setCode('')
    setEnrollment(next)
  }

  const confirmEnrollment = async (event) => {
    event.preventDefault()
    setBusy(true)
    const { error } = await verifyTotp(enrollment.factorId, code)
    setBusy(false)
    if (error) {
      setFeedback({ type: 'error', message: 'Code incorrect. Saisissez le code affiché actuellement dans l’application.' })
      setCode('')
      return
    }
    setEnrollment(null)
    setFeedback({ type: 'ok', message: 'Double authentification activée. Le code sera demandé à chaque connexion.' })
    refresh()
  }

  const disable = async (factor) => {
    const ok = await confirm({
      title: 'Désactiver la double authentification ?',
      description: 'Le compte Super Admin ne sera plus protégé que par son mot de passe.',
      confirmLabel: 'Désactiver',
      danger: true,
      requireIdentity: true,
    })
    if (!ok) return
    const { error } = await removeTotp(factor.id)
    setFeedback(
      error
        ? { type: 'error', message: error.message || 'Désactivation impossible.' }
        : { type: 'ok', message: 'Double authentification désactivée.' },
    )
    refresh()
  }

  const active = factors?.[0]

  return (
    <section className={`${ui.card} ${ui.cardBody} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={ui.sectionTitle}>Double authentification</h2>
          <p className={ui.sectionText}>
            Un code à 6 chiffres, généré par une application (Google Authenticator, Microsoft Authenticator, 1Password…),
            est demandé à chaque connexion en plus du mot de passe.
          </p>
        </div>
        {factors ? (
          <StatusBadge tone={active ? 'success' : 'warning'}>{active ? 'Activée' : 'Désactivée'}</StatusBadge>
        ) : null}
      </div>

      {feedback && <Notice tone={feedback.type === 'ok' ? 'success' : 'danger'}>{feedback.message}</Notice>}

      {enrollment ? (
        <form className="grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-[auto_1fr]" onSubmit={confirmEnrollment}>
          <img alt="QR code à scanner avec l’application d’authentification" className="h-44 w-44 rounded-lg border border-slate-200 bg-white p-2" src={enrollment.qrCode} />
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>Scannez le QR code avec votre application d’authentification.</li>
              <li>Saisissez le code à 6 chiffres qu’elle affiche.</li>
            </ol>
            <p className="text-xs text-slate-500">
              Pas de caméra ? Saisissez cette clé dans l’application :{' '}
              <code className="break-all rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700">{enrollment.secret}</code>
            </p>
            <label className={ui.label}>
              Code de vérification
              <input
                autoComplete="one-time-code"
                className={`${ui.input} max-w-[12rem] text-center tracking-[0.3em]`}
                inputMode="numeric"
                maxLength={7}
                onChange={(event) => setCode(event.target.value.replace(/[^\d ]/g, ''))}
                value={code}
              />
            </label>
            <div className="flex gap-2">
              <button className={ui.btnPrimary} disabled={busy || code.replace(/\s/g, '').length !== 6} type="submit">
                {busy ? 'Vérification…' : 'Activer'}
              </button>
              <button className={ui.btnSecondary} onClick={() => setEnrollment(null)} type="button">
                Annuler
              </button>
            </div>
          </div>
        </form>
      ) : active ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600">
          <span>Activée le {formatDate(active.created_at)}</span>
          <button className={ui.btnSmallDanger} onClick={() => disable(active)} type="button">
            Désactiver
          </button>
        </div>
      ) : factors ? (
        <div className="border-t border-slate-100 pt-4">
          <button className={ui.btnPrimary} disabled={busy} onClick={start} type="button">
            {busy ? 'Préparation…' : 'Activer la double authentification'}
          </button>
        </div>
      ) : null}
      {confirmDialog}
    </section>
  )
}
