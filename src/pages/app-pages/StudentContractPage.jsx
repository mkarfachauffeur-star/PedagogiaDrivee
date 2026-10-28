import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import PageShell from '../../components/ui/PageShell'
import { useStudentAccount } from '../../hooks/useStudentAccount'
import { fetchStudentContractOverview, formatDateFr, formatEur } from '../../services/finance'

const CONTRACT_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  signed: 'Signé',
  cancelled: 'Annulé',
}

function SummaryCard({ hint, label, tone = 'default', value }) {
  const toneClass =
    tone === 'cyan'
      ? 'border-blue-200 bg-blue-50 text-blue-800'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : tone === 'emerald'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-slate-300 bg-white text-slate-950'

  return (
    <article className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs font-semibold text-slate-400">{hint}</p> : null}
    </article>
  )
}

export default function StudentContractPage() {
  const { student, loading: accountLoading } = useStudentAccount()
  const [overview, setOverview] = useState({ student: null, contract: null, payments: [] })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!student?.id) {
      setOverview({ student: null, contract: null, payments: [] })
      setLoading(false)
      return
    }
    setLoading(true)
    const data = await fetchStudentContractOverview(student.id)
    setOverview(data)
    setLoading(false)
  }, [student?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const formuleLabel =
    overview.student?.package_name ||
    overview.student?.formation_type ||
    student?.package_name ||
    student?.formation_type ||
    null

  const contractTotal = Number(overview.contract?.contract_total || 0)
  const totalPaid = overview.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const remaining = Math.max(contractTotal - totalPaid, 0)

  const hasFinancialData = contractTotal > 0 || overview.payments.length > 0
  const hasOverview = Boolean(formuleLabel || hasFinancialData)

  const contractStatus = useMemo(() => {
    const raw = overview.contract?.status
    return raw ? CONTRACT_STATUS_LABELS[raw] || raw : null
  }, [overview.contract?.status])

  if (accountLoading || loading) {
    return (
      <PageShell>
        <p className="text-sm font-semibold text-slate-500">Chargement de votre contrat…</p>
      </PageShell>
    )
  }

  if (!student?.id) {
    return (
      <PageShell>
        <EmptyState
          icon="📄"
          message="Votre dossier élève n'est pas encore disponible."
          title="Contrat"
        />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader description="Votre formule, vos heures et le récapitulatif financier." title="Contrat" />

      {!hasOverview ? (
        <section className="pd-section-card pd-section-card-body">
          <EmptyState
            icon="📄"
            message="Votre formule et vos paiements apparaîtront ici dès que le secrétariat aura finalisé votre inscription."
            title="Contrat"
          />
        </section>
      ) : (
        <>
          <section className="pd-section-card pd-section-card-body">
            <h2 className="text-xl font-semibold text-slate-950">Votre formule</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">Formule choisie</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{formuleLabel || '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">Permis visé</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {overview.student?.license_category || '—'}
                </p>
              </div>
              {Number(overview.student?.extra_hours) > 0 && (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">Heures supplémentaires</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {overview.student.extra_hours} h
                  </p>
                </div>
              )}
              {overview.student?.registration_date && (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">Date d'inscription</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {formatDateFr(overview.student.registration_date)}
                  </p>
                </div>
              )}
              {overview.student?.file_number && (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">N° de dossier</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{overview.student.file_number}</p>
                </div>
              )}
              {contractStatus && (
                <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-500">Statut du contrat</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{contractStatus}</p>
                  {overview.contract?.signed_at ? (
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Signé le {formatDateFr(overview.contract.signed_at)}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {hasFinancialData && (
            <section className="pd-section-card pd-section-card-body">
              <h2 className="text-xl font-semibold text-slate-950">Récapitulatif financier</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard
                  hint={contractTotal > 0 ? 'Montant total du forfait' : 'Non renseigné par le secrétariat'}
                  label="Montant du contrat"
                  value={contractTotal > 0 ? formatEur(contractTotal) : '—'}
                />
                <SummaryCard label="Total payé" tone="emerald" value={formatEur(totalPaid)} />
                <SummaryCard
                  hint={remaining > 0 ? 'Reste à régler' : 'Solde réglé'}
                  label="Reste à payer"
                  tone={remaining > 0 ? 'amber' : 'cyan'}
                  value={contractTotal > 0 ? formatEur(remaining) : '—'}
                />
              </div>
            </section>
          )}

          <section className="pd-section-card pd-section-card-body">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">Historique des paiements</h2>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {overview.payments.length} paiement(s)
              </span>
            </div>

            {overview.payments.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon="💳"
                message="Aucun paiement enregistré pour le moment."
                title="Aucun paiement"
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-xs font-semibold text-slate-400">
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Montant</th>
                      <th className="px-3 py-3">Nature</th>
                      <th className="px-3 py-3">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.payments.map((payment) => (
                      <tr className="border-b border-slate-200" key={payment.id}>
                        <td className="px-3 py-3 font-semibold text-slate-700">
                          {formatDateFr(payment.paid_at)}
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-950">
                          {formatEur(payment.amount)}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{payment.nature || '—'}</td>
                        <td className="px-3 py-3 text-slate-600">{payment.method || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </PageShell>
  )
}
