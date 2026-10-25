import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { formatNumber } from '../../lib/format'
import { formatPlatformDate, formatPlatformEur } from '../../lib/platformPlans'
import { listPlatformInvoices } from '../../services/platform'

const STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'En attente',
  paid: 'Payé',
  void: 'Annulé',
}

export default function PlatformPaymentsPage() {
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    listPlatformInvoices().then(({ invoices: rows }) => setInvoices(rows))
  }, [])

  const today = new Date().toISOString().slice(0, 10)

  const summary = useMemo(() => {
    const pending = invoices.filter((row) => row.status === 'sent')
    const failed = pending.filter((row) => row.due_at && row.due_at < today)
    const paid = invoices.filter((row) => row.status === 'paid')
    return {
      pendingCount: pending.length,
      failedCount: failed.length,
      paidCount: paid.length,
      pendingAmount: pending.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0),
      failedAmount: failed.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0),
      paidAmount: paid.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0),
    }
  }, [invoices, today])

  const eur = (cents) => formatPlatformEur(cents, { fromCents: true })
  const count = (n) => `${formatNumber(n)} facture${n > 1 ? 's' : ''}`

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        description="Factures d’abonnement émises aux auto-écoles. Les paiements des élèves n’apparaissent pas ici."
        title="Facturation"
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard accent="emerald" detail={count(summary.paidCount)} icon={CheckCircle2} label="Payées" tone={summary.paidCount > 0 ? 'success' : 'default'} value={eur(summary.paidAmount)} />
        <StatCard
          accent="amber"
          detail={count(summary.pendingCount)}
          icon={Clock}
          label="En attente"
          tone={summary.pendingCount > 0 ? 'warning' : 'default'}
          value={eur(summary.pendingAmount)}
        />
        <StatCard
          accent="rose"
          detail={count(summary.failedCount)}
          icon={AlertTriangle}
          label="En retard"
          tone={summary.failedCount > 0 ? 'danger' : 'default'}
          value={eur(summary.failedAmount)}
        />
      </section>

      <div className={ui.tableWrap}>
        <table className={`${ui.table} min-w-[880px]`}>
          <thead>
            <tr>
              <th className={ui.th}>N° de facture</th>
              <th className={ui.th}>Auto-école</th>
              <th className={ui.th}>Émise le</th>
              <th className={ui.th}>Échéance</th>
              <th className={ui.th}>Payée le</th>
              <th className={`${ui.th} text-right`}>Montant</th>
              <th className={ui.th}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td className={ui.tdEmpty} colSpan={7}>
                  Aucune facture d’abonnement pour le moment.
                </td>
              </tr>
            ) : (
              invoices.map((row) => {
                const isFailed = row.status === 'sent' && row.due_at && row.due_at < today
                const tone = isFailed ? 'danger' : row.status === 'paid' ? 'success' : row.status === 'sent' ? 'warning' : 'neutral'
                return (
                  <tr className={ui.tr} key={row.id}>
                    <td className={`${ui.td} font-mono text-xs`}>{row.invoice_number || '—'}</td>
                    <td className={ui.tdStrong}>{row.organization?.name || '—'}</td>
                    <td className={`${ui.tdMuted} tabular-nums`}>{formatPlatformDate(row.issued_at)}</td>
                    <td className={`${ui.tdMuted} tabular-nums`}>{formatPlatformDate(row.due_at)}</td>
                    <td className={`${ui.tdMuted} tabular-nums`}>{formatPlatformDate(row.paid_at)}</td>
                    <td className={ui.tdNumber}>{eur(row.amount_cents)}</td>
                    <td className={ui.td}>
                      <StatusBadge tone={tone}>{isFailed ? 'En retard' : STATUS_LABELS[row.status] || row.status}</StatusBadge>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
