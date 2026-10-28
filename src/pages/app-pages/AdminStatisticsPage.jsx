import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import PageHero from '../../components/ui/PageHero'
import { useAuth } from '../../context/AuthContext'
import { PAYMENT_NATURES, formatEur } from '../../services/finance'
import { fetchProfitabilityDashboard } from '../../services/profitability'

export default function AdminStatisticsPage() {
  const { profileId, organizationId } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    if (!profileId || !organizationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const { dashboard: data, error } = await fetchProfitabilityDashboard({ organizationId })
    if (error) setLoadError('Impossible de charger le tableau de bord.')
    setDashboard(data)
    setLoading(false)
  }, [profileId, organizationId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const revenueTotal = dashboard
    ? Object.values(dashboard.revenueByNature || {}).reduce((sum, value) => sum + value, 0)
    : 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        title="Évolution du CA"
        subtitle="Chiffre d'affaires, élèves actifs, heures réalisées et reste à encaisser de votre auto-école."
      />

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte gérant." icon="📈" />
      ) : loading ? (
        <p className="text-sm text-slate-500">Chargement du tableau de bord…</p>
      ) : loadError ? (
        <EmptyState title="Erreur de chargement" message={loadError} icon="⚠️" />
      ) : dashboard ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Kpi label="CA mensuel" value={formatEur(dashboard.monthlyRevenue)} tone="cyan" />
            <Kpi label="CA annuel" value={formatEur(dashboard.annualRevenue)} tone="cyan" />
            <Kpi label="Élèves actifs" value={String(dashboard.activeStudents)} tone="indigo" />
            <Kpi label="Heures réalisées" value={`${dashboard.hoursCompleted} h`} tone="violet" />
            <Kpi label="Panier moyen / élève" value={formatEur(dashboard.averageBasket)} tone="emerald" />
            <Kpi label="Restant à encaisser" value={formatEur(dashboard.remainingToCollect)} tone="amber" />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-950">Évolution du chiffre d'affaires</h2>
            <p className="mt-1 text-sm text-slate-500">Encaissements des 12 derniers mois.</p>
            {dashboard.monthlyTrend.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Aucun encaissement enregistré.</p>
            ) : (
              <div className="mt-6 grid gap-4">
                {dashboard.monthlyTrend.map((row) => (
                  <div key={row.month}>
                    <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-slate-800">{row.label}</span>
                      <span className="font-semibold text-blue-700">{formatEur(row.revenue)}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-300"
                        style={{ width: `${Math.round((row.revenue / dashboard.maxMonthly) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-slate-950">Répartition des revenus</h2>
            <p className="mt-1 text-sm text-slate-500">Par nature d'encaissement enregistrée.</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PAYMENT_NATURES.map((nature) => {
                const amount = dashboard.revenueByNature?.[nature] || 0
                const pct = revenueTotal > 0 ? Math.round((amount / revenueTotal) * 100) : 0
                return (
                  <div key={nature} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">{nature}</p>
                    <p className={`mt-1 text-lg font-semibold ${amount > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {formatEur(amount)}
                    </p>
                    {amount > 0 && <p className="text-xs text-slate-400">{pct} % du total</p>}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-500">Total encaissé</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">{formatEur(dashboard.totalCollected)}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-500">Montant contractuel total</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{formatEur(dashboard.contractTotal)}</p>
            </article>
          </section>
        </>
      ) : null}
    </div>
  )
}

function Kpi({ label, value, tone = 'cyan' }) {
  const colors = {
    cyan: 'text-blue-600',
    indigo: 'text-indigo-600',
    violet: 'text-violet-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  }
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${colors[tone] || colors.cyan}`}>{value}</p>
    </article>
  )
}
