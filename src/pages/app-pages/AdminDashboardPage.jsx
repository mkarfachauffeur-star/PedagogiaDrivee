import { useCallback, useEffect, useState } from 'react'
import Notice from '../../components/ui/Notice'
import { useSecretaryDuties } from '../../hooks/useSecretaryDuties'
import { Building2, CalendarDays, GraduationCap, Hourglass, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import EmptyState from '../../components/ui/EmptyState'
import PageHero from '../../components/ui/PageHero'
import PageShell from '../../components/ui/PageShell'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { formatEur } from '../../services/finance'
import { fetchManagerDashboard } from '../../services/managerDashboard'
import { orgLogoUrl } from '../../services/organization'

const priorityTone = {
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  rose: 'border-rose-200 bg-rose-50 text-rose-900',
  cyan: 'border-blue-200 bg-blue-50 text-blue-900',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
}

export default function AdminDashboardPage() {
  const { managerCovers } = useSecretaryDuties()
  const { profileId, organizationId, organization, profile, loading: authLoading } = useAuth()
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
    const { dashboard: data, error } = await fetchManagerDashboard({ organizationId })
    if (error || !data) setLoadError('Impossible de charger le tableau de bord.')
    setDashboard(data)
    setLoading(false)
  }, [authLoading, profileId, organizationId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const orgName = organization?.name || 'Votre auto-école'
  const managerName = organization?.manager_name || profile?.full_name || ''
  const city = organization?.city || ''
  const logoUrl = orgLogoUrl(organization?.logo_storage_path)
  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <PageShell>
      <PageHero
        title="Tableau de bord"
        subtitle={`Vue d’ensemble de votre auto-école · ${todayLabel}`}
      />

      {managerCovers ? (
        <Notice tone="info">
          Votre auto-école n’a pas de compte secrétaire actif : vous gérez aussi le planning, les inscriptions et les paiements.
          Dès qu’un secrétaire est créé dans Utilisateurs, ces tâches passent au secrétariat.
        </Notice>
      ) : null}

      {organizationId && (
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo ${orgName}`}
              className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-blue-50 text-[#1769FF]">
              <Building2 className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">{orgName}</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {[managerName, city].filter(Boolean).join(' · ') || 'Complétez le profil dans Paramètres'}
            </p>
          </div>
          <Link
            to="/manager/settings"
            className="inline-flex h-8 shrink-0 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Profil auto-école
          </Link>
        </section>
      )}

      {authLoading || loading ? (
        <p className="text-sm text-slate-500">Chargement du tableau de bord…</p>
      ) : !profileId ? (
        <EmptyState title="Connexion requise" message="Connectez-vous avec votre compte gérant." icon="📊" />
      ) : !organizationId ? (
        <EmptyState
          title="Auto-école introuvable"
          message="Votre compte n'est rattaché à aucune organisation. Contactez le support."
          icon="🏫"
        />
      ) : loadError || !dashboard ? (
        <EmptyState title="Erreur de chargement" message={loadError || 'Données indisponibles.'} icon="⚠️" />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <KpiCard
              caption="Élèves en formation"
              hint={`${dashboard.summary.teacherCount} enseignant(s) actif(s)`}
              label="Élèves actifs"
              tone="indigo"
              value={String(dashboard.summary.activeStudents)}
            />
            <KpiCard
              caption={`${dashboard.summary.upcomingLessons} créneau(x) sur 7 jours`}
              hint={`${dashboard.summary.todayLessons} aujourd'hui`}
              label="Planning"
              tone="violet"
              value={`${dashboard.finance.hoursCompleted} h`}
              valueSuffix=" réalisées"
            />
            <KpiCard
              caption={`${formatEur(dashboard.finance.annualRevenue)} sur l'année`}
              hint="Encaissements du mois en cours"
              label="CA du mois"
              tone="cyan"
              value={formatEur(dashboard.finance.monthlyRevenue)}
            />
            <KpiCard
              caption={`${formatEur(dashboard.finance.totalCollected)} déjà encaissés`}
              hint={`Contrats : ${formatEur(dashboard.finance.contractTotal)}`}
              label="Reste à encaisser"
              tone="amber"
              value={formatEur(dashboard.finance.remainingToCollect)}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <article className="card-panel-lg xl:col-span-2">
              <SectionHeader
                linkLabel="Voir les élèves"
                linkTo="/manager/students"
                subtitle="Situation de vos dossiers en cours."
                title="Élèves inscrits"
              />
              {dashboard.studentRows.length === 0 ? (
                <EmptyPanel message="Aucun élève inscrit pour le moment." />
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="px-3 py-2 font-medium">Élève</th>
                        <th className="px-3 py-2">Formation</th>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.studentRows.map((row) => (
                        <tr className="border-b border-slate-100 last:border-0" key={row.id}>
                          <td className="px-3 py-3 font-medium text-slate-900">{row.name}</td>
                          <td className="px-3 py-3 text-slate-600">{row.formation}</td>
                          <td className="px-3 py-3 text-slate-600">{row.code}</td>
                          <td className="px-3 py-3">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="card-panel-lg">
              <SectionHeader
                linkLabel="Flotte"
                linkTo="/manager/vehicles"
                subtitle="Disponibilité de vos véhicules."
                title="Véhicules"
              />
              <p className="mt-3 text-2xl font-semibold tabular-nums text-emerald-600">
                {dashboard.summary.availableVehicles}/{dashboard.summary.vehicleCount}
                <span className="ml-2 text-sm font-normal text-slate-500">disponibles</span>
              </p>
              <div className="mt-4 grid gap-2">
                {dashboard.fleetRows.length === 0 ? (
                  <EmptyPanel message="Aucun véhicule enregistré." />
                ) : (
                  dashboard.fleetRows.map((row) => (
                    <div className="rounded-lg border border-slate-200 px-3 py-2" key={row.id}>
                      <p className="text-sm font-medium text-slate-900">{row.label}</p>
                      <p className="text-xs text-slate-500">
                        {row.plate} · {row.availability}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <article className="card-panel-lg">
              <SectionHeader
                linkLabel="Planning complet"
                linkTo="/manager/planning"
                subtitle={
                  dashboard.scheduleMode === 'upcoming'
                    ? 'Prochains créneaux sur les 7 prochains jours.'
                    : 'Derniers créneaux enregistrés (aucun à venir).'
                }
                title={dashboard.scheduleMode === 'upcoming' ? 'Prochains créneaux' : 'Derniers créneaux'}
              />
              {dashboard.scheduleItems.length === 0 ? (
                <EmptyPanel message="Aucun créneau enregistré." />
              ) : (
                <div className="mt-4 grid gap-3">
                  {dashboard.scheduleItems.map((item) => (
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3" key={item.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-500">
                          {item.day} · {item.time}
                        </p>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-base font-semibold text-slate-900">
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
                linkLabel="Voir les paiements"
                linkTo="/manager/payments"
                subtitle="Derniers encaissements enregistrés."
                title="Paiements récents"
              />
              {dashboard.recentPayments.length === 0 ? (
                <EmptyPanel message="Aucun paiement enregistré." />
              ) : (
                <div className="mt-4 grid gap-3">
                  {dashboard.recentPayments.map((row) => (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3" key={row.id}>
                      <div>
                        <p className="font-semibold text-slate-900">{row.student}</p>
                        <p className="text-sm text-slate-500">
                          {row.nature} · {row.method} · {row.date}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-emerald-600">{formatEur(row.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <article className="card-panel-lg xl:col-span-2">
              <SectionHeader
                linkLabel="Évolution du CA"
                linkTo="/manager/statistics"
                subtitle="Indicateurs financiers consolidés."
                title="Synthèse financière"
              />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatTile label="Total encaissé" value={formatEur(dashboard.finance.totalCollected)} />
                <StatTile label="Panier moyen / élève" value={formatEur(dashboard.finance.averageBasket)} />
                <StatTile label="Heures réalisées" value={`${dashboard.finance.hoursCompleted} h`} />
              </div>
            </article>

            <article className="card-panel-lg">
              <SectionHeader
                subtitle="Actions à traiter en priorité."
                title="À traiter"
              />
              {dashboard.priorities.length === 0 ? (
                <EmptyPanel message="Aucune action urgente." />
              ) : (
                <div className="mt-4 grid gap-2">
                  {dashboard.priorities.map((item) => (
                    <div
                      className={`rounded-xl border px-3 py-2 ${priorityTone[item.tone] || priorityTone.cyan}`}
                      key={item.id}
                    >
                      <p className="text-xs font-medium opacity-80">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold">{item.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          {dashboard.teacherNames.length > 0 && (
            <section className="card-panel">
              <p className="text-sm font-semibold text-slate-500">Équipe pédagogique</p>
              <p className="mt-2 text-base font-semibold text-slate-800">
                {dashboard.teacherNames.join(' · ')}
              </p>
            </section>
          )}
        </div>
      )}
    </PageShell>
  )
}

function SectionHeader({ title, subtitle, linkTo, linkLabel }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {linkTo && linkLabel && (
        <Link className="text-sm font-medium text-[#1769FF] hover:underline" to={linkTo}>
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

const KPI_ICONS = { indigo: GraduationCap, violet: CalendarDays, cyan: Wallet, amber: Hourglass }
const KPI_ACCENTS = { indigo: 'blue', violet: 'violet', cyan: 'emerald', amber: 'amber' }

/** Indicateur du tableau de bord, sur la carte de chiffres commune. */
function KpiCard({ label, value, valueSuffix = '', caption, hint, tone }) {
  return (
    <StatCard
      accent={KPI_ACCENTS[tone] || 'blue'}
      detail={[caption, hint].filter(Boolean).join(' · ')}
      icon={KPI_ICONS[tone]}
      label={label}
      value={`${value}${valueSuffix}`}
    />
  )
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

function EmptyPanel({ message }) {
  return (
    <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm font-semibold text-slate-500">
      {message}
    </p>
  )
}
