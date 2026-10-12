import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Car,
  Clock,
  Euro,
  GraduationCap,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'
import AppModal, { AppModalFooter } from '../../components/ui/AppModal'
import PageHero from '../../components/ui/PageHero'
import { useAuth } from '../../context/AuthContext'
import { getUserFacingError } from '../../lib/userFacingError'
import {
  PACKAGE_FAMILY_OPTIONS,
  PACKAGE_FORMATION_OPTIONS,
  PACKAGE_GEARBOX_OPTIONS,
  PACKAGE_RVP_OPTIONS,
  buildPackageCategory,
  categoryEyebrow,
  deletePricingPackage,
  formationAppliesToBothGearboxes,
  formatRvpSummary,
  listPricingPackages,
  packageDisplayStatus,
  packageHasConfiguredPrice,
  parsePackageCategory,
  parsePricingAmount,
  upsertPricingPackage,
} from '../../services/pricing'

const FAMILY_META = {
  permis_b: {
    label: 'Permis B',
    accent: 'from-cyan-500 to-teal-500',
    chip: 'bg-cyan-50 text-cyan-800 ring-cyan-100',
    icon: Car,
  },
  moto: {
    label: 'Permis moto',
    accent: 'from-amber-500 to-orange-500',
    chip: 'bg-amber-50 text-amber-900 ring-amber-100',
    icon: Car,
  },
  code: {
    label: 'Code seul',
    accent: 'from-violet-500 to-purple-500',
    chip: 'bg-violet-50 text-violet-800 ring-violet-100',
    icon: GraduationCap,
  },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes' },
  { value: 'permis_b', label: 'Permis B' },
  { value: 'moto', label: 'Moto' },
  { value: 'code', label: 'Code' },
  { value: 'active', label: 'Actives' },
]

