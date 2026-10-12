import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/ui/EmptyState'
import PageHero from '../../components/ui/PageHero'
import PageShell from '../../components/ui/PageShell'
import { useAuth } from '../../context/AuthContext'
import { formatEur } from '../../services/finance'
import { fetchSecretaryDashboard } from '../../services/secretaryDashboard'

const priorityTone = {
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  rose: 'border-rose-200 bg-rose-50 text-rose-900',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  violet: 'border-violet-200 bg-violet-50 text-violet-900',
}

export default function SecretaryDashboardPage() {
  const { profileId, organizationId, organization, loading: authLoading } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    if (authLoading) return
    if (!profileId || !organizationId) {
      setDashboard(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const { dashboard: data, error } = await fetchSecretaryDashboard({ organizationId })
    if (error || !data) setLoadError('Impossible de charger le tableau de bord.')
    setDashboard(data)
    setLoading(false)
  }, [authLoading, profileId, organizationId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const orgLabel = organization?.name || 'Votre auto-école'
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <PageShell>
      <PageHero
        eyebrow="Secrétariat"
        title="Tableau de bord"
        subtitle={`${orgLabel} — ${todayLabel}`}
      />

      {authLoading || loading ? (
        <p className="text-sm text-slate-500">Chargement du tableau de bord…</p>
      ) : !profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte secrétariat." icon="📊" />
      ) : !organizationId ? (
        <EmptyState
          title="Auto-école introuvable"
          message="Votre compte n'est rattaché à aucune organisation."
          icon="🏫"
        />
      ) : loadError || !dashboard ? (
        <EmptyState title="Erreur de chargement" message={loadError || 'Données indisponibles.'} icon="⚠️" />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Leçons aujourd'hui" tone="cyan" value={String(dashboard.summary.todayLessons)} caption={`${dashboard.summary.weekLessons} sur 7 jours`} />
            <KpiCard label="Dossiers en attente" tone="amber" value={String(dashboard.summary.pendingDossiers)} caption="Inscriptions à finaliser" />
            <KpiCard label="Documents à traiter" tone="rose" value={String(dashboard.summary.documentsToReview)} caption="Pièces à compléter ou vérifier" />
            <KpiCard label="Examens à venir" tone="violet" value={String(dashboard.summary.upcomingExams)} caption="Présentations planifiées" />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <article className="card-panel-lg">
              <SectionHeader
                linkLabel="Voir le planning"
                linkTo="/secretary/planning"
                subtitle={
                  dashboard.scheduleMode === 'today'
                    ? "Créneaux prévus pour aujourd'hui."
                    : "Aucune leçon aujourd'hui — prochains créneaux de la semaine."
                }
                title={dashboard.scheduleMode === 'today' ? 'Leçons du jour' : 'Prochains créneaux'}
              />
              {dashboard.scheduleItems.length === 0 ? (
                <EmptyPanel message="Aucune leçon programmée pour le moment." />
              ) : (
                <div className="mt-4 grid gap-3">
                  {dashboard.scheduleItems.map((item) => (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3" key={item.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          {item.day} · {item.time}
                        </p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-base font-extrabold text-slate-900">
                        {item.subtitle} — {item.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{item.meta}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="card-panel-lg">
              <SectionHeader
                subtitle="Actions à réaliser aujourd'hui."
                title="Priorités secrétariat"
              />
              {dashboard.priorities.length === 0 ? (
                <EmptyPanel message="Aucune action urgente pour le moment." />
              ) : (
                <div className="mt-4 grid gap-2">
                  {dashboard.priorities.map((item) => (
                    <div
                      className={`rounded-xl border px-3 py-2 ${priorityTone[item.tone] || priorityTone.cyan}`}
                      key={item.id}
                    >
                      <p className="text-xs font-black uppercase tracking-wide opacity-80">{item.label}</p>
                      <p className="mt-1 text-sm font-bold">{item.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <article className="card-panel-lg">
              <SectionHeader
                linkLabel="Inscriptions"
                linkTo="/secretary/inscriptions"
                subtitle="Derniers dossiers élèves."
                title="Inscriptions récentes"
              />
              {dashboard.recentStudents.length === 0 ? (
                <EmptyPanel message="Aucun élève inscrit pour le moment." />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2">Élève</th>
                        <th className="px-3 py-2">Formule</th>
                        <th className="px-3 py-2">Statut</th>
                        <th className="px-3 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentStudents.map((row) => (
                        <tr className="border-b border-slate-100 last:border-0" key={row.id}>
                          <td className="px-3 py-3 font-bold text-slate-900">{row.name}</td>
                          <td className="px-3 py-3 text-slate-600">{row.formation}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-600">{row.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="card-panel-lg">
              <SectionHeader
                linkLabel="Paiements"
                linkTo="/secretary/payments"
                subtitle="Derniers encaissements."
                title="Paiements récents"
              />
              {dashboard.recentPayments.length === 0 ? (
                <EmptyPanel message="Aucun paiement enregistré." />
              ) : (
                <div className="mt-4 grid gap-3">
                  {dashboard.recentPayments.map((row) => (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3" key={row.id}>
                      <div>
                        <p className="font-extrabold text-slate-900">{row.student}</p>
                        <p className="text-sm text-slate-500">
                          {row.nature} · {row.method} · {row.date}
                        </p>
                      </div>
                      <p className="text-lg font-black text-emerald-600">{formatEur(row.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
      )}
    </PageShell>
  )
}

function SectionHeader({ title, subtitle, linkTo, linkLabel }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {linkTo && linkLabel && (
        <Link className="text-sm font-bold text-cyan-700 hover:text-cyan-900" to={linkTo}>
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

function KpiCard({ label, value, caption, tone }) {
  const colors = {
    cyan: 'text-cyan-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    violet: 'text-violet-600',
  }

  return (
    <article className="card-panel">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${colors[tone] || colors.cyan}`}>{value}</p>
      {caption && <p className="mt-2 text-sm font-semibold text-slate-700">{caption}</p>}
    </article>
  )
}

function EmptyPanel({ message }) {
  return (
    <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm font-semibold text-slate-500">
      {message}
    </p>
  )
}
