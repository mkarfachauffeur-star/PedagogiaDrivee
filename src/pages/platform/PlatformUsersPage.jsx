import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { Pagination, SearchInput, TestDataToggle } from '../../components/ui/TableTools'
import { useConfirm } from '../../components/ui/useConfirm'
import { isTestOrganization, isTestProfile } from '../../lib/platformTestData'
import { listAllOrganizations, listAllProfiles, updateProfileBySuperAdmin } from '../../services/platform'
import { roleLabels } from '../../utils/authSession'

const PAGE_SIZE = 25
const ROLE_FILTERS = ['manager', 'secretary', 'teacher', 'student']

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export default function PlatformUsersPage() {
  const [profiles, setProfiles] = useState([])
  const [testOrganizationIds, setTestOrganizationIds] = useState(() => new Set())
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [showTest, setShowTest] = useState(false)
  const [page, setPage] = useState(1)
  const [confirm, confirmDialog] = useConfirm()

  const refresh = () => {
    Promise.all([listAllProfiles(), listAllOrganizations()]).then(([profilesRes, orgsRes]) => {
      setProfiles(profilesRes.profiles)
      setTestOrganizationIds(new Set(orgsRes.organizations.filter((org) => isTestOrganization(org)).map((org) => org.id)))
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  const toggleActive = async (profile) => {
    const deactivate = profile.is_active
    const ok = await confirm({
      title: deactivate ? `Désactiver ${profile.full_name || profile.email} ?` : `Réactiver ${profile.full_name || profile.email} ?`,
      description: deactivate
        ? 'La personne ne pourra plus se connecter. Ses données sont conservées et le compte peut être réactivé.'
        : 'La personne pourra de nouveau se connecter.',
      confirmLabel: deactivate ? 'Désactiver' : 'Réactiver',
      danger: deactivate,
    })
    if (!ok) return
    await updateProfileBySuperAdmin(profile.id, { is_active: !profile.is_active })
    refresh()
  }

  const organizations = useMemo(() => {
    const byId = new Map()
    profiles.forEach((profile) => {
      if (profile.organization?.id) byId.set(profile.organization.id, profile.organization.name)
    })
    return [...byId.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'fr'))
  }, [profiles])

  const testCount = useMemo(
    () => profiles.filter((profile) => isTestProfile(profile, testOrganizationIds)).length,
    [profiles, testOrganizationIds],
  )

  const filtered = useMemo(() => {
    const term = normalize(search.trim())
    return profiles.filter((profile) => {
      if (!showTest && isTestProfile(profile, testOrganizationIds)) return false
      if (role && profile.role !== role) return false
      if (organizationId && profile.organization?.id !== organizationId) return false
      if (term && !normalize(`${profile.full_name} ${profile.email} ${profile.organization?.name}`).includes(term)) return false
      return true
    })
  }, [profiles, search, role, organizationId, showTest, testOrganizationIds])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const resetPage = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        description="Tous les comptes rattachés aux auto-écoles, hors comptes Super Admin."
        title="Utilisateurs"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <SearchInput onChange={resetPage(setSearch)} placeholder="Nom, e-mail ou auto-école" value={search} />
        <select aria-label="Rôle" className={`${ui.input} mt-0`} onChange={(event) => resetPage(setRole)(event.target.value)} value={role}>
          <option value="">Tous les rôles</option>
          {ROLE_FILTERS.map((value) => (
            <option key={value} value={value}>
              {roleLabels[value] || value}
            </option>
          ))}
        </select>
        <select
          aria-label="Auto-école"
          className={`${ui.input} mt-0`}
          onChange={(event) => resetPage(setOrganizationId)(event.target.value)}
          value={organizationId}
        >
          <option value="">Toutes les auto-écoles</option>
          {organizations.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <span className="font-medium text-slate-900">{filtered.length}</span> utilisateur{filtered.length > 1 ? 's' : ''}
        </p>
        {testCount > 0 && <TestDataToggle checked={showTest} count={testCount} onChange={resetPage(setShowTest)} />}
      </div>

      <div className={ui.tableWrap}>
        <table className={`${ui.table} min-w-[960px]`}>
          <thead>
            <tr>
              <th className={ui.th}>Nom</th>
              <th className={ui.th}>E-mail</th>
              <th className={ui.th}>Rôle</th>
              <th className={ui.th}>Auto-école</th>
              <th className={ui.th}>Statut</th>
              <th className={`${ui.th} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={ui.tdEmpty} colSpan={6}>
                  Aucun utilisateur ne correspond à ces critères.
                </td>
              </tr>
            ) : (
              rows.map((profile) => (
                <tr className={ui.tr} key={profile.id}>
                  <td className={`${ui.tdStrong} min-w-[10rem]`}>{profile.full_name || '—'}</td>
                  <td className={ui.td}>{profile.email || '—'}</td>
                  <td className={ui.td}>{roleLabels[profile.role] || profile.role}</td>
                  <td className={`${ui.td} min-w-[12rem]`}>{profile.organization?.name || '—'}</td>
                  <td className={ui.td}>
                    <StatusBadge tone={profile.is_active ? 'success' : 'neutral'}>
                      {profile.is_active ? 'Actif' : 'Désactivé'}
                    </StatusBadge>
                  </td>
                  <td className={`${ui.td} text-right`}>
                    <button
                      className={profile.is_active ? ui.btnSmallDanger : ui.btnSmall}
                      onClick={() => toggleActive(profile)}
                      type="button"
                    >
                      {profile.is_active ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination onChange={setPage} page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} />
      {confirmDialog}
    </div>
  )
}