function formatEur(value) {
  if (value === '' || value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toLocaleString('fr-FR')} €`
}

function groupPackagesByFamily(packages) {
  const order = ['permis_b', 'moto', 'code']
  const buckets = Object.fromEntries(order.map((key) => [key, []]))
  packages.forEach((pkg) => {
    const { family } = parsePackageCategory(pkg.category)
    if (buckets[family]) buckets[family].push(pkg)
    else buckets.permis_b.push(pkg)
  })
  return order
    .map((family) => ({ family, packages: buckets[family] }))
    .filter((group) => group.packages.length > 0)
}

function PackageStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
      <p className="mt-1 text-sm font-extrabold text-slate-900">{value}</p>
    </div>
  )
}

function PackageCard({ pkg, canWrite, onEdit, onDelete }) {
  const hasPrice = packageHasConfiguredPrice(pkg)
  const status = packageDisplayStatus(pkg)
  const { family } = parsePackageCategory(pkg.category)
  const meta = FAMILY_META[family] || FAMILY_META.permis_b
  const FamilyIcon = meta.icon
  const rvpSummary = formatRvpSummary(pkg)

  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.5rem] border-2 border-slate-300 bg-white shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/80 hover:shadow-lg">
      <div className={`h-1.5 bg-gradient-to-r ${meta.accent}`} />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${meta.chip}`}>
                <FamilyIcon className="h-3 w-3" />
                {categoryEyebrow(pkg.category)}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-extrabold leading-snug text-slate-950">{pkg.name}</h2>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
              status.key === 'active'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                : status.key === 'pending'
                  ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-100'
                  : 'bg-slate-100 text-slate-500 ring-1 ring-slate-300'
            }`}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-5 flex items-end gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-navy-950">
            {hasPrice ? formatEur(pkg.price_ttc).replace(' €', '') : '—'}
          </span>
          {hasPrice && <span className="pb-1 text-sm font-bold text-slate-400">€ TTC</span>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <PackageStat icon={Clock} label="Heures" value={`${pkg.included_hours}h`} />
          <PackageStat icon={Receipt} label="Frais admin" value={formatEur(pkg.admin_fee_ttc)} />
          <PackageStat
            icon={Euro}
            label="Examen"
            value={
              pkg.exam_presentation_included
                ? formatEur(pkg.exam_presentation_ttc)
                : 'Non inclus'
            }
          />
        </div>

        {rvpSummary && (
          <p className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-xs font-semibold text-cyan-900">
            RVP AAC : {rvpSummary}
          </p>
        )}

        {canWrite && (
          <div className="mt-auto flex gap-2 border-t-2 border-slate-200 pt-4">
            <button
              className="pd-btn-secondary inline-flex flex-1 items-center justify-center gap-2 text-sm"
              onClick={() => onEdit(pkg)}
              type="button"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-50"
              onClick={() => onDelete(pkg)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

const emptyForm = {
  id: null,
  name: '',
  packageFamily: 'permis_b',
  gearbox: 'manuelle',
  formation: 'classique',
  priceTtc: '',
  includedHours: '',
  adminFeeTtc: '',
  examPresentationIncluded: false,
  examPresentationTtc: '',
  extraHourPriceTtc: '',
  rvpIncluded: false,
  rvpTtc: '',
  rvp1Included: false,
  rvp1Ttc: '',
  rvp2Included: false,
  rvp2Ttc: '',
  rvp3Included: false,
  rvp3Ttc: '',
  isActive: true,
}

export default function ManagerPackagesPage() {
  const { profileId, organizationId, canWrite } = useAuth()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const refresh = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    const { packages: rows } = await listPricingPackages()
    setPackages(rows)
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const stats = useMemo(() => {
    const active = packages.filter((pkg) => packageHasConfiguredPrice(pkg) && pkg.is_active).length
    const pending = packages.filter((pkg) => !packageHasConfiguredPrice(pkg) && pkg.is_active).length
    const inactive = packages.filter((pkg) => !pkg.is_active).length
    return { total: packages.length, active, pending, inactive }
  }, [packages])

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const { family } = parsePackageCategory(pkg.category)
      const isSelectable = packageHasConfiguredPrice(pkg) && pkg.is_active
      if (filter === 'active') return isSelectable
      if (filter === 'all') return true
      return family === filter
    })
  }, [packages, filter])

  const groupedPackages = useMemo(
    () => groupPackagesByFamily(filteredPackages),
    [filteredPackages],
  )

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Supprimer la formule « ${pkg.name} » ?`)) return
    await deletePricingPackage(pkg.id)
    refresh()
  }

  const openEdit = (pkg) => {
    const { family, gearbox, formation } = parsePackageCategory(pkg.category)
    setForm({
      id: pkg.id,
      name: pkg.name || '',
      packageFamily: family,
      gearbox: formationAppliesToBothGearboxes(formation) ? null : (gearbox || 'manuelle'),
      formation: formation || 'classique',
      priceTtc: String(pkg.price_ttc ?? ''),
      includedHours: String(pkg.included_hours ?? ''),
      adminFeeTtc: String(pkg.admin_fee_ttc ?? ''),
      examPresentationIncluded: pkg.exam_presentation_included,
      examPresentationTtc: String(pkg.exam_presentation_ttc ?? ''),
      extraHourPriceTtc: String(pkg.extra_hour_price_ttc ?? ''),
      rvpIncluded: Boolean(pkg.rvp_included),
      rvpTtc: String(pkg.rvp_ttc ?? ''),
      rvp1Included: Boolean(pkg.rvp1_included),
      rvp1Ttc: String(pkg.rvp1_ttc ?? ''),
      rvp2Included: Boolean(pkg.rvp2_included),
      rvp2Ttc: String(pkg.rvp2_ttc ?? ''),
      rvp3Included: Boolean(pkg.rvp3_included),
      rvp3Ttc: String(pkg.rvp3_ttc ?? ''),
      isActive: pkg.is_active,
    })
    setSaveError(null)
    setModal(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaveError(null)

    if (!canWrite) {
      setSaveError('Modification impossible : accès en lecture seule.')
      return
    }
    if (!organizationId) {
      setSaveError('Organisation introuvable. Reconnectez-vous.')
      return
    }

    const priceTtc = parsePricingAmount(form.priceTtc)
    const includedHours = parsePricingAmount(form.includedHours)

    if (!Number.isFinite(priceTtc) || priceTtc <= 0) {
      setSaveError('Indiquez un prix TTC supérieur à 0 €.')
      return
    }
    if (!Number.isFinite(includedHours) || includedHours < 0) {
      setSaveError('Indiquez le nombre d\'heures incluses (0 minimum pour le code seul).')
      return
    }

    setSaving(true)
    const category = buildPackageCategory({
      family: form.packageFamily,
      gearbox: form.gearbox,
      formation: form.formation,
    })
    const { error, rvpWarning } = await upsertPricingPackage({ ...form, category, organizationId })
    setSaving(false)

    if (error) {
      setSaveError(getUserFacingError(error, 'save'))
      return
    }

    if (rvpWarning) {
      setSaveError(rvpWarning)
      await refresh()
      return
    }

    setModal(false)
    setForm(emptyForm)
    await refresh()
  }

  if (!profileId) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHero
          eyebrow="Gérant"
          title="Formules & tarifs"
          subtitle="Grille tarifaire de votre auto-école — base du chiffre d'affaires et des contrats."
        />
        <EmptyState title="Connexion requise" icon="💶" message="Connectez-vous en tant que gérant." />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHero
        eyebrow="Gérant"
        title="Formules & tarifs"
        subtitle="Grille tarifaire de votre auto-école — base du chiffre d'affaires, des inscriptions et des contrats élèves."
        actions={canWrite ? (
          <button
            className="pd-btn-primary inline-flex items-center gap-2"
            onClick={() => { setForm(emptyForm); setSaveError(null); setModal(true) }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Nouvelle formule
          </button>
        ) : null}
      >
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            { label: 'Formules', value: stats.total },
            { label: 'Actives', value: stats.active },
            { label: 'À configurer', value: stats.pending },
            { label: 'Inactives', value: stats.inactive },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-cyan-100/80">{item.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </PageHero>

      {stats.pending > 0 && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
          {stats.pending} formule{stats.pending > 1 ? 's' : ''} active{stats.pending > 1 ? 's' : ''} sans prix TTC renseigné.
          {' '}Cliquez sur « Modifier » pour saisir le tarif — sans prix, la formule n&apos;apparaît pas dans les inscriptions élèves.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              filter === option.value
                ? 'bg-navy-950 text-white shadow-sm'
                : 'border-2 border-slate-300 bg-white text-slate-600 hover:border-cyan-200 hover:text-cyan-800'
            }`}
            onClick={() => setFilter(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm font-medium text-slate-500">Chargement de la grille tarifaire…</p>
      ) : filteredPackages.length === 0 ? (
        <EmptyState
          icon="💶"
          message={
            filter === 'all'
              ? 'Créez votre première formule pour alimenter les inscriptions et les contrats.'
              : 'Aucune formule ne correspond à ce filtre.'
          }
          title="Aucune formule"
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groupedPackages.map(({ family, packages: rows }) => {
            const meta = FAMILY_META[family] || FAMILY_META.permis_b
            return (
              <section key={family}>
                <div className="mb-4 flex items-center gap-3">
                  <div className={`h-8 w-1 rounded-full bg-gradient-to-b ${meta.accent}`} />
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950">{meta.label}</h2>
                    <p className="text-sm text-slate-500">
                      {rows.length} formule{rows.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {rows.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      canWrite={canWrite}
                      onDelete={handleDelete}
                      onEdit={openEdit}
                      pkg={pkg}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <AppModal
        open={modal}
        onClose={() => setModal(false)}
        eyebrow="Gérant"
        title={form.id ? 'Modifier la formule' : 'Nouvelle formule'}
        size="xl"
        footer={(
          <AppModalFooter
            onClose={() => setModal(false)}
            submitForm="package-form"
            submitLabel={saving ? 'Enregistrement…' : 'Enregistrer'}
            submitDisabled={saving}
          />
        )}
      >
        <form id="package-form" onSubmit={save}>
          <div className="grid gap-3">
            <label className="block text-sm font-bold">Type de formule *
              <select
                className="pd-input mt-1 w-full"
                value={form.packageFamily}
                onChange={(e) => {
                  const packageFamily = e.target.value
                  setForm((c) => ({
                    ...c,
                    packageFamily,
                    gearbox: packageFamily === 'permis_b' ? c.gearbox : 'manuelle',
                    formation: packageFamily === 'permis_b' ? c.formation : 'classique',
                  }))
                }}
              >
                {PACKAGE_FAMILY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {form.packageFamily === 'permis_b' && (
              <>
                <label className="block text-sm font-bold">Parcours *
                  <select
                    className="pd-input mt-1 w-full"
                    value={form.formation}
                    onChange={(e) => {
                      const formation = e.target.value
                      setForm((c) => ({
                        ...c,
                        formation,
                        gearbox: formationAppliesToBothGearboxes(formation) ? null : c.gearbox,
                        ...(formation === 'aac'
                          ? {}
                          : {
                            rvpIncluded: false,
                            rvpTtc: '',
                            rvp1Included: false,
                            rvp1Ttc: '',
                            rvp2Included: false,
                            rvp2Ttc: '',
                            rvp3Included: false,
                            rvp3Ttc: '',
                          }),
                      }))
                    }}
                  >
                    {PACKAGE_FORMATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {formationAppliesToBothGearboxes(form.formation) ? null : (
                  <label className="block text-sm font-bold">Boîte de vitesses *
                    <select
                      className="pd-input mt-1 w-full"
                      value={form.gearbox}
                      onChange={(e) => setForm((c) => ({ ...c, gearbox: e.target.value }))}
                    >
                      {PACKAGE_GEARBOX_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            <Field
              hint="Laissé vide : nom généré automatiquement à partir du type et des heures."
              label="Nom de la formule"
              onChange={(v) => setForm((c) => ({ ...c, name: v }))}
              value={form.name}
            />
            <Field
              hint="Utilisez un point ou une virgule pour les décimales (ex. 1290,50)."
              inputMode="decimal"
              label="Prix TTC (€) *"
              type="text"
              value={form.priceTtc}
              onChange={(v) => setForm((c) => ({ ...c, priceTtc: v }))}
            />
            <Field inputMode="numeric" label="Heures incluses *" type="text" value={form.includedHours} onChange={(v) => setForm((c) => ({ ...c, includedHours: v }))} />
            <Field inputMode="decimal" label="Frais administratifs TTC (€)" type="text" value={form.adminFeeTtc} onChange={(v) => setForm((c) => ({ ...c, adminFeeTtc: v }))} />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={form.examPresentationIncluded} onChange={(e) => setForm((c) => ({ ...c, examPresentationIncluded: e.target.checked }))} />
              Présentation examen incluse
            </label>
            {form.examPresentationIncluded && (
              <Field inputMode="decimal" label="Montant présentation examen TTC (€)" type="text" value={form.examPresentationTtc} onChange={(v) => setForm((c) => ({ ...c, examPresentationTtc: v }))} />
            )}
            {form.packageFamily === 'permis_b' && form.formation === 'aac' && (
            <fieldset className="rounded-2xl border-2 border-slate-300 bg-slate-50/80 p-4">
              <legend className="px-1 text-sm font-bold text-slate-700">Rendez-vous préalable (AAC)</legend>
              <p className="mb-3 text-xs font-medium text-slate-500">
                Cochez « inclus » si le rendez-vous est compris dans la formule. Sinon, indiquez le tarif TTC facturé à part.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PACKAGE_RVP_OPTIONS.map(({ key, label }) => {
                  const includedKey = `${key}Included`
                  const priceKey = `${key}Ttc`
                  return (
                    <RvpField
                      key={key}
                      included={form[includedKey]}
                      label={label}
                      onIncludedChange={(checked) => setForm((c) => ({
                        ...c,
                        [includedKey]: checked,
                        ...(checked ? { [priceKey]: '' } : {}),
                      }))}
                      onPriceChange={(value) => setForm((c) => ({ ...c, [priceKey]: value }))}
                      price={form[priceKey]}
                    />
                  )
                })}
              </div>
            </fieldset>
            )}
            <Field inputMode="decimal" label="Prix heure supplémentaire TTC (€)" type="text" value={form.extraHourPriceTtc} onChange={(v) => setForm((c) => ({ ...c, extraHourPriceTtc: v }))} />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
              Formule disponible pour les inscriptions
            </label>
            <p className="text-xs font-medium text-slate-500">
              Une formule n&apos;est utilisable que si elle est cochée ici <strong>et</strong> qu&apos;un prix TTC supérieur à 0 € est renseigné.
            </p>
            {saveError && (
              <p className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                saveError.includes('RVP')
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
              >
                {saveError}
              </p>
            )}
          </div>
        </form>
      </AppModal>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', hint, inputMode }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input
        className="pd-input mt-1 w-full"
        inputMode={inputMode}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="mt-1 block text-xs font-medium text-slate-400">{hint}</span>}
    </label>
  )
}

function RvpField({ label, included, price, onIncludedChange, onPriceChange }) {
  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-white p-3">
      <label className="flex items-start gap-2 text-sm font-bold text-slate-700">
        <input
          checked={included}
          className="mt-1"
          onChange={(e) => onIncludedChange(e.target.checked)}
          type="checkbox"
        />
        <span>{label} — inclus dans la formule</span>
      </label>
      {!included && (
        <Field
          inputMode="decimal"
          label="Prix TTC (€)"
          onChange={onPriceChange}
          type="text"
          value={price}
        />
      )}
    </div>
  )
}
