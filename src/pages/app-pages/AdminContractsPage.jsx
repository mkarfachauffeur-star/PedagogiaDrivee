import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileText, Trash2, Upload } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { formatDateTimeFr, staffRoleLabel } from '../../lib/staffAccounts'
import { getUserFacingError } from '../../lib/userFacingError'
import {
  STAFF_CONTRACT_ROLES,
  STAFF_CONTRACT_STATUSES,
  contractStatusesForRole,
  defaultContractStatusForRole,
  deleteStaffContract,
  listStaffContracts,
  subscribeStaffContracts,
  uploadStaffContract,
} from '../../services/staffContracts'
import { listOrganizationUsers } from '../../services/users'

const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp'

const STATUS_BADGE = {
  Secrétaire: 'bg-violet-100 text-violet-800',
  'Enseignant CDI': 'bg-emerald-100 text-emerald-800',
  'Enseignant CDD': 'bg-amber-100 text-amber-800',
  Indépendant: 'bg-sky-100 text-sky-800',
}

function groupStaffByRole(staff) {
  const teachers = staff.filter((member) => member.role === 'teacher')
  const secretaries = staff.filter((member) => member.role === 'secretary')
  return { teachers, secretaries }
}

function StaffContractUploadForm({ staff, disabled, organizationId, profileId, onUploaded }) {
  const [memberId, setMemberId] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const { teachers, secretaries } = useMemo(() => groupStaffByRole(staff), [staff])
  const selectedMember = staff.find((member) => member.id === memberId) || null
  const statusOptions = useMemo(
    () => contractStatusesForRole(selectedMember?.role),
    [selectedMember?.role],
  )

  useEffect(() => {
    if (!staff.some((member) => member.id === memberId)) {
      const first = teachers[0] || secretaries[0] || null
      setMemberId(first?.id || '')
    }
  }, [staff, memberId, teachers, secretaries])

  useEffect(() => {
    if (!selectedMember) {
      setEmploymentStatus('')
      return
    }
    const options = contractStatusesForRole(selectedMember.role)
    if (!options.includes(employmentStatus)) {
      setEmploymentStatus(defaultContractStatusForRole(selectedMember.role))
    }
  }, [selectedMember, employmentStatus])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!memberId || !file || !organizationId || !employmentStatus) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const { error: uploadError } = await uploadStaffContract({
      organizationId,
      profileId: memberId,
      employmentStatus,
      notes,
      file,
      uploadedBy: profileId,
    })
    if (uploadError) {
      setError(getUserFacingError(uploadError, 'document'))
    } else {
      setSuccess('Contrat enregistré.')
      setFile(null)
      setNotes('')
      setFileInputKey((value) => value + 1)
      onUploaded?.()
    }
    setSubmitting(false)
  }

  if (!staff.length) {
    return (
      <EmptyState
        icon="👤"
        message="Créez d'abord des comptes enseignants ou secrétaires (menu Enseignants / Utilisateurs), puis revenez déposer leurs contrats ici."
        title="Aucun enseignant ni secrétaire"
      />
    )
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-bold text-slate-700">
        Enseignant ou secrétaire concerné
        <select
          className="pd-input mt-2 w-full"
          disabled={disabled || submitting}
          onChange={(event) => setMemberId(event.target.value)}
          required
          value={memberId}
        >
          {teachers.length > 0 && (
            <optgroup label="Enseignants">
              {teachers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </optgroup>
          )}
          {secretaries.length > 0 && (
            <optgroup label="Secrétaires">
              {secretaries.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="mt-1 block text-xs font-medium text-slate-500">
          Seuls les comptes déjà créés dans votre auto-école sont proposés.
        </span>
      </label>

      {selectedMember && (
        <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            <span className="font-bold text-slate-800">Fonction :</span>{' '}
            {staffRoleLabel(selectedMember.role, selectedMember.gender)}
          </p>
          <p className="mt-1">
            <span className="font-bold text-slate-800">E-mail :</span> {selectedMember.email || '—'}
          </p>
        </div>
      )}

      <label className="block text-sm font-bold text-slate-700">
        Statut du contrat
        <select
          className="pd-input mt-2 w-full"
          disabled={disabled || submitting || statusOptions.length <= 1}
          onChange={(event) => setEmploymentStatus(event.target.value)}
          required
          value={employmentStatus}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <span className="mt-1 block text-xs font-medium text-slate-500">
          {selectedMember?.role === 'secretary'
            ? 'Statut fixé pour un compte secrétaire.'
            : 'Choisissez CDI, CDD ou indépendant pour l\'enseignant sélectionné.'}
        </span>
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Fichier du contrat signé
        <input
          key={fileInputKey}
          accept={ACCEPT}
          className="pd-input mt-2 w-full"
          disabled={disabled || submitting}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          required
          type="file"
        />
        <span className="mt-1 block text-xs font-medium text-slate-500">
          PDF, Word ou image — l&apos;application archive votre document sans le rédiger.
        </span>
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Notes (optionnel)
        <textarea
          className="pd-input mt-2 min-h-20 w-full"
          disabled={disabled || submitting}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex. signé le 12/03/2026, renouvellement annuel…"
          value={notes}
        />
      </label>

      <button
        className="pd-btn-primary inline-flex w-full items-center justify-center gap-2"
        disabled={disabled || submitting || !file || !memberId || !employmentStatus}
        type="submit"
      >
        <Upload className="h-4 w-4" />
        {submitting ? 'Enregistrement…' : 'Enregistrer le contrat'}
      </button>

      {success && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </p>
      )}
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
    </form>
  )
}

function StaffContractsList({ contracts, disabled, onRefresh }) {
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const handleDelete = async (contract) => {
    if (!window.confirm(`Supprimer le contrat de ${contract.profile?.full_name || 'ce membre'} ?`)) return
    setBusyId(contract.id)
    setError(null)
    const { error: deleteError } = await deleteStaffContract(contract)
    if (deleteError) setError(getUserFacingError(deleteError, 'document'))
    else onRefresh?.()
    setBusyId(null)
  }

  if (!contracts.length) {
    return (
      <EmptyState
        icon="📄"
        message="Déposez ici les contrats signés de vos enseignants et secrétaires (PDF, Word, scan…)."
        title="Aucun contrat enregistré"
      />
    )
  }

  return (
    <div className="space-y-3">
      {contracts.map((contract) => {
        const status = contract.employment_status || contract.title
        const badgeClass = STATUS_BADGE[status] || 'bg-slate-100 text-slate-700'
        return (
          <article
            key={contract.id}
            className="flex flex-col gap-3 rounded-2xl border-2 border-slate-300 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-extrabold text-slate-900">
                  {contract.profile?.full_name || 'Membre inconnu'}
                </p>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {staffRoleLabel(contract.profile?.role, contract.profile?.gender)}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass}`}>
                  {status}
                </span>
              </div>
              <p className="mt-2 truncate text-sm text-slate-600">{contract.file_name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Déposé le {formatDateTimeFr(contract.created_at)}
                {contract.notes ? ` · ${contract.notes}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {contract.url && (
                <a
                  className="pd-btn-secondary inline-flex items-center gap-2"
                  href={contract.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Download className="h-4 w-4" />
                  Ouvrir
                </a>
              )}
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                disabled={disabled || busyId === contract.id}
                onClick={() => handleDelete(contract)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>
          </article>
        )
      })}
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default function AdminContractsPage() {
  const { profileId, organizationId, canWrite } = useAuth()
  const [staff, setStaff] = useState([])
  const [contracts, setContracts] = useState([])
  const [filterProfileId, setFilterProfileId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refresh = useCallback(async () => {
    if (!profileId) {
      setStaff([])
      setContracts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const [{ users, error: usersError }, { contracts: rows, error: contractsError }] = await Promise.all([
      listOrganizationUsers(),
      listStaffContracts({
        profileId: filterProfileId || undefined,
        employmentStatus: filterStatus || undefined,
      }),
    ])
    if (usersError || contractsError) {
      setLoadError('Impossible de charger les contrats du personnel.')
    }
    setStaff((users || []).filter((user) => STAFF_CONTRACT_ROLES.includes(user.role)))
    setContracts(rows || [])
    setLoading(false)
  }, [profileId, filterProfileId, filterStatus])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!profileId) return undefined
    return subscribeStaffContracts(refresh)
  }, [profileId, refresh])

  const staffOptions = useMemo(
    () => [...staff].sort((a, b) => a.full_name.localeCompare(b.full_name, 'fr')),
    [staff],
  )

  const allStatusOptions = useMemo(
    () => [...STAFF_CONTRACT_STATUSES.secretary, ...STAFF_CONTRACT_STATUSES.teacher],
    [],
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="overflow-hidden rounded-[2rem] border-2 border-slate-300 bg-white shadow-[var(--shadow-card)]">
        <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-cyan-900 p-6 text-white md:p-8">
          <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-sm font-semibold text-cyan-100">
            Contrats
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Contrats du personnel
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-cyan-50/85">
            Archivez les contrats de vos enseignants et secrétaires déjà enregistrés dans l&apos;application.
            Indiquez le statut (secrétaire, enseignant CDI/CDD ou indépendant) et téléversez le document signé.
          </p>
        </div>
      </section>

      {!profileId ? (
        <EmptyState icon="📄" message="Connectez-vous pour gérer les contrats du personnel." title="Connexion requise" />
      ) : loading ? (
        <p className="text-sm font-medium text-slate-500">Chargement…</p>
      ) : loadError ? (
        <EmptyState icon="⚠️" message={loadError} title="Erreur de chargement" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <article className="rounded-[1.75rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="mb-5 flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">Déposer un contrat</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choisissez l&apos;enseignant ou le secrétaire, son statut, puis le fichier.
                </p>
              </div>
            </div>
            <StaffContractUploadForm
              disabled={!canWrite}
              onUploaded={refresh}
              organizationId={organizationId}
              profileId={profileId}
              staff={staffOptions}
            />
          </article>

          <article className="rounded-[1.75rem] border-2 border-slate-300 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">Contrats enregistrés</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {contracts.length} document{contracts.length > 1 ? 's' : ''} archivé{contracts.length > 1 ? 's' : ''}.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block min-w-[12rem] text-sm font-bold text-slate-700">
                  Filtrer par membre
                  <select
                    className="pd-input mt-2 w-full"
                    onChange={(event) => setFilterProfileId(event.target.value)}
                    value={filterProfileId}
                  >
                    <option value="">Tous</option>
                    {staffOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-[12rem] text-sm font-bold text-slate-700">
                  Filtrer par statut
                  <select
                    className="pd-input mt-2 w-full"
                    onChange={(event) => setFilterStatus(event.target.value)}
                    value={filterStatus}
                  >
                    <option value="">Tous les statuts</option>
                    {allStatusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <StaffContractsList contracts={contracts} disabled={!canWrite} onRefresh={refresh} />
          </article>
        </div>
      )}
    </div>
  )
}
