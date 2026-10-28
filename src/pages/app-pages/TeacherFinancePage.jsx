import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'
import AppModal, { AppModalFooter } from '../../components/ui/AppModal'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { ui } from '../../components/ui/styles'
import { formatEuros } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import { getUserFacingError } from '../../lib/userFacingError'
import { listStudents } from '../../services/students'
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  PAYMENT_NATURES,
  contractsMap,
  createExpense,
  createPayment,
  fetchFinancialData,
  formatDateFr,
  formatEur,
  getStudentSummary,
  listVehicles,
  studentLabel,
  todayIso,
  vehicleLabel,
} from '../../services/finance'

const emptyPaymentForm = {
  studentId: '',
  nature: PAYMENT_NATURES[0],
  amount: '',
  date: todayIso(),
  method: PAYMENT_METHODS[0],
  comment: '',
}

const emptyExpenseForm = {
  category: EXPENSE_CATEGORIES[0],
  amount: '',
  date: todayIso(),
  vehicleId: '',
  comment: '',
}

export default function TeacherFinancePage() {
  const { profileId, organizationId } = useAuth()
  const [tab, setTab] = useState('expenses')
  const [students, setStudents] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [contractTotals, setContractTotals] = useState({})
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const [studentsRes, financeRes, vehiclesRes] = await Promise.all([
      listStudents(),
      fetchFinancialData(),
      listVehicles(),
    ])
    setStudents(studentsRes.students || [])
    setPayments(financeRes.payments)
    setExpenses(financeRes.expenses.filter((item) => item.created_by === profileId))
    setContractTotals(contractsMap(financeRes.contracts))
    setVehicles(vehiclesRes.vehicles || [])
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const myPayments = useMemo(
    () => payments.filter((item) => item.created_by === profileId),
    [payments, profileId],
  )

  const totals = useMemo(() => {
    const collected = myPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const spent = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return { collected, spent, net: collected - spent }
  }, [myPayments, expenses])

  const canSubmitPayment =
    Boolean(paymentForm.studentId) &&
    Number(paymentForm.amount) > 0 &&
    Boolean(paymentForm.date) &&
    Boolean(paymentForm.method)

  const canSubmitExpense =
    Number(expenseForm.amount) > 0 && Boolean(expenseForm.date) && Boolean(expenseForm.category)

  const savePayment = async (event) => {
    event.preventDefault()
    if (!canSubmitPayment || !organizationId || saving) return
    setSaving(true)
    setError(null)
    const { error: saveError } = await createPayment({
      organizationId,
      studentId: paymentForm.studentId,
      amount: paymentForm.amount,
      paidAt: paymentForm.date,
      method: paymentForm.method,
      nature: paymentForm.nature,
      comment: paymentForm.comment,
      createdBy: profileId,
    })
    setSaving(false)
    if (saveError) {
      setError(getUserFacingError(saveError, 'save'))
      return
    }
    setModal(null)
    setPaymentForm(emptyPaymentForm)
    refresh()
  }

  const saveExpense = async (event) => {
    event.preventDefault()
    if (!canSubmitExpense || !organizationId || saving) return
    setSaving(true)
    setError(null)
    const { error: saveError } = await createExpense({
      organizationId,
      category: expenseForm.category,
      amount: expenseForm.amount,
      spentAt: expenseForm.date,
      vehicleId: expenseForm.vehicleId || null,
      comment: expenseForm.comment,
      createdBy: profileId,
    })
    setSaving(false)
    if (saveError) {
      setError(getUserFacingError(saveError, 'save'))
      return
    }
    setModal(null)
    setExpenseForm(emptyExpenseForm)
    refresh()
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader
        actions={profileId ? (
          <>
            <button type="button" className={ui.btnSecondary} onClick={() => { setPaymentForm({ ...emptyPaymentForm, date: todayIso() }); setModal('payment') }} disabled={students.length === 0}>
              + Encaissement
            </button>
            <button type="button" className={ui.btnPrimary} onClick={() => { setExpenseForm({ ...emptyExpenseForm, date: todayIso() }); setModal('expense') }}>
              + Dépense
            </button>
          </>
        ) : null}
        description="Vos dépenses (carburant, etc.) et les paiements reçus de vos élèves. Le gérant les retrouve dans ses statistiques."
        title="Finances"
      />

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte enseignant." icon="💶" />
      ) : (
        <>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard accent="emerald" icon={ArrowDownLeft} label="Mes encaissements" value={formatEuros(totals.collected)} />
        <StatCard accent="rose" icon={ArrowUpRight} label="Mes dépenses" value={formatEuros(totals.spent)} />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            accent="blue"
            icon={Scale}
            label="Solde"
            tone={totals.net < 0 ? 'danger' : 'default'}
            value={formatEuros(totals.net)}
          />
        </div>
      </section>

      <div className="flex gap-2">
        <TabButton active={tab === 'expenses'} onClick={() => setTab('expenses')}>Mes dépenses</TabButton>
        <TabButton active={tab === 'payments'} onClick={() => setTab('payments')}>Mes encaissements</TabButton>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : tab === 'expenses' ? (
        <ListSection
          emptyTitle="Aucune dépense"
          emptyMessage="Enregistrez un plein de carburant ou autre frais."
          items={expenses}
          renderItem={(item) => (
            <article className="rounded-2xl border border-slate-300 bg-white p-4" key={item.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{item.category}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateFr(item.spent_at)}
                    {vehicleLabel(item.vehicles) ? ` · ${vehicleLabel(item.vehicles)}` : ''}
                  </p>
                </div>
                <p className="font-semibold text-rose-600">− {formatEur(item.amount)}</p>
              </div>
              {item.comment && <p className="mt-2 text-sm text-slate-500">{item.comment}</p>}
            </article>
          )}
        />
      ) : (
        <ListSection
          emptyTitle="Aucun encaissement"
          emptyMessage="Enregistrez un paiement reçu d'un élève."
          items={myPayments}
          renderItem={(item) => (
            <article className="rounded-2xl border border-slate-300 bg-white p-4" key={item.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{studentLabel(item.students)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDateFr(item.paid_at)} · {item.nature} · {item.method}
                  </p>
                </div>
                <p className="font-semibold text-emerald-600">+ {formatEur(item.amount)}</p>
              </div>
            </article>
          )}
        />
      )}

      <AppModal
        open={modal === 'expense'}
        onClose={() => setModal(null)}
        eyebrow="Finances"
        title="Nouvelle dépense"
        size="lg"
        footer={(
          <AppModalFooter
            onClose={() => setModal(null)}
            submitForm="teacher-expense-form"
            submitLabel={saving ? 'Enregistrement…' : 'Enregistrer'}
            submitDisabled={!canSubmitExpense || saving}
          />
        )}
      >
        <form id="teacher-expense-form" onSubmit={saveExpense} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Catégorie *" options={EXPENSE_CATEGORIES} value={expenseForm.category} onChange={(v) => setExpenseForm((c) => ({ ...c, category: v }))} />
          <Field label="Montant (€) *" type="number" value={expenseForm.amount} onChange={(v) => setExpenseForm((c) => ({ ...c, amount: v }))} />
          <Field label="Date *" type="date" value={expenseForm.date} onChange={(v) => setExpenseForm((c) => ({ ...c, date: v }))} />
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Véhicule</span>
            <select className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 px-4 text-sm" value={expenseForm.vehicleId} onChange={(e) => setExpenseForm((c) => ({ ...c, vehicleId: e.target.value }))}>
              <option value="">—</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>)}
            </select>
          </label>
          <Textarea label="Commentaire" value={expenseForm.comment} onChange={(v) => setExpenseForm((c) => ({ ...c, comment: v }))} />
        </form>
      </AppModal>

      <AppModal
        open={modal === 'payment'}
        onClose={() => setModal(null)}
        eyebrow="Finances"
        title="Nouvel encaissement"
        size="lg"
        footer={(
          <AppModalFooter
            onClose={() => setModal(null)}
            submitForm="teacher-payment-form"
            submitLabel={saving ? 'Enregistrement…' : 'Enregistrer'}
            submitDisabled={!canSubmitPayment || saving}
          />
        )}
      >
        <form id="teacher-payment-form" onSubmit={savePayment} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Élève *</span>
            <select
              className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 px-4 text-sm"
              value={paymentForm.studentId}
              onChange={(e) => setPaymentForm((c) => ({ ...c, studentId: e.target.value }))}
            >
              <option value="">Sélectionner…</option>
              {students.map((s) => {
                const summary = getStudentSummary(s.id, payments, contractTotals)
                return (
                  <option key={s.id} value={s.id}>
                    {studentLabel(s)} · reste {formatEur(summary.remaining)}
                  </option>
                )
              })}
            </select>
          </label>
          <Select label="Nature *" options={PAYMENT_NATURES} value={paymentForm.nature} onChange={(v) => setPaymentForm((c) => ({ ...c, nature: v }))} />
          <Select label="Mode *" options={PAYMENT_METHODS} value={paymentForm.method} onChange={(v) => setPaymentForm((c) => ({ ...c, method: v }))} />
          <Field label="Montant (€) *" type="number" value={paymentForm.amount} onChange={(v) => setPaymentForm((c) => ({ ...c, amount: v }))} />
          <Field label="Date *" type="date" value={paymentForm.date} onChange={(v) => setPaymentForm((c) => ({ ...c, date: v }))} />
          <Textarea label="Commentaire" value={paymentForm.comment} onChange={(v) => setPaymentForm((c) => ({ ...c, comment: v }))} />
        </form>
      </AppModal>
        </>
      )}
    </div>
  )
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold ${active ? 'bg-[#1769FF] text-white' : 'border border-slate-300 bg-white text-slate-600'}`}
    >
      {children}
    </button>
  )
}

function ListSection({ emptyTitle, emptyMessage, items, renderItem }) {
  return (
    <section className="grid gap-3">
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} icon="💶" />
      ) : (
        items.map(renderItem)
      )}
    </section>
  )
}

function Field({ label, type, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 px-4 text-sm" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="block sm:col-span-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Select({ label, options, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 px-4 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => <option key={opt}>{opt}</option>)}
      </select>
    </label>
  )
}
