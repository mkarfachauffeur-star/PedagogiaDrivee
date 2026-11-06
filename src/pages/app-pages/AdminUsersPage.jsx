import { useCallback, useEffect, useMemo, useState } from 'react'
import { ui } from '../../components/ui/styles'
import PageHeader from '../../components/ui/PageHeader'
import CreateUserModal from '../../components/users/CreateUserModal'
import AppModal, { AppModalFooter } from '../../components/ui/AppModal'
import EmptyState from '../../components/ui/EmptyState'
import Notice from '../../components/ui/Notice'
import ListSearchField from '../../components/ui/ListSearchField'
import PaginationBar from '../../components/ui/PaginationBar'
import { useAuth } from '../../context/AuthContext'
import { normalizeSearchText, useClientPagination } from '../../hooks/useClientPagination'
import {
  computeAccountStatus,
  formatDateTimeFr,
  staffRoleLabel,
  STATUS_BADGE,
} from '../../lib/staffAccounts'
import { getUserFacingError } from '../../lib/userFacingError'
import { listOrganizationUsers, manageUser, sendStaffPasswordReset, setStaffAccountActive, subscribeOrganizationUsers } from '../../services/users'

const ROLE_ORDER = { manager: 0, secretary: 1, teacher: 2 }
const ROLE_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'manager', label: 'Gérant' },
  { value: 'secretary', label: 'Secrétariat' },
  { value: 'teacher', label: 'Enseignants' },
]

