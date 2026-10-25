import { useCallback, useRef, useState } from 'react'
import { identityCheckMode, verifyIdentity } from '../../services/mfa'
import Dialog from './Dialog'
import { ui } from './styles'

/**
 * Confirmation avant une action : `await confirm({ title, description, confirmLabel, danger, requireText, requireIdentity })`.
 * `requireText` oblige à recopier un texte (le nom de l'auto-école) pour les suppressions définitives.
 * `requireIdentity` redemande le code de double authentification, ou le mot de passe si elle n'est pas activée.
 */
export function useConfirm() {
  const [options, setOptions] = useState(null)
  const [typed, setTyped] = useState('')
  const [secret, setSecret] = useState('')
  const [identity, setIdentity] = useState(null)
  const [checking, setChecking] = useState(false)
  const [identityError, setIdentityError] = useState('')
  const resolver = useRef(null)

  const confirm = useCallback((nextOptions) => {
    setTyped('')
    setSecret('')
    setIdentityError('')
    setIdentity(null)
    if (nextOptions?.requireIdentity) identityCheckMode().then(setIdentity)
    setOptions(nextOptions)
    return new Promise((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((answer) => {
    resolver.current?.(answer)
    resolver.current = null
    setOptions(null)
  }, [])

  const blocked =
    (Boolean(options?.requireText) && typed.trim() !== String(options.requireText).trim())
    || (Boolean(options?.requireIdentity) && (!identity || !secret))
    || checking

  const accept = async () => {
    if (options?.requireIdentity) {
      setChecking(true)
      setIdentityError('')
      const { ok } = await verifyIdentity(identity, secret)
      setChecking(false)
      if (!ok) {
        setIdentityError(identity?.mode === 'totp' ? 'Code incorrect ou expiré.' : 'Mot de passe incorrect.')
        setSecret('')
        return
      }
    }
    close(true)
  }

  const dialog = (
    <Dialog
      description={options?.description}
      footer={
        <>
          <button className={ui.btnSecondary} onClick={() => close(false)} type="button">
            Annuler
          </button>
          <button
            className={
              options?.danger
                ? 'inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50'
                : ui.btnPrimary
            }
            disabled={blocked}
            onClick={accept}
            type="button"
          >
            {checking ? 'Vérification…' : options?.confirmLabel || 'Confirmer'}
          </button>
        </>
      }
      onClose={() => close(false)}
      open={Boolean(options)}
      title={options?.title || ''}
    >
      {options?.requireText ? (
        <label className={ui.label}>
          Pour confirmer, saisissez <span className="font-semibold text-slate-900">{options.requireText}</span>
          <input autoComplete="off" className={ui.input} onChange={(event) => setTyped(event.target.value)} value={typed} />
        </label>
      ) : null}
      {options?.requireIdentity ? (
        <label className={`${ui.label} ${options?.requireText ? 'mt-4' : ''}`}>
          {identity?.mode === 'totp' ? 'Code de votre application d’authentification' : 'Votre mot de passe'}
          <input
            autoComplete={identity?.mode === 'totp' ? 'one-time-code' : 'current-password'}
            className={ui.input}
            inputMode={identity?.mode === 'totp' ? 'numeric' : undefined}
            onChange={(event) => setSecret(event.target.value)}
            type={identity?.mode === 'totp' ? 'text' : 'password'}
            value={secret}
          />
          {identityError ? (
            <span className="mt-1.5 block text-xs text-rose-700" role="alert">
              {identityError}
            </span>
          ) : null}
        </label>
      ) : null}
    </Dialog>
  )

  return [confirm, dialog]
}
