import { useState } from 'react'
import AppModal from '../ui/AppModal'
import { supabase } from '../../lib/supabase'
import { getUserFacingError } from '../../lib/userFacingError'

const CONFIRM_WORD = 'SUPPRIMER'

export default function DeleteAccountModal({ open, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    if (submitting) return
    setConfirmText('')
    setError('')
    onClose()
  }

  const submit = async () => {
    setSubmitting(true)
    setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('delete-own-account', {
      body: { confirm: CONFIRM_WORD },
    })
    if (invokeError || data?.error) {
      let message = data?.error
      if (!message && invokeError?.context?.json) {
        message = (await invokeError.context.json().catch(() => null))?.error
      }
      setError(message || getUserFacingError(invokeError, 'save'))
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onDeleted()
  }

  const canSubmit = confirmText.trim().toUpperCase() === CONFIRM_WORD && !submitting

  return (
    <AppModal
      open={open}
      onClose={close}
      title="Supprimer mon compte"
      size="sm"
      disableClose={submitting}
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
            disabled={submitting}
            onClick={close}
            type="button"
          >
            Annuler
          </button>
          <button
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!canSubmit}
            onClick={submit}
            type="button"
          >
            {submitting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4 text-sm leading-6 text-slate-700">
        <p>
          Votre compte de connexion et votre profil seront supprimés définitivement. Vous ne pourrez plus vous
          connecter à Pedagogia Drive avec cette adresse e-mail.
        </p>
        <p>
          Les éléments que votre auto-école doit conserver (dossier de formation, leçons, paiements) restent
          gérés par l&apos;auto-école.
        </p>
        <label className="block font-semibold text-slate-900">
          Pour confirmer, saisissez {CONFIRM_WORD}
          <input
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            className="mt-2 block w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base"
            onChange={(event) => setConfirmText(event.target.value)}
            spellCheck={false}
            value={confirmText}
          />
        </label>
        {error && <p className="font-semibold text-red-700">{error}</p>}
      </div>
    </AppModal>
  )
}