export default function AdminUsersPage() {
  const { profileId, canWrite } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [resetConfirmUser, setResetConfirmUser] = useState(null)
  const [actionBusy, setActionBusy] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const roleCounts = useMemo(() => {
    const counts = { all: users.length }
    for (const user of users) counts[user.role] = (counts[user.role] || 0) + 1
    return counts
  }, [users])

  const visibleUsers = useMemo(
    () =>
      users
        .filter((user) => roleFilter === 'all' || user.role === roleFilter)
        .sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || (a.full_name || '').localeCompare(b.full_name || '', 'fr')),
    [users, roleFilter],
  )

  const {
    page,
    setPage,
    totalPages,
    totalItems,
    pageItems,
    pageSize,
  } = useClientPagination(visibleUsers, {
    pageSize: 10,
    query: searchQuery,
    filterFn: (user, query) => {
      const haystack = normalizeSearchText(
        `${user.full_name || ''} ${user.email || ''} ${staffRoleLabel(user.role, user.gender) || ''}`,
      )
      const q = normalizeSearchText(query)
      return q.split(/\s+/).filter(Boolean).every((part) => haystack.includes(part))
    },
  })

  const refresh = useCallback(async () => {
    if (!profileId) {
      setUsers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const { users: rows, error } = await listOrganizationUsers()
    if (error) setLoadError('Impossible de charger les utilisateurs.')
    setUsers(rows)
    setLoading(false)
  }, [profileId])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    if (!profileId) return undefined
    return subscribeOrganizationUsers(refresh)
  }, [profileId, refresh])

  const runAction = async (action, user) => {
    if (!canWrite) return
    const userId = user.id

    if (action === 'delete' && !window.confirm('Supprimer définitivement ce compte ?')) return
    if (action === 'disable' && !window.confirm('Désactiver ce compte ?')) return
    if (action === 'reset_password') {
      setResetConfirmUser(user)
      return
    }

    setActionBusy(userId + action)
    setFeedback(null)

    let result
    if (action === 'disable') {
      result = await setStaffAccountActive(userId, false)
    } else if (action === 'enable') {
      result = await setStaffAccountActive(userId, true)
    } else {
      result = await manageUser(action, userId)
    }

    const { error, message } = result
    setActionBusy(null)
    if (error) {
      setFeedback({
        type: 'error',
        text: getUserFacingError(error, 'permission'),
      })
    } else {
      setFeedback({ type: 'ok', text: message })
      refresh()
    }
  }

  const confirmPasswordReset = async () => {
    if (!resetConfirmUser || !canWrite) return
    const userId = resetConfirmUser.id

    setActionBusy(userId + 'reset_password')
    setFeedback(null)

    const { error, message } = await sendStaffPasswordReset(userId)

    setActionBusy(null)
    setResetConfirmUser(null)

    if (error) {
      setFeedback({ type: 'error', text: getUserFacingError(error, 'L’e-mail de réinitialisation n’a pas pu être envoyé. Veuillez réessayer.') })
    } else {
      setFeedback({ type: 'ok', text: message })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
            <button className={ui.btnPrimary} disabled={!canWrite} onClick={() => setModalOpen(true)} type="button">
              Créer un utilisateur
            </button>
        }
        description="Comptes de connexion, rôles et invitations de votre auto-école."
        title="Utilisateurs"
      />

      {feedback && <Notice tone={feedback.type === 'ok' ? 'success' : 'danger'}>{feedback.text}</Notice>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!profileId ? (
          <div className="p-5"><EmptyState title="Connexion requise" message="Connectez-vous avec votre compte gérant." icon="🔐" /></div>
        ) : loading ? (
          <p className="p-5 text-sm font-medium text-slate-500">Chargement…</p>
        ) : loadError ? (
          <div className="p-5"><EmptyState title="Erreur" message={loadError} icon="⚠️" /></div>
        ) : users.length === 0 ? (
          <div className="p-5"><EmptyState title="Aucun utilisateur" message="Créez le premier compte staff de votre auto-école." icon="👤" /></div>
        ) : (
          <>
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
            <ListSearchField onChange={setSearchQuery} placeholder="Rechercher un nom ou un e-mail" value={searchQuery} />
            <div className="flex flex-wrap items-center gap-2">
              {ROLE_FILTERS.filter((item) => item.value === 'all' || roleCounts[item.value]).map((item) => (
                <button
                  aria-pressed={roleFilter === item.value}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                    roleFilter === item.value
                      ? 'border-[#1769FF] bg-[#1769FF] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  key={item.value}
                  onClick={() => setRoleFilter(item.value)}
                  type="button"
                >
                  {item.label}
                  <span className={roleFilter === item.value ? 'text-white/80' : 'text-slate-400'}>{roleCounts[item.value] || 0}</span>
                </button>
              ))}
              <p className="ml-auto text-xs text-slate-500">{totalItems} utilisateur{totalItems > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="block min-w-full text-left text-sm md:table">
              <thead className="hidden border-b border-slate-200 bg-slate-50 text-xs text-slate-500 md:table-header-group">
                <tr>
                  <th className="px-4 py-3 font-medium">Nom complet</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Dernière connexion</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="block md:table-row-group">
                {pageItems.map((user) => {
                  const status = computeAccountStatus({
                    isActive: user.is_active,
                    invitedAt: user.invited_at,
                    emailConfirmedAt: user.email_confirmed_at,
                    lastSignInAt: user.last_sign_in_at,
                  })
                  const busy = actionBusy?.startsWith(user.id)
                  const isSelf = user.id === profileId
                  const isRegistered = status.label === 'Actif'
                  return (
                    <tr key={user.id} className="block border-b border-slate-100 px-4 py-3 last:border-0 md:table-row md:p-0">
                      <td className="block font-medium text-slate-900 md:table-cell md:px-4 md:py-3">
                        {user.full_name || '—'}
                        {isSelf && (
                          <span className="ml-2 text-xs font-normal text-slate-400">(vous)</span>
                        )}
                      </td>
                      <td className="block break-all text-sm text-slate-600 md:table-cell md:break-normal md:px-4 md:py-3">{user.email || '—'}</td>
                      <td className="mt-2 mr-2 inline-block md:mt-0 md:mr-0 md:table-cell md:px-4 md:py-3">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {staffRoleLabel(user.role, user.gender) || user.role}
                        </span>
                      </td>
                      <td className="inline-block md:table-cell md:px-4 md:py-3">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${STATUS_BADGE[status.tone]}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="mt-1 block text-xs text-slate-500 md:mt-0 md:table-cell md:px-4 md:py-3 md:text-sm"><span className="md:hidden">Dernière connexion : </span>{formatDateTimeFr(user.last_sign_in_at)}</td>
                      <td className="mt-3 block md:mt-0 md:table-cell md:px-4 md:py-3">
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          {status.label === 'Invitation en attente' && (
                            <ActionBtn disabled={busy || !canWrite} onClick={() => runAction('resend_invite', user)} label="Renvoyer" />
                          )}
                          {isRegistered && (
                            <ActionBtn disabled={busy || !canWrite} onClick={() => runAction('reset_password', user)} label="Mot de passe" />
                          )}
                          {user.is_active ? (
                            !isSelf && (
                              <ActionBtn disabled={busy || !canWrite} onClick={() => runAction('disable', user)} label="Désactiver" tone="amber" />
                            )
                          ) : (
                            <ActionBtn disabled={busy || !canWrite} onClick={() => runAction('enable', user)} label="Réactiver" tone="emerald" />
                          )}
                          {!isSelf && (
                            <ActionBtn disabled={busy || !canWrite} onClick={() => runAction('delete', user)} label="Supprimer" tone="rose" />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <PaginationBar
            className="p-4"
            onPageChange={setPage}
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            totalPages={totalPages}
          />
          </>
        )}
      </section>

      <CreateUserModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={() => refresh()} />

      <AppModal
        open={Boolean(resetConfirmUser)}
        onClose={() => !actionBusy && setResetConfirmUser(null)}
        eyebrow="Utilisateurs"
        title="Réinitialiser le mot de passe ?"
        size="sm"
        disableClose={Boolean(actionBusy)}
        footer={(
          <AppModalFooter
            onClose={() => setResetConfirmUser(null)}
            closeLabel="Annuler"
            hideSubmit
          >
            <button
              type="button"
              disabled={Boolean(actionBusy)}
              onClick={confirmPasswordReset}
              className="pd-btn-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionBusy ? 'Envoi…' : 'Réinitialiser le mot de passe'}
            </button>
          </AppModalFooter>
        )}
      >
        {resetConfirmUser && (
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              Voulez-vous réinitialiser le mot de passe de{' '}
              <span className="font-semibold text-slate-900">{resetConfirmUser.full_name || 'cet utilisateur'}</span>
              {' '}?
            </p>
            <p>
              Un e-mail sera envoyé à{' '}
              <span className="font-semibold text-slate-800">{resetConfirmUser.email || '—'}</span>
              {' '}avec un lien pour définir un nouveau mot de passe.
            </p>
          </div>
        )}
      </AppModal>
    </div>
  )
}

function ActionBtn({ label, onClick, disabled, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-300 text-slate-700 hover:bg-slate-50',
    amber: 'border-amber-200 text-amber-800 hover:bg-amber-50',
    emerald: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    rose: 'border-rose-200 text-rose-700 hover:bg-rose-50',
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-lg border bg-white px-2.5 text-xs font-medium transition disabled:opacity-50 ${tones[tone]}`}
    >
      {label}
    </button>
  )
}
