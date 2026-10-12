import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHero from '../../components/ui/PageHero'
import EmptyState from '../../components/ui/EmptyState'
import ListSearchField from '../../components/ui/ListSearchField'
import { supabase } from '../../lib/supabase'
import {
  exportReviewsCsv,
  exportReviewsPdf,
  exportReviewsXlsx,
  fetchPlatformReviewOrganizations,
  fetchReviewDashboard,
  listPlatformReviews,
} from '../../services/platformReviews'

const STAR_ROWS = [
  { key: '5', label: '★★★★★' },
  { key: '4', label: '★★★★☆' },
  { key: '3', label: '★★★☆☆' },
  { key: '2', label: '★★☆☆☆' },
  { key: '1', label: '★☆☆☆☆' },
]

const PLATFORM_OPTIONS = ['Web', 'Android', 'iOS']

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function Kpi({ label, value, hint }) {
  return (
    <article className="rounded-2xl border-2 border-slate-300 bg-white p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      {hint && <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{hint}</p>}
      <p className="mt-2 text-2xl font-black text-cyan-700">{value}</p>
    </article>
  )
}

function DistributionChart({ distribution, total }) {
  const max = Math.max(...STAR_ROWS.map((row) => distribution?.[row.key] || 0), 1)
  return (
    <div className="grid gap-3">
      {STAR_ROWS.map((row) => {
        const count = distribution?.[row.key] || 0
        const width = `${Math.max(4, (count / max) * 100)}%`
        return (
          <div key={row.key} className="grid grid-cols-[88px_1fr_48px] items-center gap-3">
            <span className="text-sm font-bold text-amber-600">{row.label}</span>
            <div className="h-3 rounded-full bg-slate-100">
              <div className="h-3 rounded-full bg-amber-400 transition-all" style={{ width }} />
            </div>
            <span className="text-right text-sm font-bold text-slate-600">{count}</span>
          </div>
        )
      })}
      <p className="text-xs text-slate-500">{total} avis au total</p>
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
    <div className="flex h-48 items-end gap-2 overflow-x-auto pb-2">
      {rows.map((row) => (
        <div key={row.month} className="flex min-w-[52px] flex-col items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500">{row.count}</span>
          <div
            className="w-10 rounded-t-xl bg-cyan-600 transition-all"
            style={{ height: `${Math.max(8, ((row.count || 0) / max) * 140)}px` }}
            title={`Moyenne ${row.average}`}
          />
          <span className="text-[10px] font-semibold text-slate-500">{row.month?.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

function TopList({ title, items, valueKey = 'average' }) {
  const rows = Array.isArray(items) ? items : []
  return (
    <section className="rounded-2xl border-2 border-slate-300 bg-white p-5">
      <h3 className="text-lg font-extrabold text-slate-950">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Aucune donnée.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {rows.map((row, index) => (
            <li key={`${row.organization_id}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="font-bold text-slate-800">
                {index + 1}. {row.school_name}
              </span>
              <span className="shrink-0 font-black text-cyan-700">
                {valueKey === 'count' ? `${row.count} avis` : `${row.average} ★`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
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
      <PageHero
        eyebrow="Super Admin"
        title="Avis utilisateurs"
        subtitle="Notes et commentaires laissés par les élèves 15 jours après la création de leur compte."
      />

      {loadError && (
        <EmptyState icon="⚠️" message={loadError} title="Erreur de chargement" />
      )}

      {dashboard && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Moyenne générale" value={`${dashboard.average_rating} ★`} />
            <Kpi label="Total avis" value={dashboard.total_count} />
            <Kpi label="Aujourd'hui" value={dashboard.today_count} />
            <Kpi label="Cette semaine" value={dashboard.week_count} />
            <Kpi label="Ce mois" value={dashboard.month_count} />
            <Kpi label="Satisfaction (4-5★)" value={`${dashboard.satisfaction_percent} %`} hint="Pourcentage" />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border-2 border-slate-300 bg-white p-5">
              <h2 className="text-xl font-extrabold text-slate-950">Répartition des notes</h2>
              <div className="mt-5">
                <DistributionChart distribution={distribution} total={totalReviews} />
              </div>
            </article>
            <article className="rounded-2xl border-2 border-slate-300 bg-white p-5">
              <h2 className="text-xl font-extrabold text-slate-950">Évolution mensuelle</h2>
              <div className="mt-5">
                <MonthlyChart monthly={dashboard.monthly_evolution} />
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopList items={dashboard.top_rated_organizations} title="Top 10 — auto-écoles les mieux notées" />
            <TopList items={dashboard.top_volume_organizations} title="Top 10 — auto-écoles avec le plus d'avis" valueKey="count" />
          </section>

          {Array.isArray(dashboard.average_by_organization) && dashboard.average_by_organization.length > 0 && (
            <section className="rounded-2xl border-2 border-slate-300 bg-white p-5">
              <h2 className="text-xl font-extrabold text-slate-950">Note moyenne par auto-école</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Auto-école</th>
                      <th className="px-3 py-2">Moyenne</th>
                      <th className="px-3 py-2">Nombre d&apos;avis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.average_by_organization.map((row) => (
                      <tr key={row.organization_id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-semibold text-slate-800">{row.school_name}</td>
                        <td className="px-3 py-2 font-black text-amber-600">{row.average} ★</td>
                        <td className="px-3 py-2 text-slate-600">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <section className="rounded-2xl border-2 border-slate-300 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-950">Liste complète</h2>
            <p className="mt-1 text-sm text-slate-500">{total} évaluation(s) correspondant aux filtres.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={exportBusy || !reviews.length}
              onClick={() => runExport('csv')}
              type="button"
            >
              {exportBusy === 'csv' ? 'Export…' : 'Export CSV'}
            </button>
            <button
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={exportBusy || !reviews.length}
              onClick={() => runExport('xlsx')}
              type="button"
            >
              {exportBusy === 'xlsx' ? 'Export…' : 'Export Excel'}
            </button>
            <button
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={exportBusy || !reviews.length}
              onClick={() => runExport('pdf')}
              type="button"
            >
              {exportBusy === 'pdf' ? 'Export…' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <ListSearchField onChange={setSearch} value={search} />
          </div>
          <select
            className="min-h-11 rounded-2xl border-2 border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
            onChange={(event) => setOrganizationId(event.target.value)}
            value={organizationId}
          >
            <option value="">Toutes les auto-écoles</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <select
            className="min-h-11 rounded-2xl border-2 border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
            onChange={(event) => setRating(event.target.value)}
            value={rating}
          >
            <option value="">Toutes les notes</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>{value} étoile{value > 1 ? 's' : ''}</option>
            ))}
          </select>
          <select
            className="min-h-11 rounded-2xl border-2 border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
            onChange={(event) => setPlatform(event.target.value)}
            value={platform}
          >
            <option value="">Toutes les plateformes</option>
            {PLATFORM_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <input
            className="min-h-11 rounded-2xl border-2 border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
            onChange={(event) => setDateFrom(event.target.value)}
            type="date"
            value={dateFrom}
          />
          <input
            className="min-h-11 rounded-2xl border-2 border-slate-300 bg-white px-3 text-sm font-medium text-slate-800"
            onChange={(event) => setDateTo(event.target.value)}
            type="date"
            value={dateTo}
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : reviews.length === 0 ? (
            <EmptyState icon="⭐" message="Aucun avis ne correspond aux filtres sélectionnés." title="Aucun avis" />
          ) : (
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Élève</th>
                  <th className="px-3 py-3">Auto-école</th>
                  <th className="px-3 py-3">Étoiles</th>
                  <th className="px-3 py-3">Commentaire</th>
                  <th className="px-3 py-3">Plateforme</th>
                  <th className="px-3 py-3">Version</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDateTime(review.created_at)}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">{review.student_name}</td>
                    <td className="px-3 py-3 text-slate-700">{review.school_name}</td>
                    <td className="px-3 py-3 font-black text-amber-600">{review.rating} ★</td>
                    <td className="px-3 py-3 max-w-xs text-slate-600">{review.comment || '—'}</td>
                    <td className="px-3 py-3 text-slate-600">{review.platform}</td>
                    <td className="px-3 py-3 text-slate-600">{review.app_version}</td>
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
