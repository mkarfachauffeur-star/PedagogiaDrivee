import { useEffect, useState } from 'react'
import MfaSettings from '../../components/platform/MfaSettings'
import Notice from '../../components/ui/Notice'
import PageHeader from '../../components/ui/PageHeader'
import { ui } from '../../components/ui/styles'
import { fetchPlatformSettings, savePlatformSettings } from '../../services/platform'

export default function PlatformSettingsPage() {
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    fetchPlatformSettings().then(({ settings }) => {
      setAlertsEnabled(settings.notifications?.prospect_alerts !== false)
    })
  }, [])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    const { error } = await savePlatformSettings('notifications', { prospect_alerts: alertsEnabled })
    setSaving(false)
    if (error) {
      setFeedback({ type: 'error', message: error.message || 'Enregistrement impossible.' })
      return
    }
    setFeedback({ type: 'ok', message: 'Paramètres enregistrés.' })
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader description="Réglages de l’espace d’administration." title="Paramètres" />

      <MfaSettings />

      {feedback && <Notice tone={feedback.type === 'ok' ? 'success' : 'danger'}>{feedback.message}</Notice>}

      <form className={`${ui.card} ${ui.cardBody} space-y-5`} onSubmit={handleSave}>
        <div>
          <h2 className={ui.sectionTitle}>Notifications</h2>
          <label className="mt-4 flex items-start gap-3 text-sm text-slate-700">
            <input
              checked={alertsEnabled}
              className={`${ui.checkbox} mt-0.5`}
              onChange={(e) => setAlertsEnabled(e.target.checked)}
              type="checkbox"
            />
            <span>
              Signaler les nouvelles demandes de démonstration
              <span className={`block ${ui.hint}`}>
                Les e-mails automatiques envoyés à chaque demande nécessitent la variable{' '}
                <code className="rounded bg-slate-100 px-1 text-[11px]">RESEND_API_KEY</code> dans les Edge Functions
                Supabase.
              </span>
            </span>
          </label>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <button className={ui.btnPrimary} disabled={saving} type="submit">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
