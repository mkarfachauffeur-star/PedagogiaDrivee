import { useEffect, useState } from 'react'
import { fetchPlatformSaasMetrics, formatPlatformEur } from '../../services/platform'
import { useProspectNotifications } from '../../hooks/useProspectNotifications'
import PageHero from '../../components/ui/PageHero'
import { Link } from 'react-router-dom'

export default function PlatformDashboardPage() {
  const [metrics, setMetrics] = useState(null)
  const { newCount } = useProspectNotifications()

  useEffect(() => {
    fetchPlatformSaasMetrics().then(setMetrics)
  }, [])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHero
        eyebrow="Super Admin"
        title="Dashboard SaaS"
        subtitle="Revenus et abonnements Pedagogia Drive — aucune donnée élève."
      />

      {newCount > 0 && (
        <Link
          className="flex items-center justify-between rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
          to="/platform/prospects"
        >
          <span>{newCount} nouvelle{newCount > 1 ? 's' : ''} demande{newCount > 1 ? 's' : ''} de démonstration</span>
          <span className="text-amber-700">Voir les prospects →</span>
        </Link>
      )}

      {metrics && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Kpi hint="Revenu mensuel récurrent" label="MRR" value={formatPlatformEur(metrics.mrrCents, { fromCents: true })} />
          <Kpi hint="Revenu annuel récurrent" label="ARR" value={formatPlatformEur(metrics.arrCents, { fromCents: true })} />
          <Kpi label="Essais gratuits" value={metrics.trialCount} />
          <Kpi label="Clients Starter" value={metrics.starterCount} />
          <Kpi label="Clients Premium" value={metrics.premiumCount} />
          <Kpi label="Auto-écoles (total)" value={metrics.totalOrganizations} />
          <Kpi label="Paiements du mois" value={formatPlatformEur(metrics.monthlyPaidCents, { fromCents: true })} />
          <Kpi
            label="Paiements échoués"
            value={`${metrics.failedPayments} · ${formatPlatformEur(metrics.failedAmountCents, { fromCents: true })}`}
          />
          <Kpi
            label="Paiements en attente"
            value={`${metrics.pendingPayments} · ${formatPlatformEur(metrics.pendingAmountCents, { fromCents: true })}`}
          />
          <Kpi
            label="Revenu prévu mois prochain"
            value={formatPlatformEur(metrics.projectedNextMonthCents, { fromCents: true })}
          />
          <Kpi label="Conversion Essai → Client" value={`${metrics.conversionRate.toFixed(1)} %`} />
          <Kpi label="Churn" value={`${metrics.churnRate.toFixed(1)} %`} />
        </section>
      )}
    </div>
  )
}

function Kpi({ label, value, hint }) {
  return (
    <article className="rounded-2xl border-2 border-slate-300 bg-white p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      {hint && <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{hint}</p>}
      <p className="mt-2 text-2xl font-black text-cyan-700 xl:text-3xl">{value}</p>
    </article>
  )
}
