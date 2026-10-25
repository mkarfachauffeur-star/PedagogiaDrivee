import { useCallback, useEffect, useState } from 'react'
import Notice from '../../components/ui/Notice'
import PageHeader from '../../components/ui/PageHeader'
import { ui } from '../../components/ui/styles'
import { useConfirm } from '../../components/ui/useConfirm'
import { LANDING_OFFERS } from '../../components/marketing/landing/landingOffers'
import { formatPlatformEur } from '../../lib/platformPlans'
import { listPlatformPlans, updateSaasPlan } from '../../services/platform'

export default function PlatformPricingPage() {
  const [plans, setPlans] = useState([])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [confirm, confirmDialog] = useConfirm()

  const refresh = useCallback(async () => {
    const { plans: rows } = await listPlatformPlans()
    setPlans(rows)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSave = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const trialDays = Number(form.get('trial_days'))
    const starterEur = Number(form.get('starter_eur'))
    const premiumEur = Number(form.get('premium_eur'))

    const ok = await confirm({
      title: 'Enregistrer les nouveaux tarifs ?',
      description: `Essai ${trialDays} jours, Starter ${formatPlatformEur(starterEur)} par mois, Premium ${formatPlatformEur(premiumEur)} par mois. Ces prix s’appliquent aux prochaines factures.`,
      confirmLabel: 'Enregistrer',
      requireIdentity: true,
    })
    if (!ok) return
    setSaving(true)
    setFeedback(null)

    const trial = plans.find((p) => p.code === 'trial')
    const starter = plans.find((p) => p.code === 'starter')
    const premium = plans.find((p) => p.code === 'premium')

    const results = await Promise.all([
      trial ? updateSaasPlan(trial.id, { trial_days: trialDays }) : null,
      starter ? updateSaasPlan(starter.id, { price_cents: Math.round(starterEur * 100) }) : null,
      premium ? updateSaasPlan(premium.id, { price_cents: Math.round(premiumEur * 100) }) : null,
    ])

    setSaving(false)
    const failed = results.some((r) => r?.error)
    if (failed) {
      setFeedback({ type: 'error', message: 'Enregistrement partiel ou impossible. Vérifiez vos droits Super Admin.' })
    } else {
      setFeedback({ type: 'ok', message: 'Tarifs enregistrés.' })
    }
    refresh()
  }

  const trial = plans.find((p) => p.code === 'trial')
  const starter = plans.find((p) => p.code === 'starter')
  const premium = plans.find((p) => p.code === 'premium')

  // Les prix de la page d'accueil sont écrits dans landingOffers.js : on signale tout écart avec la base.
  const landingEuros = (id) => Number(String(LANDING_OFFERS.find((offer) => offer.id === id)?.price || '').replace(/[^\d,]/g, '').replace(',', '.'))
  const gaps = [
    { plan: starter, id: 'starter', name: 'Starter' },
    { plan: premium, id: 'premium', name: 'Premium' },
  ].filter(({ plan, id }) => plan && Number.isFinite(landingEuros(id)) && landingEuros(id) * 100 !== Number(plan.price_cents))

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        description="Prix facturés aux auto-écoles, enregistrés dans la table plans. Ils doivent rester identiques à ceux affichés sur la page d’accueil."
        title="Tarifs"
      />

      {feedback && <Notice tone={feedback.type === 'ok' ? 'success' : 'danger'}>{feedback.message}</Notice>}

      {gaps.length > 0 ? (
        <Notice tone="warning">
          La page d’accueil n’affiche pas les mêmes prix :{' '}
          {gaps
            .map(({ plan, id, name }) => `${name} ${formatPlatformEur(landingEuros(id))} sur le site, ${formatPlatformEur(plan.price_cents, { fromCents: true })} ici`)
            .join(' ; ')}
          . Les prix du site se modifient dans le fichier landingOffers.js, puis demandent une mise en ligne.
        </Notice>
      ) : plans.length > 0 ? (
        <Notice tone="success">Les prix sont identiques à ceux affichés sur la page d’accueil.</Notice>
      ) : null}

      <form className={`${ui.card} ${ui.cardBody} space-y-5`} onSubmit={handleSave}>
        <label className={ui.label}>
          Durée de l’essai gratuit (jours)
          <input className={ui.input} defaultValue={trial?.trial_days ?? 30} min={1} name="trial_days" required type="number" />
        </label>

        <label className={ui.label}>
          Starter, prix mensuel en euros
          <input
            className={ui.input}
            defaultValue={starter ? starter.price_cents / 100 : ''}
            min={0}
            name="starter_eur"
            required
            step="0.01"
            type="number"
          />
          <span className={`block ${ui.hint}`}>
            Engagement annuel.
            {starter ? ` Prix actuel : ${formatPlatformEur(starter.price_cents, { fromCents: true })} par mois.` : ''}
          </span>
        </label>

        <label className={ui.label}>
          Premium, prix mensuel en euros
          <input
            className={ui.input}
            defaultValue={premium ? premium.price_cents / 100 : ''}
            min={0}
            name="premium_eur"
            required
            step="0.01"
            type="number"
          />
          <span className={`block ${ui.hint}`}>
            Engagement annuel.
            {premium ? ` Prix actuel : ${formatPlatformEur(premium.price_cents, { fromCents: true })} par mois.` : ''}
          </span>
        </label>

        <div className="border-t border-slate-100 pt-5">
          <button className={ui.btnPrimary} disabled={saving || !plans.length} type="submit">
            {saving ? 'Enregistrement…' : 'Enregistrer les tarifs'}
          </button>
        </div>
      </form>
      {confirmDialog}
    </div>
  )
}
