import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Notice from '../../components/ui/Notice'
import OnlineDot from '../../components/ui/OnlineDot'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { useOnlinePresence } from '../../hooks/useOnlinePresence'
import { ACTION_LABELS } from '../../lib/auditLabels'
import { formatDate, formatDateTime } from '../../lib/format'
import { formatPlatformEur, resolveSubscriptionStatus } from '../../lib/platformPlans'
import { isTestOrganization } from '../../lib/platformTestData'
import { getOrganizationOverview, listAuditLogs } from '../../services/platform'
import { roleLabels } from '../../utils/authSession'

const ORG_STATUS = {
  trial: { label: 'Essai', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspendue', tone: 'warning' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
}

const INVOICE_STATUS = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  sent: { label: 'En attente', tone: 'warning' },
  paid: { label: 'Payée', tone: 'success' },
  void: { label: 'Annulée', tone: 'neutral' },
}

const PLAN_NAMES = { starter: 'Starter', premium: 'Premium' }
const ROLE_ORDER = { manager: 0, secretary: 1, teacher: 2, student: 3 }

function Field({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children || '—'}</dd>
    </div>
  )
}

function Panel({ title, action, children }) {
  return (
    <section className={ui.card}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className={ui.sectionTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default function PlatformOrganizationDetailPage() {
  const { organizationId } = useParams()
  const [data, setData] = useState(null)
  const [logs, setLogs] = useState([])
  const { online } = useOnlinePresence()

  useEffect(() => {
    let active = true
    Promise.all([getOrganizationOverview(organizationId), listAuditLogs({ organizationId, limit: 20 })]).then(
      ([overview, audit]) => {
        if (!active) return
        setData(overview)
        setLogs(audit.logs)
      },
    )
    return () => {
      active = false
    }
  }, [organizationId])

  const onlineIds = useMemo(
    () => new Set(online.filter((entry) => entry.organizationId === organizationId).map((entry) => entry.profileId)),
    [online, organizationId],
  )

  const back = (
    <Link className={ui.btnSecondary} to="/platform/organizations">
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      Auto-écoles
    </Link>
  )

  if (!data) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader actions={back} title="Auto-école" />
        <p className="text-sm text-slate-500">Chargement…</p>
      </div>
    )
  }

  const org = data.organization
  if (!org) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader actions={back} title="Auto-école introuvable" />
        <Notice tone="warning">{data.error ? 'La fiche n’a pas pu être chargée.' : 'Cette auto-école n’existe pas ou a été supprimée.'}</Notice>
      </div>
    )
  }

  const sub = Array.isArray(org.subscriptions) ? org.subscriptions[0] : org.subscriptions
  const offer = resolveSubscriptionStatus(org, sub, sub?.plan)
  const status = ORG_STATUS[org.status] || { label: org.status, tone: 'neutral' }
  const profiles = [...data.profiles].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9))
  const address = [org.address, [org.postal_code, org.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader actions={back} description={`Créée le ${formatDate(org.created_at)}`} title={org.name} />

      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {isTestOrganization(org, sub) ? <StatusBadge>Compte de test</StatusBadge> : null}
        {onlineIds.size > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <OnlineDot />
            {onlineIds.size} compte{onlineIds.size > 1 ? 's' : ''} connecté{onlineIds.size > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Établissement">
          <dl className="divide-y divide-slate-100 px-5 py-1">
            <Field label="Gérant">{org.manager_name}</Field>
            <Field label="E-mail">{org.email}</Field>
            <Field label="Téléphone">{org.phone}</Field>
            <Field label="Adresse">{address}</Field>
            <Field label="SIRET">{org.siret}</Field>
            <Field label="Agrément préfectoral">{org.prefecture_approval}</Field>
          </dl>
        </Panel>

        <Panel
          action={
            <Link className="text-sm font-medium text-[#1769FF] hover:underline" to="/platform/subscriptions">
              Gérer
            </Link>
          }
          title="Abonnement"
        >
          <dl className="divide-y divide-slate-100 px-5 py-1">
            <Field label="Offre">{offer}</Field>
            <Field label="Offre demandée">{PLAN_NAMES[sub?.metadata?.requested_plan]}</Field>
            <Field label="Prix">{sub?.plan?.price_cents ? `${formatPlatformEur(sub.plan.price_cents, { fromCents: true })} par mois` : null}</Field>
            <Field label="Fin de l’essai">{sub?.trial_ends_at ? formatDate(sub.trial_ends_at) : null}</Field>
            <Field label="Fin de période">{sub?.current_period_end ? formatDate(sub.current_period_end) : null}</Field>
            <Field label="Moyen de paiement">{sub?.metadata?.payment_method}</Field>
          </dl>
        </Panel>
      </div>

      <Panel title={`Comptes (${profiles.length})`}>
        <div className="overflow-x-auto">
          <table className={`${ui.table} min-w-[640px]`}>
            <thead>
              <tr>
                <th className={ui.th}>Nom</th>
                <th className={ui.th}>E-mail</th>
                <th className={ui.th}>Rôle</th>
                <th className={ui.th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td className={ui.tdEmpty} colSpan={4}>
                    Aucun compte.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr className={ui.tr} key={profile.id}>
                    <td className={ui.tdStrong}>
                      <span className="inline-flex items-center gap-2">
                        {onlineIds.has(profile.id) ? <OnlineDot /> : null}
                        {profile.full_name || '—'}
                      </span>
                    </td>
                    <td className={ui.td}>{profile.email || '—'}</td>
                    <td className={ui.td}>{roleLabels[profile.role] || profile.role}</td>
                    <td className={ui.td}>
                      <StatusBadge tone={profile.is_active ? 'success' : 'neutral'}>{profile.is_active ? 'Actif' : 'Désactivé'}</StatusBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Factures">
          {data.invoices.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">Aucune facture d’abonnement.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.invoices.map((invoice) => {
                const state = INVOICE_STATUS[invoice.status] || { label: invoice.status, tone: 'neutral' }
                return (
                  <li className="flex items-center justify-between gap-3 px-5 py-3 text-sm" key={invoice.id}>
                    <div>
                      <p className="font-medium text-slate-900">{invoice.invoice_number || 'Facture'}</p>
                      <p className="text-xs text-slate-500">Émise le {formatDate(invoice.issued_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium tabular-nums text-slate-900">{formatPlatformEur(invoice.amount_cents, { fromCents: true })}</span>
                      <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel
          action={
            <Link className="text-sm font-medium text-[#1769FF] hover:underline" to="/platform/audit">
              Tout voir
            </Link>
          }
          title="Dernières actions"
        >
          {logs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">Aucune action enregistrée.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.slice(0, 8).map((log) => (
                <li className="flex items-center justify-between gap-3 px-5 py-3 text-sm" key={log.id}>
                  <span className="min-w-0 truncate text-slate-700">
                    {ACTION_LABELS[log.action] || log.action} · {log.actor_email || '—'}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">{formatDateTime(log.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
