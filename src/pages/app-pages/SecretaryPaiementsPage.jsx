import { useCallback, useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState'
import AppModal, { AppModalFooter } from '../../components/ui/AppModal'
import ListSearchField from '../../components/ui/ListSearchField'
import PaginationBar from '../../components/ui/PaginationBar'
import PageHero from '../../components/ui/PageHero'
import { useAuth } from '../../context/AuthContext'
import { matchStudentSearch, useClientPagination } from '../../hooks/useClientPagination'
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
  upsertContract,
  vehicleLabel,
} from '../../services/finance'

const emptyPaymentForm = {
  studentId: '',
  nature: PAYMENT_NATURES[0],
  amount: '',
  date: todayIso(),
  method: PAYMENT_METHODS[0],
  comment: '',
  contractTotal: '',
}

const emptyExpenseForm = {
  category: EXPENSE_CATEGORIES[0],
  amount: '',
  date: todayIso(),
  vehicleId: '',
  comment: '',
}

export default function SecretaryPaiementsPage() {
  const { profileId, organizationId } = useAuth()
  const [tab, setTab] = useState('payments')
  const [students, setStudents] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [contractTotals, setContractTotals] = useState({})
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [modal, setModal] = useState(null)
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm)
  const [saving, setSaving] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  const refresh = useCallback(async () => {
    if (!profileId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const [studentsRes, financeRes, vehiclesRes] = await Promise.all([
      listStudents(),
      fetchFinancialData(),
      listVehicles(),
    ])
    if (studentsRes.error || financeRes.error) {
      setLoadError('Impossible de charger les données financières.')
    }
    setStudents(studentsRes.students || [])
    setPayments(financeRes.payments)
    setExpenses(financeRes.expenses)
    setContractTotals(contractsMap(financeRes.contracts))
    setVehicles(vehiclesRes.vehicles || [])
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const totals = useMemo(() => {
    const paid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const spent = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const remaining = students.reduce(
      (sum, student) => sum + getStudentSummary(student.id, payments, contractTotals).remaining,
      0,
    )
    return { paid, spent, remaining, net: paid - spent, paymentCount: payments.length, expenseCount: expenses.length }
  }, [payments, expenses, students, contractTotals])

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0] || null
  const selectedSummary = selectedStudent
    ? getStudentSummary(selectedStudent.id, payments, contractTotals)
    : { contractTotal: 0, paid: 0, remaining: 0 }
  const selectedHistory = selectedStudent
    ? payments.filter((item) => item.student_id === selectedStudent.id)
    : []

  const {
    page: studentPage,
    setPage: setStudentPage,
    totalPages: studentTotalPages,
    totalItems: studentTotalItems,
    pageItems: studentPageItems,
    pageSize: studentPageSize,
  } = useClientPagination(students, {
    pageSize: 8,
    query: studentSearchQuery,
    filterFn: matchStudentSearch,
  })

  const {
    page: historyPage,
    setPage: setHistoryPage,
    totalPages: historyTotalPages,
    totalItems: historyTotalItems,
    pageItems: historyPageItems,
    pageSize: historyPageSize,
  } = useClientPagination(selectedHistory, { pageSize: 5 })

  const {
    page: expensePage,
    setPage: setExpensePage,
    totalPages: expenseTotalPages,
    totalItems: expenseTotalItems,
    pageItems: expensePageItems,
    pageSize: expensePageSize,
  } = useClientPagination(expenses, { pageSize: 8 })

  const paymentFormSummary = useMemo(() => {
    const base = paymentForm.studentId
      ? getStudentSummary(paymentForm.studentId, payments, contractTotals)
      : { contractTotal: 0, paid: 0 }
    const contractTotal =
      paymentForm.contractTotal !== ''
        ? Number(paymentForm.contractTotal) || 0
        : base.contractTotal
    const alreadyPaid = base.paid
    const remainingBefore = Math.max(contractTotal - alreadyPaid, 0)
    const remainingAfter = Math.max(contractTotal - alreadyPaid - Number(paymentForm.amount || 0), 0)
    return { contractTotal, alreadyPaid, remainingBefore, remainingAfter }
  }, [paymentForm, payments, contractTotals])

  const openPaymentForm = () => {
    const presetId = selectedStudent?.id || ''
    const presetContract = presetId ? getStudentSummary(presetId, payments, contractTotals).contractTotal : 0
    setPaymentForm({
      ...emptyPaymentForm,
      date: todayIso(),
      studentId: presetId,
      contractTotal: presetContract ? String(presetContract) : '',
    })
    setModal('payment')
  }

  const openExpenseForm = () => {
    setExpenseForm({ ...emptyExpenseForm, date: todayIso() })
    setModal('expense')
  }

  const handleSelectStudentInForm = (studentId) => {
    const summary = studentId ? getStudentSummary(studentId, payments, contractTotals) : { contractTotal: 0 }
    setPaymentForm((current) => ({
      ...current,
      studentId,
      contractTotal: summary.contractTotal ? String(summary.contractTotal) : '',
    }))
  }

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
    if (paymentForm.contractTotal !== '') {
      await upsertContract({
        organizationId,
        studentId: paymentForm.studentId,
        contractTotal: paymentForm.contractTotal,
      })
    }
    const { error } = await createPayment({
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
    if (error) {
      setLoadError(getUserFacingError(error, 'save'))
      return
    }
    setSelectedStudentId(paymentForm.studentId)
    setModal(null)
    setPaymentForm(emptyPaymentForm)
    refresh()
  }

  const saveExpense = async (event) => {
    event.preventDefault()
    if (!canSubmitExpense || !organizationId || saving) return
    setSaving(true)
    const { error } = await createExpense({
      organizationId,
      category: expenseForm.category,
      amount: expenseForm.amount,
      spentAt: expenseForm.date,
      vehicleId: expenseForm.vehicleId || null,
      comment: expenseForm.comment,
      createdBy: profileId,
    })
    setSaving(false)
    if (error) {
      setLoadError(getUserFacingError(error, 'save'))
      return
    }
    setModal(null)
    setExpenseForm(emptyExpenseForm)
    refresh()
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        eyebrow="Finances"
        title="Encaissements & dépenses"
        subtitle="Entrées d'argent (inscriptions, forfaits, code…) et sorties (carburant, frais…) centralisées pour le gérant."
        actions={profileId ? (
          <>
            <button
              className="rounded-2xl bg-blue-300 px-5 py-3 text-sm font-semibold text-navy-950 shadow-xl transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={openPaymentForm}
              type="button"
              disabled={students.length === 0}
            >
              + Encaissement
            </button>
            <button
              className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-white/20"
              onClick={openExpenseForm}
              type="button"
            >
              + Dépense
            </button>
          </>
        ) : null}
      />

      {!profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte secrétariat." icon="💳" />
      ) : (
        <>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {loadError}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total encaissé" value={formatEur(totals.paid)} />
        <Kpi label="Total dépenses" value={formatEur(totals.spent)} tone="rose" />
        <Kpi label="Solde net" value={formatEur(totals.net)} tone={totals.net >= 0 ? 'cyan' : 'rose'} />
        <Kpi label="Reste à payer (élèves)" value={formatEur(totals.remaining)} tone="amber" />
      </section>

      <div className="flex gap-2">
        <TabButton active={tab === 'payments'} onClick={() => setTab('payments')}>
          Encaissements ({totals.paymentCount})
        </TabButton>
        <TabButton active={tab === 'expenses'} onClick={() => setTab('expenses')}>
          Dépenses ({totals.expenseCount})
        </TabButton>
      </div>

      {loading ? (
        <p className="text-sm font-medium text-slate-500">Chargement…</p>
      ) : tab === 'payments' ? (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-semibold text-slate-950">Dossiers financiers</h2>
              {students.length > 0 && (
                <ListSearchField onChange={setStudentSearchQuery} value={studentSearchQuery} />
              )}
            </div>
            <div className="mt-5 grid gap-3">
              {students.length === 0 && (
                <EmptyState
                  title="Aucun dossier élève"
                  message="Créez d'abord une inscription pour enregistrer un encaissement."
                  icon="💳"
                />
              )}
              {students.length > 0 && studentPageItems.length === 0 && (
                <EmptyState title="Aucun résultat" message="Aucun dossier ne correspond à votre recherche." icon="🔍" />
              )}
              {studentPageItems.map((student) => {
                const summary = getStudentSummary(student.id, payments, contractTotals)
                const progress =
                  summary.contractTotal > 0
                    ? Math.min(100, Math.round((summary.paid / summary.contractTotal) * 100))
                    : 0
                const status =
                  summary.contractTotal === 0
                    ? 'À configurer'
                    : summary.remaining === 0
                      ? 'Soldé'
                      : 'Partiel'
                return (
                  <button
                    className={`rounded-2xl border p-4 text-left transition hover:shadow-lg ${selectedStudent?.id === student.id ? 'border-blue-300 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    type="button"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-semibold text-slate-950">{studentLabel(student)}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {student.formation_type || student.package_name || 'Formation'} · {student.file_number || student.id.slice(0, 8)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">{status}</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-300" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      {formatEur(summary.paid)} / {formatEur(summary.contractTotal)}
                    </p>
                  </button>
                )
              })}
            </div>
            <PaginationBar
              className="mt-4"
              onPageChange={setStudentPage}
              page={studentPage}
              pageSize={studentPageSize}
              totalItems={studentTotalItems}
              totalPages={studentTotalPages}
            />
          </div>

          {selectedStudent && (
            <aside className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-blue-700">Fiche financière</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{studentLabel(selectedStudent)}</h2>
              <div className="mt-5 grid gap-3">
                <Info label="Montant du contrat" value={formatEur(selectedSummary.contractTotal)} />
                <Info label="Déjà encaissé" value={formatEur(selectedSummary.paid)} />
                <Info label="Reste à payer" value={formatEur(selectedSummary.remaining)} />
              </div>
              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-700">Historique</p>
                <div className="mt-3 grid gap-2">
                  {selectedHistory.length === 0 && <InlineNotice label="Aucun encaissement enregistré." />}
                  {historyPageItems.map((item) => (
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3" key={item.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-950">{formatEur(item.amount)}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700">{item.method}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatDateFr(item.paid_at)} · {item.nature}
                      </p>
                      {item.comment && <p className="mt-1 text-xs text-slate-500">{item.comment}</p>}
                    </div>
                  ))}
                </div>
                <PaginationBar
                  className="mt-3"
                  onPageChange={setHistoryPage}
                  page={historyPage}
                  pageSize={historyPageSize}
                  totalItems={historyTotalItems}
                  totalPages={historyTotalPages}
                />
              </div>
            </aside>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-2xl font-semibold text-slate-950">Historique des dépenses</h2>
          <div className="mt-5 grid gap-3">
            {expenses.length === 0 && (
              <EmptyState title="Aucune dépense" message="Enregistrez carburant, code de la route, frais divers…" icon="📤" />
            )}
            {expensePageItems.map((item) => (
              <article className="rounded-2xl border border-slate-300 bg-slate-50 p-4" key={item.id}>
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-slate-950">{item.category}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateFr(item.spent_at)}
                      {vehicleLabel(item.vehicles) ? ` · ${vehicleLabel(item.vehicles)}` : ''}
                    </p>
                  </div>
                  <p className="text-xl font-semibold text-rose-600">− {formatEur(item.amount)}</p>
                </div>
                {item.comment && <p className="mt-2 text-sm text-slate-500">{item.comment}</p>}
              </article>
            ))}
          </div>
          <PaginationBar
            className="mt-4"
            onPageChange={setExpensePage}
            page={expensePage}
            pageSize={expensePageSize}
            totalItems={expenseTotalItems}
            totalPages={expenseTotalPages}
          />
        </section>
      )}

      <AppModal
        open={modal === 'payment'}
        onClose={() => setModal(null)}
        eyebrow="Finances"
        title="Nouvel encaissement"
        size="xl"
        footer={(
          <AppModalFooter
            onClose={() => setModal(null)}
            submitForm="secretary-payment-form"
            submitLabel={saving ? 'Enregistrement…' : 'Enregistrer l\u2019encaissement'}
            submitDisabled={!canSubmitPayment || saving}
          />
        )}
      >
        <form id="secretary-payment-form" onSubmit={savePayment}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Élève (dossier) *</span>
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                onChange={(e) => handleSelectStudentInForm(e.target.value)}
                value={paymentForm.studentId}
              >
                <option value="">Sélectionner un dossier élève…</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {studentLabel(student)} · {student.file_number || student.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <Select label="Nature *" options={PAYMENT_NATURES} value={paymentForm.nature} onChange={(v) => setPaymentForm((c) => ({ ...c, nature: v }))} />
            <Select label="Mode *" options={PAYMENT_METHODS} value={paymentForm.method} onChange={(v) => setPaymentForm((c) => ({ ...c, method: v }))} />
            <Field label="Montant (€) *" type="number" value={paymentForm.amount} onChange={(v) => setPaymentForm((c) => ({ ...c, amount: v }))} />
            <Field label="Date *" type="date" value={paymentForm.date} onChange={(v) => setPaymentForm((c) => ({ ...c, date: v }))} />
            <Field label="Montant du contrat (€)" type="number" value={paymentForm.contractTotal} onChange={(v) => setPaymentForm((c) => ({ ...c, contractTotal: v }))} />
            <Textarea label="Commentaire" value={paymentForm.comment} onChange={(v) => setPaymentForm((c) => ({ ...c, comment: v }))} />
          </div>
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-sm font-semibold text-blue-800">Récapitulatif</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="Contrat" value={formatEur(paymentFormSummary.contractTotal)} />
              <Info label="Déjà encaissé" value={formatEur(paymentFormSummary.alreadyPaid)} />
              <Info label="Reste avant" value={formatEur(paymentFormSummary.remainingBefore)} />
              <Info label="Reste après" value={formatEur(paymentFormSummary.remainingAfter)} />
            </div>
          </div>
        </form>
      </AppModal>

      <AppModal
        open={modal === 'expense'}
        onClose={() => setModal(null)}
        eyebrow="Finances"
        title="Nouvelle dépense"
        size="xl"
        footer={(
          <AppModalFooter
            onClose={() => setModal(null)}
            submitForm="secretary-expense-form"
            submitLabel={saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
            submitDisabled={!canSubmitExpense || saving}
          />
        )}
      >
        <form id="secretary-expense-form" onSubmit={saveExpense}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label="Catégorie *" options={EXPENSE_CATEGORIES} value={expenseForm.category} onChange={(v) => setExpenseForm((c) => ({ ...c, category: v }))} />
            <Field label="Montant (€) *" type="number" value={expenseForm.amount} onChange={(v) => setExpenseForm((c) => ({ ...c, amount: v }))} />
            <Field label="Date *" type="date" value={expenseForm.date} onChange={(v) => setExpenseForm((c) => ({ ...c, date: v }))} />
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Véhicule (optionnel)</span>
              <select
                className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800"
                value={expenseForm.vehicleId}
                onChange={(e) => setExpenseForm((c) => ({ ...c, vehicleId: e.target.value }))}
              >
                <option value="">—</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
                ))}
              </select>
            </label>
            <Textarea label="Commentaire" value={expenseForm.comment} onChange={(v) => setExpenseForm((c) => ({ ...c, comment: v }))} />
          </div>
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
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${active ? 'bg-[#1769FF] text-white' : 'bg-white text-slate-600 border border-slate-300'}`}
    >
      {children}
    </button>
  )
}

function Kpi({ label, tone = 'cyan', value }) {
  const color = tone === 'rose' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : 'text-blue-600'
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
    </article>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function InlineNotice({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
      {label}
    </div>
  )
}

function Field({ label, onChange, type = 'text', value }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        onChange={(e) => onChange(e.target.value)}
        type={type}
        value={value}
      />
    </label>
  )
}

function Textarea({ label, onChange, value }) {
  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea
        className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      />
    </label>
  )
}

function Select({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="mt-2 min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

