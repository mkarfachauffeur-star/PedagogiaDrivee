import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import PageHero from '../../components/ui/PageHero'
import { useAuth } from '../../context/AuthContext'
import {
  fetchFinancialData,
  formatDateFr,
  formatEur,
  studentLabel,
  todayIso,
  vehicleLabel,
} from '../../services/finance'

function defaultDateFrom() {
  const now = new Date()
  return `${now.getFullYear()}-01-01`
}

export default function AdminPaymentsPage() {
  const { profileId } = useAuth()
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(todayIso())
  const [filterType, setFilterType] = useState('all')
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const filters = {
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    }
    const result = await fetchFinancialData(filters)
    if (result.error) setLoadError('Impossible de charger les transactions.')
    setPayments(result.payments)
    setExpenses(result.expenses)
    setSummary(result.summary)
    setLoading(false)
  }, [profileId, dateFrom, dateTo])

  useEffect(() => {
    refresh()
  }, [refresh])

  const ledger = useMemo(() => {
    const incomeRows = payments.map((item) => ({
      id: `p-${item.id}`,
      kind: 'income',
      date: item.paid_at,
      label: studentLabel(item.students),
      detail: item.nature,
      method: item.method,
      amount: Number(item.amount || 0),
    }))
    const expenseRows = expenses.map((item) => ({
      id: `e-${item.id}`,
      kind: 'expense',
      date: item.spent_at,
      label: item.category,
      detail: vehicleLabel(item.vehicles) || item.comment || '—',
      method: null,
      amount: Number(item.amount || 0),
    }))
    const merged = [...incomeRows, ...expenseRows].sort((a, b) => String(b.date).localeCompare(String(a.date)))
    if (filterType === 'income') return merged.filter((row) => row.kind === 'income')
    if (filterType === 'expense') return merged.filter((row) => row.kind === 'expense')
    return merged
  }, [payments, expenses, filterType])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        eyebrow="Finances"
        title="Paiements & dépenses"
        subtitle="Journal unifié des encaissements (secrétariat, enseignants) et sorties d'argent de l'auto-école."
      />

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte gérant." icon="💰" />
      ) : (
        <>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {loadError}
        </div>
      )}

      {summary && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Encaissements" value={formatEur(summary.totalIncome)} tone="cyan" />
          <Kpi label="Dépenses" value={formatEur(summary.totalExpenses)} tone="rose" />
          <Kpi label="Solde net" value={formatEur(summary.netBalance)} tone={summary.netBalance >= 0 ? 'cyan' : 'rose'} />
          <Kpi label="Reste à payer élèves" value={formatEur(summary.remaining)} tone="amber" />
        </section>
      )}

      <section className="rounded-[1.5rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterField label="Du" type="date" value={dateFrom} onChange={setDateFrom} />
            <FilterField label="Au" type="date" value={dateTo} onChange={setDateTo} />
            <FilterField
              label="Type"
              as="select"
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: 'all', label: 'Tout' },
                { value: 'income', label: 'Encaissements' },
                { value: 'expense', label: 'Dépenses' },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-xl font-extrabold text-slate-950">Journal des opérations</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Chargement…</p>
        ) : ledger.length === 0 ? (
          <EmptyState title="Aucune opération" message="Aucune transaction sur la période sélectionnée." icon="📒" />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-xs font-black uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Libellé</th>
                  <th className="py-3 pr-4">Détail</th>
                  <th className="py-3 pr-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr className="border-b-2 border-slate-200" key={row.id}>
                    <td className="py-3 pr-4 font-medium text-slate-600">{formatDateFr(row.date)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-black ${row.kind === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                      >
                        {row.kind === 'income' ? 'Entrée' : 'Sortie'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-bold text-slate-900">{row.label}</td>
                    <td className="py-3 pr-4 text-slate-500">
                      {row.detail}
                      {row.method ? ` · ${row.method}` : ''}
                    </td>
                    <td
                      className={`py-3 text-right font-black ${row.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {row.kind === 'income' ? '+' : '−'} {formatEur(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {summary && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BreakdownCard title="Encaissements par nature" items={summary.incomeByNature} tone="income" />
          <BreakdownCard title="Dépenses par catégorie" items={summary.expensesByCategory} tone="expense" />
        </section>
      )}
        </>
      )}
    </div>
  )
}

function Kpi({ label, tone = 'cyan', value }) {
  const color = tone === 'rose' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : 'text-cyan-600'
  return (
    <article className="rounded-[1.5rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </article>
  )
}

function FilterField({ label, type, value, onChange, as, options }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {as === 'select' ? (
        <select
          className="mt-2 min-h-11 w-full rounded-xl border-2 border-slate-300 px-3 text-sm font-medium text-slate-800"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          className="mt-2 min-h-11 w-full rounded-xl border-2 border-slate-300 px-3 text-sm font-medium text-slate-800"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}

function BreakdownCard({ title, items, tone }) {
  const entries = Object.entries(items || {}).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  const barColor = tone === 'income' ? 'bg-emerald-500' : 'bg-rose-500'

  return (
    <article className="rounded-[1.5rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-soft)]">
      <h3 className="text-lg font-extrabold text-slate-950">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aucune donnée sur la période.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          {entries.map(([label, amount]) => {
            const pct = total > 0 ? Math.round((amount / total) * 100) : 0
            return (
              <div key={label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-700">{label}</span>
                  <span className="font-black text-slate-900">{formatEur(amount)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}
