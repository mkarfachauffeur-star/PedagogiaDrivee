import { useCallback, useEffect, useMemo, useState } from 'react'
import Notice from '../../components/ui/Notice'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { TestDataToggle } from '../../components/ui/TableTools'
import { useConfirm } from '../../components/ui/useConfirm'
import { formatPlatformDate, formatPlatformEur } from '../../lib/platformPlans'
import {
  cancelSubscription,
  listAllSubscriptions,
  listPlatformPlans,
  reactivateSubscription,
  suspendSubscription,
  updateSubscriptionBySuperAdmin,
} from '../../services/platform'

const OFFER_TONE = {
  Essai: 'info',
  Starter: 'neutral',
  Premium: 'neutral',
}

const STATUS_TONE = {
  Actif: 'success',
  Suspendu: 'warning',
  Résilié: 'neutral',
  'Paiement échoué': 'danger',
}

const PLAN_NAMES = { starter: 'Starter', premium: 'Premium' }

const PAYMENT_METHODS = ['Virement', 'Carte bancaire', 'Prélèvement SEPA', 'Chèque', 'Autre']

export default function PlatformSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [showTest, setShowTest] = useState(false)
  const [confirm, confirmDialog] = useConfirm()

  const refresh = useCallback(async () => {
    setLoading(true)
    const [subsRes, plansRes] = await Promise.all([listAllSubscriptions(), listPlatformPlans()])
    setSubscriptions(subsRes.subscriptions)
    setPlans(plansRes.plans.filter((p) => p.code !== 'trial'))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSuspend = async (row) => {
    const ok = await confirm({
      title: `Suspendre « ${row.organization?.name} » ?`,
      description: 'Les comptes de l’auto-école ne pourront plus se connecter jusqu’à la réactivation.',
      confirmLabel: 'Suspendre',
      danger: true,
    })
    if (!ok) return
    await suspendSubscription(row.id, row.organization.id)
    refresh()
  }

  const handleReactivate = async (row) => {
    await reactivateSubscription(row.id, row.organization.id)
    refresh()
  }

  const handleCancel = async (row) => {
    const ok = await confirm({
      title: `Résilier l’abonnement de « ${row.organization?.name} » ?`,
      description: 'L’abonnement et l’auto-école passeront au statut « Résilié ». Vous pourrez les réactiver plus tard.',
      confirmLabel: 'Résilier',
      danger: true,
      requireIdentity: true,
    })
    if (!ok) return
    await cancelSubscription(row.id, row.organization.id)
    refresh()
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!editing) return
    const form = new FormData(event.currentTarget)
    const planCode = form.get('planCode') || undefined
    const payload = {
      planCode,
      trialEndsAt: form.get('trialEndsAt') || null,
      currentPeriodEnd: form.get('currentPeriodEnd') || null,
      paymentMethod: form.get('paymentMethod') || null,
      isTest: form.get('isTest') === 'on',
    }
    if (planCode && planCode !== 'trial') {
      payload.status = 'active'
    }
    const { error } = await updateSubscriptionBySuperAdmin(editing.id, payload)
    if (error) {
      setFeedback({ type: 'error', message: error.message || 'Enregistrement impossible.' })
      return
    }
    setFeedback({ type: 'ok', message: 'Abonnement mis à jour.' })
    setEditing(null)
    refresh()
  }

  const testCount = useMemo(() => subscriptions.filter((row) => row.isTest).length, [subscriptions])
  const visible = useMemo(
    () => (showTest ? subscriptions : subscriptions.filter((row) => !row.isTest)),
    [subscriptions, showTest],
  )

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <PageHeader
        description="Abonnements des auto-écoles clientes. Les montants viennent de la page Tarifs."
        title="Abonnements"
      />

      {feedback && <Notice tone={feedback.type === 'ok' ? 'success' : 'danger'}>{feedback.message}</Notice>}

      {testCount > 0 && (
        <div className="flex justify-end">
          <TestDataToggle checked={showTest} count={testCount} onChange={setShowTest} />
        </div>
      )}

      <div className={ui.tableWrap}>
        <table className={`${ui.table} min-w-[1240px]`}>
          <thead>
            <tr>
              <th className={ui.th}>Auto-école</th>
              <th className={ui.th}>Gérant</th>
              <th className={ui.th}>Offre</th>
              <th className={ui.th}>Début</th>
              <th className={ui.th}>Fin d’essai ou de période</th>
              <th className={ui.th}>Prochaine facture</th>
              <th className={`${ui.th} text-right`}>Montant</th>
              <th className={ui.th}>Statut</th>
              <th className={`${ui.th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className={ui.tdEmpty} colSpan={9}>
                  Chargement…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td className={ui.tdEmpty} colSpan={9}>
                  Aucun abonnement.
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr className={ui.tr} key={row.id}>
                  <td className={`${ui.tdStrong} min-w-[12rem]`}>
                    {row.organization?.name || '—'}
                    {row.isTest && (
                      <span className="ml-2 align-middle">
                        <StatusBadge>Test</StatusBadge>
                      </span>
                    )}
                  </td>
                  <td className={ui.td}>
                    <p className="text-slate-900">{row.managerName}</p>
                    <p className="text-xs text-slate-500">{row.managerEmail}</p>
                  </td>
                  <td className={ui.td}>
                    <StatusBadge tone={OFFER_TONE[row.offer] || 'neutral'}>{row.offer}</StatusBadge>
                    {row.offer === 'Essai' && PLAN_NAMES[row.requestedPlan] ? (
                      <p className="mt-1 text-xs text-slate-500">Demandée : {PLAN_NAMES[row.requestedPlan]}</p>
                    ) : null}
                  </td>
                  <td className={`${ui.tdMuted} tabular-nums`}>{formatPlatformDate(row.trialStartAt)}</td>
                  <td className={`${ui.tdMuted} tabular-nums`}>{formatPlatformDate(row.trialEndAt || row.current_period_end)}</td>
                  <td className={`${ui.tdMuted} tabular-nums`}>{formatPlatformDate(row.nextBillingAt)}</td>
                  <td className={ui.tdNumber}>
                    {row.amountCents > 0 ? formatPlatformEur(row.amountCents, { fromCents: true }) : '—'}
                  </td>
                  <td className={ui.td}>
                    <StatusBadge tone={STATUS_TONE[row.billingStatus] || 'neutral'}>{row.billingStatus}</StatusBadge>
                  </td>
                  <td className={ui.td}>
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <button className={ui.btnSmall} onClick={() => setEditing(row)} type="button">
                        Modifier
                      </button>
                      {row.billingStatus === 'Suspendu' || row.billingStatus === 'Résilié' ? (
                        <button className={ui.btnSmall} onClick={() => handleReactivate(row)} type="button">
                          Réactiver
                        </button>
                      ) : (
                        <button className={ui.btnSmall} onClick={() => handleSuspend(row)} type="button">
                          Suspendre
                        </button>
                      )}
                      {row.billingStatus !== 'Résilié' && (
                        <button className={ui.btnSmallDanger} onClick={() => handleCancel(row)} type="button">
                          Résilier
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
          <form
            aria-labelledby="subscription-edit-title"
            className={`w-full max-w-md ${ui.card} ${ui.cardBody} shadow-xl`}
            onSubmit={handleSave}
            role="dialog"
          >
            <h2 className={ui.sectionTitle} id="subscription-edit-title">
              Modifier l’abonnement
            </h2>
            <p className={ui.sectionText}>{editing.organization?.name}</p>
            <div className="mt-5 space-y-4">
              <label className={ui.label}>
                Offre
                <select
                  className={ui.input}
                  defaultValue={editing.plan?.code === 'monthly' ? 'starter' : editing.plan?.code || 'trial'}
                  name="planCode"
                >
                  <option value="trial">Essai</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name} · {formatPlatformEur(plan.price_cents, { fromCents: true })} par mois
                    </option>
                  ))}
                </select>
                {editing.offer === 'Essai' && PLAN_NAMES[editing.requestedPlan] ? (
                  <span className={`block ${ui.hint}`}>
                    Offre demandée par l’auto-école : {PLAN_NAMES[editing.requestedPlan]}.
                  </span>
                ) : null}
              </label>
              <label className={ui.label}>
                Fin de l’essai
                <input className={ui.input} defaultValue={editing.trialEndAt?.slice(0, 10) || ''} name="trialEndsAt" type="date" />
              </label>
              <label className={ui.label}>
                Prochaine facture
                <input
                  className={ui.input}
                  defaultValue={editing.nextBillingAt?.slice(0, 10) || ''}
                  name="currentPeriodEnd"
                  type="date"
                />
              </label>
              <label className={ui.label}>
                Moyen de paiement
                <select
                  className={ui.input}
                  defaultValue={editing.paymentMethod === '—' ? '' : editing.paymentMethod}
                  name="paymentMethod"
                >
                  <option value="">Non renseigné</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input className={`${ui.checkbox} mt-0.5`} defaultChecked={editing.isTest} name="isTest" type="checkbox" />
                <span>
                  Compte de test ou de démonstration
                  <span className={`block ${ui.hint}`}>Exclu des indicateurs du tableau de bord et masqué des listes.</span>
                </span>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5">
              <button className={ui.btnSecondary} onClick={() => setEditing(null)} type="button">
                Annuler
              </button>
              <button className={ui.btnPrimary} type="submit">
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
      {confirmDialog}
    </div>
  )
}
