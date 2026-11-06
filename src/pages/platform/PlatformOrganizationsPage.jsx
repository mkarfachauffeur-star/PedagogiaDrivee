import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Notice from '../../components/ui/Notice'
import OnlineDot from '../../components/ui/OnlineDot'
import StudentQuota from '../../components/platform/StudentQuota'
import { useOnlinePresence } from '../../hooks/useOnlinePresence'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { TestDataToggle } from '../../components/ui/TableTools'
import { useConfirm } from '../../components/ui/useConfirm'
import { formatDate } from '../../lib/format'
import { isTestOrganization } from '../../lib/platformTestData'
import {
  createOrganization,
  deleteOrganization,
  fetchStudentQuotas,
  inviteOrganizationManager,
  listAllOrganizations,
} from '../../services/platform'

const STATUS = {
  trial: { label: 'Essai', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspendue', tone: 'warning' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
}

const EMPTY_FORM = { name: '', phone: '', managerName: '', managerEmail: '', managerGender: '' }

export default function PlatformOrganizationsPage() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [listFeedback, setListFeedback] = useState(null)
  const [showTest, setShowTest] = useState(false)
  const [quotas, setQuotas] = useState(() => new Map())
  const [confirm, confirmDialog] = useConfirm()
  const { byOrganization } = useOnlinePresence()

  const refresh = useCallback(async () => {
    setLoading(true)
    const [{ organizations: rows }, quotaRes] = await Promise.all([listAllOrganizations(), fetchStudentQuotas()])
    setOrganizations(rows)
    setQuotas(quotaRes.quotas)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    setFeedback(null)
    const name = form.name.trim()
    const { organizationId, error } = await createOrganization({ name, email: form.managerEmail, phone: form.phone })
    if (error) {
      setCreating(false)
      setFeedback({ type: 'error', message: error.message || 'Création impossible.' })
      return
    }
    const { error: inviteError } = await inviteOrganizationManager(organizationId, {
      fullName: form.managerName,
      email: form.managerEmail,
      gender: form.managerGender,
    })
    setCreating(false)
    setFeedback(
      inviteError
        ? {
            type: 'error',
            message: `« ${name} » est créée, mais l’invitation du gérant n’est pas partie : ${inviteError.message}`,
            organizationId,
          }
        : {
            type: 'ok',
            message: `« ${name} » est créée avec 30 jours d’essai gratuit. ${form.managerName.trim()} a reçu une invitation à ${form.managerEmail.trim()} pour créer son mot de passe.`,
            organizationId,
          },
    )
    setForm(EMPTY_FORM)
    refresh()
  }

  const handleDelete = async (org) => {
    const ok = await confirm({
      title: `Supprimer « ${org.name} » ?`,
      description: 'L’auto-école et tous ses comptes (gérant, secrétariat, enseignants, élèves) seront supprimés définitivement.',
      confirmLabel: 'Supprimer définitivement',
      danger: true,
      requireText: org.name,
      requireIdentity: true,
    })
    if (!ok) return
    setListFeedback(null)
    const { error } = await deleteOrganization(org.id)
    if (error) {
      setListFeedback({ type: 'error', message: error.message || 'Suppression impossible.' })
      return
    }
    setListFeedback({ type: 'ok', message: `« ${org.name} » a été supprimée.` })
    refresh()
  }

  const testCount = useMemo(() => organizations.filter((org) => isTestOrganization(org)).length, [organizations])
  const visible = useMemo(
    () => (showTest ? organizations : organizations.filter((org) => !isTestOrganization(org))),
    [organizations, showTest],
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        description="Établissements clients. La suspension et la résiliation se gèrent dans Abonnements."
        title="Auto-écoles"
      />

      <section className={`${ui.card} ${ui.cardBody}`}>
        <h2 className={ui.sectionTitle}>Créer une auto-école</h2>
        <p className={ui.sectionText}>Elle démarre avec un essai gratuit de 30 jours. Le gérant reçoit un e-mail pour créer son mot de passe.</p>
        <form className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
          <label className={ui.label}>
            Nom de l’auto-école
            <input className={ui.input} onChange={update('name')} required value={form.name} />
          </label>
          <label className={ui.label}>
            Téléphone de l’auto-école
            <input className={ui.input} onChange={update('phone')} type="tel" value={form.phone} />
          </label>
          <p className="text-sm font-medium text-slate-900 sm:col-span-2">Gérant</p>
          <label className={ui.label}>
            Prénom et nom
            <input className={ui.input} onChange={update('managerName')} required value={form.managerName} />
          </label>
          <label className={ui.label}>
            E-mail du gérant
            <input className={ui.input} onChange={update('managerEmail')} required type="email" value={form.managerEmail} />
            <span className={ui.hint}>Il reçoit l’invitation à cette adresse. Elle ne doit pas déjà avoir un compte.</span>
          </label>
          <label className={ui.label}>
            Civilité
            <select className={ui.input} onChange={update('managerGender')} required value={form.managerGender}>
              <option value="">Choisir</option>
              <option value="female">Madame</option>
              <option value="male">Monsieur</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className={ui.btnPrimary} disabled={creating} type="submit">
              {creating ? 'Création…' : 'Créer et inviter le gérant'}
            </button>
          </div>
        </form>
        {feedback && (
          <div className="mt-4">
            <Notice
              action={
                feedback.organizationId ? (
                  <Link className={ui.btnSmallPrimary} to={`/platform/organizations/${feedback.organizationId}`}>
                    Ouvrir la fiche
                  </Link>
                ) : null
              }
              tone={feedback.type === 'error' ? 'danger' : 'success'}
            >
              {feedback.message}
            </Notice>
          </div>
        )}
      </section>

      {listFeedback && <Notice tone={listFeedback.type === 'error' ? 'danger' : 'success'}>{listFeedback.message}</Notice>}

      {testCount > 0 && (
        <div className="flex justify-end">
          <TestDataToggle checked={showTest} count={testCount} onChange={setShowTest} />
        </div>
      )}

      <div className={ui.tableWrap}>
        <table className={`${ui.table} min-w-[960px]`}>
          <thead>
            <tr>
              <th className={ui.th}>Auto-école</th>
              <th className={ui.th}>E-mail</th>
              <th className={ui.th}>Statut</th>
              <th className={ui.th}>Offre</th>
              <th className={ui.th}>Élèves sur l’année</th>
              <th className={ui.th}>Fin de l’essai</th>
              <th className={`${ui.th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className={ui.tdEmpty} colSpan={7}>
                  Chargement…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td className={ui.tdEmpty} colSpan={7}>
                  Aucune auto-école.
                </td>
              </tr>
            ) : (
              visible.map((org) => {
                const sub = Array.isArray(org.subscriptions) ? org.subscriptions[0] : org.subscriptions
                const status = STATUS[org.status] || { label: org.status, tone: 'neutral' }
                return (
                  <tr className={ui.tr} key={org.id}>
                    <td className={`${ui.tdStrong} min-w-[12rem]`}>
                      {byOrganization.has(org.id) ? (
                        <span className="mr-2 inline-flex align-middle">
                          <OnlineDot label={`${byOrganization.get(org.id).length} compte(s) connecté(s)`} />
                        </span>
                      ) : null}
                      <Link className="hover:text-[#1769FF] hover:underline" to={`/platform/organizations/${org.id}`}>
                        {org.name}
                      </Link>
                      {isTestOrganization(org) && (
                        <span className="ml-2 align-middle">
                          <StatusBadge>Test</StatusBadge>
                        </span>
                      )}
                    </td>
                    <td className={ui.td}>{org.email || '—'}</td>
                    <td className={ui.td}>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </td>
                    <td className={ui.td}>{sub?.plan?.name || '—'}</td>
                    <td className={ui.td}>
                      <StudentQuota quota={quotas.get(org.id)} />
                    </td>
                    <td className={`${ui.tdMuted} tabular-nums`}>{sub?.trial_ends_at ? formatDate(sub.trial_ends_at) : '—'}</td>
                    <td className={ui.td}>
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <Link className={ui.btnSmall} to={`/platform/organizations/${org.id}`}>
                          Voir la fiche
                        </Link>
                        <button className={ui.btnSmallDanger} onClick={() => handleDelete(org)} type="button">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {confirmDialog}
    </div>
  )
}
