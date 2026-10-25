import { Building2, GraduationCap, UserRound, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import OnlineDot from '../../components/ui/OnlineDot'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { Pagination, SearchInput } from '../../components/ui/TableTools'
import { useOnlinePresence } from '../../hooks/useOnlinePresence'
import { formatDateTime, formatNumber } from '../../lib/format'
import { ACTION_LABELS, ENTITY_LABELS } from '../../lib/auditLabels'
import { isTestOrganization } from '../../lib/platformTestData'
import { listAllOrganizations, listAuditLogs } from '../../services/platform'

const ROLE_ORDER = ['manager', 'secretary', 'teacher', 'student']
const ROLE_SHORT = { manager: 'gérant', secretary: 'secrétariat', teacher: 'enseignant', student: 'élève' }
const PAGE_SIZE = 50

function timeOf(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function roleSummary(entries) {
  return ROLE_ORDER.map((role) => {
    const count = entries.filter((entry) => entry.role === role).length
    if (!count) return null
    const label = ROLE_SHORT[role]
    return `${count} ${role === 'secretary' ? label : `${label}${count > 1 ? 's' : ''}`}`
  })
    .filter(Boolean)
    .join(', ')
}

function LivePanel({ organizations }) {
  const { online, byOrganization } = useOnlinePresence()
  const names = useMemo(() => new Map(organizations.map((org) => [org.id, org])), [organizations])
  const rows = [...byOrganization.entries()]
    .map(([id, entries]) => ({ id, entries, org: names.get(id) }))
    .sort((a, b) => b.entries.length - a.entries.length)

  const count = (role) => online.filter((entry) => entry.role === role).length

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard accent="emerald" icon={Building2} label="Auto-écoles connectées" value={formatNumber(rows.length)} />
        <StatCard accent="blue" icon={Users} label="Gérants et secrétariat" value={formatNumber(count('manager') + count('secretary'))} />
        <StatCard accent="violet" icon={UserRound} label="Enseignants" value={formatNumber(count('teacher'))} />
        <StatCard accent="sky" icon={GraduationCap} label="Élèves" value={formatNumber(count('student'))} />
      </div>

      <div className={ui.card}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className={ui.sectionTitle}>Connectés en ce moment</h2>
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            <OnlineDot label="Mise à jour en direct" />
            En direct
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune auto-école connectée pour le moment.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map(({ id, entries, org }) => {
              const since = entries.map((entry) => entry.onlineAt).filter(Boolean).sort()[0]
              return (
                <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5" key={id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <OnlineDot />
                    <Link className="truncate text-sm font-medium text-slate-900 hover:text-[#1769FF] hover:underline" to={`/platform/organizations/${id}`}>
                      {org?.name || 'Auto-école'}
                    </Link>
                    {org && isTestOrganization(org) ? <StatusBadge>Test</StatusBadge> : null}
                  </div>
                  <p className="text-sm text-slate-500">
                    {roleSummary(entries)}
                    {since ? <span className="text-slate-400"> · depuis {timeOf(since)}</span> : null}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    listAllOrganizations().then(({ organizations: rows }) => setOrganizations(rows))
  }, [])

  useEffect(() => {
    listAuditLogs({ action: action || null, dateFrom: dateFrom || null, dateTo: dateTo || null, limit: 1000 }).then(
      ({ logs: rows }) => {
        setLogs(rows)
        setPage(1)
      },
    )
  }, [action, dateFrom, dateTo])

  const orgNames = useMemo(() => new Map(organizations.map((org) => [org.id, org.name])), [organizations])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return logs
    return logs.filter((log) =>
      `${log.actor_email || ''} ${orgNames.get(log.organization_id) || ''} ${log.entity_label || ''}`.toLowerCase().includes(term),
    )
  }, [logs, search, orgNames])

  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        description="Auto-écoles connectées en direct, puis l’historique des actions (journal d’audit conservé 7 ans)."
        title="Activité"
      />

      <LivePanel organizations={organizations} />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className={ui.sectionTitle}>Journal d’audit</h2>
          <p className={ui.sectionText}>Créations, modifications, suppressions, connexions et exports.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <SearchInput
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Utilisateur ou auto-école"
            value={search}
          />
          <select aria-label="Action" className={`${ui.input} mt-0`} onChange={(event) => setAction(event.target.value)} value={action}>
            <option value="">Toutes les actions</option>
            {Object.entries(ACTION_LABELS)
              .filter(([key]) => key !== 'insert')
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
          <input aria-label="Du" className={`${ui.input} mt-0`} onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
          <input aria-label="Au" className={`${ui.input} mt-0`} onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
        </div>

        <div className={ui.tableWrap}>
          <table className={`${ui.table} min-w-[860px]`}>
            <thead>
              <tr>
                <th className={ui.th}>Date</th>
                <th className={ui.th}>Action</th>
                <th className={ui.th}>Élément concerné</th>
                <th className={ui.th}>Utilisateur</th>
                <th className={ui.th}>Auto-école</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className={ui.tdEmpty} colSpan={5}>
                    Aucune entrée ne correspond à ces critères.
                  </td>
                </tr>
              ) : (
                rows.map((log) => (
                  <tr className={ui.tr} key={log.id}>
                    <td className={`${ui.tdMuted} whitespace-nowrap tabular-nums`}>{formatDateTime(log.created_at)}</td>
                    <td className={ui.tdStrong}>{ACTION_LABELS[log.action] || log.action}</td>
                    <td className={ui.td}>
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                      {log.entity_label && log.entity_label !== ACTION_LABELS[log.action] ? (
                        <span className="text-slate-500"> · {log.entity_label}</span>
                      ) : null}
                    </td>
                    <td className={ui.td}>{log.actor_email || log.actor_id?.slice(0, 8) || '—'}</td>
                    <td className={ui.td}>
                      {log.organization_id ? (
                        <Link className="hover:text-[#1769FF] hover:underline" to={`/platform/organizations/${log.organization_id}`}>
                          {orgNames.get(log.organization_id) || 'Auto-école supprimée'}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination onChange={setPage} page={page} pageSize={PAGE_SIZE} total={filtered.length} />
      </section>
    </div>
  )
}
