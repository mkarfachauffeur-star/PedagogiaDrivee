import { useEffect, useMemo, useState } from 'react'
import PageHero from '../../components/ui/PageHero'
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHero
        eyebrow="Super Admin"
        title="Facturation SaaS"
        subtitle="Factures d'abonnement Pedagogia Drive émises aux auto-écoles — hors paiements élèves."
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Payées"
          count={summary.paidCount}
          amount={formatPlatformEur(summary.paidAmount, { fromCents: true })}
        />
        <SummaryCard
          label="En attente"
          count={summary.pendingCount}
          amount={formatPlatformEur(summary.pendingAmount, { fromCents: true })}
        />
        <SummaryCard
          label="Échouées / en retard"
          count={summary.failedCount}
          amount={formatPlatformEur(summary.failedAmount, { fromCents: true })}
          tone="rose"
        />
      </section>

      <div className="overflow-x-auto rounded-2xl border-2 border-slate-300 bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs font-black uppercase text-slate-400">
              <th className="p-4">Émission</th>
              <th className="p-4">Échéance</th>
              <th className="p-4">Auto-école</th>
              <th className="p-4">N° facture</th>
              <th className="p-4">Montant</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Payée le</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td className="p-6 text-slate-500" colSpan={7}>
                  Aucune facture SaaS enregistrée.
                </td>
              </tr>
            ) : (
              invoices.map((row) => {
                const isFailed = row.status === 'sent' && row.due_at && row.due_at < today
                return (
                  <tr className="border-b" key={row.id}>
                    <td className="p-4">{formatPlatformDate(row.issued_at)}</td>
                    <td className="p-4">{formatPlatformDate(row.due_at)}</td>
                    <td className="p-4 font-bold">{row.organization?.name || '—'}</td>
                    <td className="p-4">{row.invoice_number || '—'}</td>
                    <td className="p-4 font-bold text-cyan-700">
                      {formatPlatformEur(row.amount_cents, { fromCents: true })}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                          isFailed
                            ? 'bg-rose-100 text-rose-800'
                            : row.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {isFailed ? 'Échoué / retard' : STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>
                    <td className="p-4">{formatPlatformDate(row.paid_at)}</td>
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

function SummaryCard({ label, count, amount, tone = 'cyan' }) {
  const toneClass = tone === 'rose' ? 'text-rose-700' : 'text-cyan-700'
  return (
    <article className="rounded-2xl border-2 border-slate-300 bg-white p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${toneClass}`}>{amount}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">{count} facture{count > 1 ? 's' : ''}</p>
    </article>
  )
}
