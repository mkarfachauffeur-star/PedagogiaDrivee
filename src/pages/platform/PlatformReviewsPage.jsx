import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CalendarDays, MessageSquareText, Smile, Star, Sun } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'
import ListSearchField from '../../components/ui/ListSearchField'
import Notice from '../../components/ui/Notice'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { ui } from '../../components/ui/styles'
import { formatDateTime, formatNumber, formatPercent, formatRating } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import {
  exportReviewsCsv,
  exportReviewsPdf,
  exportReviewsXlsx,
  fetchPlatformReviewOrganizations,
  fetchReviewDashboard,
  listPlatformReviews,
} from '../../services/platformReviews'

const STAR_ROWS = ['5', '4', '3', '2', '1']
const PLATFORM_OPTIONS = ['Web', 'Android', 'iOS']
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function monthLabel(value = '') {
  const month = Number(String(value).slice(5, 7))
  return MONTHS[month - 1] || value
}

function Panel({ title, children }) {
  return (
    <section className={`${ui.card} ${ui.cardBody}`}>
      <h2 className={ui.sectionTitle}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function DistributionChart({ distribution, total }) {
  const max = Math.max(...STAR_ROWS.map((key) => distribution?.[key] || 0), 1)
  return (
    <div className="grid gap-2.5">
      {STAR_ROWS.map((key) => {
        const count = distribution?.[key] || 0
        return (
          <div className="grid grid-cols-[72px_1fr_40px] items-center gap-3" key={key}>
            <span className="text-sm text-slate-600">
              {key} étoile{key === '1' ? '' : 's'}
            </span>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-amber-400" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="text-right text-sm font-medium tabular-nums text-slate-900">{formatNumber(count)}</span>
          </div>
        )
      })}
      <p className="mt-1 text-xs text-slate-500">{formatNumber(total)} avis au total</p>
    </div>
  )
}

function MonthlyChart({ monthly }) {
  const rows = Array.isArray(monthly) ? monthly : []
  const max = Math.max(...rows.map((row) => row.count || 0), 1)

  if (!rows.length) {
    return <p className="text-sm text-slate-500">Aucune donnée mensuelle pour le moment.</p>
  }

  return (
    <div className="flex h-44 items-end gap-2 overflow-x-auto pb-1">
      {rows.map((row) => (
        <div className="flex min-w-[44px] flex-1 flex-col items-center gap-1.5" key={row.month}>
          <span className="text-xs font-medium tabular-nums text-slate-700">{row.count}</span>
          <div
            className="w-full max-w-[36px] rounded-t-md bg-[#1769FF]"
            style={{ height: `${Math.max(4, ((row.count || 0) / max) * 120)}px` }}
            title={`Note moyenne : ${formatRating(row.average)}`}
          />
          <span className="text-xs text-slate-500">{monthLabel(row.month)}</span>
        </div>
      ))}
    </div>
  )
}

function TopList({ title, items, valueKey = 'average' }) {
  const rows = Array.isArray(items) ? items : []
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune donnée.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <li className="flex items-center justify-between gap-3 py-2.5 text-sm" key={`${row.organization_id}-${index}`}>
              <span className="min-w-0 truncate text-slate-700">
                <span className="mr-2 tabular-nums text-slate-400">{index + 1}.</span>
                {row.school_name}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-slate-900">
                {valueKey === 'count' ? `${formatNumber(row.count)} avis` : formatRating(row.average)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

export default function PlatformReviewsPage() {
  const [dashboard, setDashboard] = useState(null)
  const [reviews, setReviews] = useState([])
  const [total, setTotal] = useState(0)
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [exportBusy, setExportBusy] = useState(null)

  const [search, setSearch] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [rating, setRating] = useState('')
  const [platform, setPlatform] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filters = useMemo(() => ({
    search: search.trim() || null,
    organizationId: organizationId || null,
    rating: rating || null,
    platform: platform || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  }), [search, organizationId, rating, platform, dateFrom, dateTo])

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const [dashboardRes, listRes, orgsRes] = await Promise.all([
      fetchReviewDashboard(),
      listPlatformReviews(filters),
      fetchPlatformReviewOrganizations(),
    ])
    if (dashboardRes.error || listRes.error) {
      setLoadError('Impossible de charger les avis utilisateurs.')
    }
    setDashboard(dashboardRes.dashboard)
    setReviews(listRes.reviews)
    setTotal(listRes.total)
    setOrganizations(orgsRes.organizations)
    setLoading(false)
  }, [filters])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const channel = supabase
      .channel('platform-reviews-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, refresh)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const runExport = async (format) => {
    setExportBusy(format)
    try {
      if (format === 'csv') await exportReviewsCsv(reviews)
      else if (format === 'xlsx') await exportReviewsXlsx(reviews)
      else if (format === 'pdf') await exportReviewsPdf(reviews, dashboard)
    } finally {
      setExportBusy(null)
    }
  }

  const distribution = dashboard?.distribution || {}
  const totalReviews = dashboard?.total_count || 0

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        description="Notes et commentaires laissés par les élèves 15 jours après la création de leur compte."
        title="Avis utilisateurs"
      />

      {loadError && <Notice tone="danger">{loadError}</Notice>}

      {dashboard && (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard accent="amber" icon={Star} label="Note moyenne" value={formatRating(dashboard.average_rating)} />
            <StatCard accent="emerald" detail="4 ou 5 étoiles" icon={Smile} label="Satisfaction" value={formatPercent(dashboard.satisfaction_percent)} />
            <StatCard accent="blue" icon={MessageSquareText} label="Total des avis" value={formatNumber(dashboard.total_count)} />
            <StatCard accent="sky" icon={Sun} label="Aujourd’hui" value={formatNumber(dashboard.today_count)} />
            <StatCard accent="sky" icon={CalendarCheck} label="Cette semaine" value={formatNumber(dashboard.week_count)} />
            <StatCard accent="sky" icon={CalendarDays} label="Ce mois-ci" value={formatNumber(dashboard.month_count)} />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Répartition des notes">
              <DistributionChart distribution={distribution} total={totalReviews} />
            </Panel>
            <Panel title="Nombre d’avis par mois">
              <MonthlyChart monthly={dashboard.monthly_evolution} />
            </Panel>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopList items={dashboard.top_rated_organizations} title="Auto-écoles les mieux notées" />
            <TopList items={dashboard.top_volume_organizations} title="Auto-écoles avec le plus d’avis" valueKey="count" />
          </section>

          {Array.isArray(dashboard.average_by_organization) && dashboard.average_by_organization.length > 0 && (
            <Panel title="Note moyenne par auto-école">
              <div className="-mx-5 overflow-x-auto sm:-mx-6">
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th className={ui.th}>Auto-école</th>
                      <th className={`${ui.th} text-right`}>Note moyenne</th>
                      <th className={`${ui.th} text-right`}>Nombre d’avis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.average_by_organization.map((row) => (
                      <tr className={ui.tr} key={row.organization_id}>
                        <td className={ui.tdStrong}>{row.school_name}</td>
                        <td className={ui.tdNumber}>{formatRating(row.average)}</td>
                        <td className={ui.tdNumber}>{formatNumber(row.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}

      <section className={`${ui.card} ${ui.cardBody}`}>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className={ui.sectionTitle}>Tous les avis</h2>
            <p className={ui.sectionText}>
              {formatNumber(total)} avis correspond{total > 1 ? 'ent' : ''} aux filtres.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { format: 'csv', label: 'CSV' },
              { format: 'xlsx', label: 'Excel' },
              { format: 'pdf', label: 'PDF' },
            ].map((item) => (
              <button
                className={ui.btnSmall}
                disabled={exportBusy || !reviews.length}
                key={item.format}
                onClick={() => runExport(item.format)}
                type="button"
              >
                {exportBusy === item.format ? 'Export…' : `Exporter en ${item.label}`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <ListSearchField onChange={setSearch} value={search} />
          </div>
          <select
            aria-label="Auto-école"
            className={`${ui.input} mt-0`}
            onChange={(event) => setOrganizationId(event.target.value)}
            value={organizationId}
          >
            <option value="">Toutes les auto-écoles</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <select aria-label="Note" className={`${ui.input} mt-0`} onChange={(event) => setRating(event.target.value)} value={rating}>
            <option value="">Toutes les notes</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} étoile{value > 1 ? 's' : ''}
              </option>
            ))}
          </select>
          <select
            aria-label="Plateforme"
            className={`${ui.input} mt-0`}
            onChange={(event) => setPlatform(event.target.value)}
            value={platform}
          >
            <option value="">Toutes les plateformes</option>
            {PLATFORM_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Du"
              className={`${ui.input} mt-0`}
              onChange={(event) => setDateFrom(event.target.value)}
              type="date"
              value={dateFrom}
            />
            <input
              aria-label="Au"
              className={`${ui.input} mt-0`}
              onChange={(event) => setDateTo(event.target.value)}
              type="date"
              value={dateTo}
            />
          </div>
        </div>

        <div className="-mx-5 mt-5 overflow-x-auto sm:-mx-6">
          {loading ? (
            <p className="px-6 py-6 text-sm text-slate-500">Chargement…</p>
          ) : reviews.length === 0 ? (
            <EmptyState icon="⭐" message="Aucun avis ne correspond aux filtres sélectionnés." title="Aucun avis" />
          ) : (
            <table className={`${ui.table} min-w-[900px]`}>
              <thead>
                <tr>
                  <th className={ui.th}>Date</th>
                  <th className={ui.th}>Élève</th>
                  <th className={ui.th}>Auto-école</th>
                  <th className={ui.th}>Note</th>
                  <th className={ui.th}>Commentaire</th>
                  <th className={ui.th}>Plateforme</th>
                  <th className={ui.th}>Version</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr className={`${ui.tr} align-top`} key={review.id}>
                    <td className={`${ui.tdMuted} whitespace-nowrap tabular-nums`}>{formatDateTime(review.created_at)}</td>
                    <td className={ui.tdStrong}>{review.student_name}</td>
                    <td className={ui.td}>{review.school_name}</td>
                    <td className={`${ui.td} whitespace-nowrap font-medium tabular-nums text-slate-900`}>
                      {formatRating(review.rating)}
                    </td>
                    <td className={`${ui.td} max-w-xs`}>{review.comment || '—'}</td>
                    <td className={ui.tdMuted}>{review.platform}</td>
                    <td className={`${ui.tdMuted} tabular-nums`}>{review.app_version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
