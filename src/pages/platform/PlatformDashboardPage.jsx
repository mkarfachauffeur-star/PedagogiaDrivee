import { useEffect, useState } from 'react'
import { AlertTriangle, Banknote, Building2, CalendarRange, Clock, Gem, Hourglass, LineChart, Package, Percent, TrendingUp, UserMinus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchPlatformSaasMetrics, formatPlatformEur } from '../../services/platform'
import { useProspectNotifications } from '../../hooks/useProspectNotifications'
import { formatNumber, formatPercent } from '../../lib/format'
import Notice from '../../components/ui/Notice'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'

const eur = (cents) => formatPlatformEur(cents, { fromCents: true })
const invoices = (count) => `${formatNumber(count)} facture${count > 1 ? 's' : ''}`

const GROUP_DOTS = { emerald: 'bg-emerald-500', blue: 'bg-[#1769FF]', amber: 'bg-amber-500' }

function StatGroup({ title, color, children }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${GROUP_DOTS[color]}`} />
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{children}</div>
    </section>
  )
}

export default function PlatformDashboardPage() {
  const [metrics, setMetrics] = useState(null)
  const { newCount } = useProspectNotifications()

  useEffect(() => {
    fetchPlatformSaasMetrics().then(setMetrics)
  }, [])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        description="Revenus, clients et paiements de Pedagogia Drive. Aucune donnée d’élève n’apparaît ici."
        title="Tableau de bord"
      />

      {newCount > 0 && (
        <Notice
          action={
            <Link className="text-amber-900 underline-offset-4 hover:underline" to="/platform/prospects">
              Voir les demandes
            </Link>
          }
          tone="warning"
        >
          {newCount} nouvelle{newCount > 1 ? 's' : ''} demande{newCount > 1 ? 's' : ''} de démonstration à traiter.
        </Notice>
      )}

      {metrics?.testOrganizationCount > 0 && (
        <p className="-mt-4 text-xs text-slate-500">
          {metrics.testOrganizationCount} auto-école{metrics.testOrganizationCount > 1 ? 's' : ''} de test ou de démonstration
          {metrics.testOrganizationCount > 1 ? ' sont exclues' : ' est exclue'} de ces chiffres.{' '}
          <Link className="text-[#1769FF] hover:underline" to="/platform/subscriptions">
            Gérer les comptes de test
          </Link>
        </p>
      )}

      {!metrics ? (
        <p className="text-sm text-slate-500">Chargement des indicateurs…</p>
      ) : (
        <>
          <StatGroup color="emerald" title="Revenus">
            <StatCard accent="emerald" detail="MRR, abonnements en cours" icon={TrendingUp} label="Revenu mensuel récurrent" value={eur(metrics.mrrCents)} />
            <StatCard accent="emerald" detail="ARR, sur douze mois" icon={CalendarRange} label="Revenu annuel récurrent" value={eur(metrics.arrCents)} />
            <StatCard accent="emerald" icon={Banknote} label="Encaissé ce mois" value={eur(metrics.monthlyPaidCents)} />
            <StatCard accent="emerald" detail="MRR et essais susceptibles de convertir" icon={LineChart} label="Revenu prévu le mois prochain" value={eur(metrics.projectedNextMonthCents)} />
          </StatGroup>

          <StatGroup color="blue" title="Clients">
            <StatCard accent="blue" icon={Building2} label="Auto-écoles" value={formatNumber(metrics.totalOrganizations)} />
            <StatCard accent="sky" icon={Hourglass} label="En essai gratuit" value={formatNumber(metrics.trialCount)} />
            <StatCard accent="blue" icon={Package} label="Offre Starter" value={formatNumber(metrics.starterCount)} />
            <StatCard accent="violet" icon={Gem} label="Offre Premium" value={formatNumber(metrics.premiumCount)} />
          </StatGroup>

          <StatGroup color="amber" title="Paiements et fidélité">
            <StatCard
              accent="amber"
              detail={invoices(metrics.pendingPayments)}
              icon={Clock}
              label="Paiements en attente"
              tone={metrics.pendingPayments > 0 ? 'warning' : 'default'}
              value={eur(metrics.pendingAmountCents)}
            />
            <StatCard
              accent="rose"
              detail={invoices(metrics.failedPayments)}
              icon={AlertTriangle}
              label="Paiements échoués"
              tone={metrics.failedPayments > 0 ? 'danger' : 'default'}
              value={eur(metrics.failedAmountCents)}
            />
            <StatCard accent="violet" detail="Essais devenus clients" icon={Percent} label="Taux de conversion" value={formatPercent(metrics.conversionRate)} />
            <StatCard accent="slate" detail="Résiliations sur 30 jours" icon={UserMinus} label="Taux de résiliation" value={formatPercent(metrics.churnRate)} />
          </StatGroup>
        </>
      )}
    </div>
  )
}
