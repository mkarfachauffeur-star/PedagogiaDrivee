import { useCallback, useEffect, useMemo, useState } from 'react'
import Notice from '../../components/ui/Notice'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { ui } from '../../components/ui/styles'
import { TestDataToggle } from '../../components/ui/TableTools'
import { useConfirm } from '../../components/ui/useConfirm'
import { isTestProspect } from '../../lib/platformTestData'
import { BETA_PILOT_ORG_LIMIT } from '../../config/beta'
import { formatPlatformDateTime } from '../../lib/platformPlans'
import { supabase } from '../../lib/supabase'
import { fetchBetaPilotStatus } from '../../services/beta'
import { acceptProspect, deleteProspectRecord, listProspects, refuseProspect, resendManagerInvite } from '../../services/prospects'
import { deleteOrganization, recordRequestedPlan } from '../../services/platform'
import { useProspectNotifications } from '../../hooks/useProspectNotifications'

const STATUS_TONE = {
  'Nouvelle demande': 'warning',
  Refusée: 'neutral',
  Acceptée: 'success',
  'Essai gratuit': 'info',
}

/** Offre choisie sur la page d'accueil, enregistrée en tête du message (« Offre choisie : … »). */
function chosenOffer(message) {
  const match = /^Offre choisie : ([^—\n]+)/m.exec(message || '')
  return match ? match[1].trim() : null
}

const OFFER_CODES = { 'Essai gratuit': 'trial', Starter: 'starter', Premium: 'premium' }

const TERMINAL_STATUSES = new Set(['Refusée', 'Acceptée', 'Essai gratuit'])

export default function PlatformProspectsPage() {
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [pilotStatus, setPilotStatus] = useState(null)
  const [showTest, setShowTest] = useState(false)
  const [confirm, confirmDialog] = useConfirm()
  const { refresh: refreshBadge } = useProspectNotifications()

  const refreshPilotStatus = useCallback(async () => {
    const status = await fetchBetaPilotStatus()
    setPilotStatus(status)
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const { prospects: rows, error } = await listProspects()
    if (error) {
      setLoadError(
        error.message
          || 'Impossible de lire demo_requests. Vérifiez que vous êtes Super Admin et que la migration RLS est appliquée.',
      )
      setProspects([])
    } else {
      setProspects(rows)
    }
    setLoading(false)
    refreshBadge()
    refreshPilotStatus()
  }, [refreshBadge, refreshPilotStatus])

  useEffect(() => {
    refresh()

    const channel = supabase
      .channel('platform-demo-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'demo_requests' },
        () => {
          refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const handleAccept = async (prospect) => {
    if (prospect.organization_id || TERMINAL_STATUSES.has(prospect.status)) return
    if (pilotStatus && !pilotStatus.acceptsNew) {
      setFeedback({
        type: 'error',
        message: `Limite bêta privée atteinte (${BETA_PILOT_ORG_LIMIT} auto-écoles pilotes). Supprimez une org pilote ou attendez une place.`,
        steps: null,
      })
      return
    }
    const offer = chosenOffer(prospect.message)
    const accepted = await confirm({
      title: `Accepter « ${prospect.school_name} » ?`,
      description: (
        <>
          <p>
            L’auto-école et le compte gérant ({prospect.email}) seront créés, avec un essai gratuit de 30 jours. Un lien
            sécurisé sera envoyé pour définir le mot de passe.
          </p>
          {offer && offer !== 'Essai gratuit' ? (
            <p className="mt-2">
              Offre demandée : <strong className="font-semibold text-slate-900">{offer}</strong>. Elle sera notée sur
              l’abonnement et proposée à la fin de l’essai.
            </p>
          ) : null}
        </>
      ),
      confirmLabel: 'Accepter la demande',
    })
    if (!accepted) return
    setBusyId(prospect.id)
    setFeedback(null)
    const { data, error } = await acceptProspect(prospect.id)
    setBusyId(null)
    if (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Acceptation impossible.',
        steps: null,
      })
      return
    }
    const offerCode = OFFER_CODES[offer]
    if (data?.organization_id && offerCode && offerCode !== 'trial') {
      await recordRequestedPlan(data.organization_id, offerCode)
    }
    setFeedback({
      type: 'ok',
      message: data?.email_sent
        ? `Demande acceptée. Invitation envoyée à ${prospect.email}.`
        : 'Demande acceptée.',
    })
    refresh()
  }

  const handleResendInvite = async (prospect) => {
    const resend = await confirm({
      title: 'Renvoyer l’invitation ?',
      description: `Un nouvel e-mail d’activation sera envoyé à ${prospect.email}.`,
      confirmLabel: 'Renvoyer',
    })
    if (!resend) return
    setBusyId(prospect.id)
    setFeedback(null)
    const { data, error } = await resendManagerInvite(prospect.id)
    setBusyId(null)
    if (error) {
      setFeedback({ type: 'error', message: error.message || 'Renvoi impossible.', steps: null })
      return
    }
    console.info('[platform-prospect][resend_invite]', data)
    setFeedback({
      type: 'ok',
      message: `Invitation envoyée à ${prospect.email}.`,
      debug: data,
    })
  }

  const handleRefuse = async (prospect) => {
    const refused = await confirm({
      title: `Refuser la demande de « ${prospect.school_name} » ?`,
      description: 'Aucun compte ne sera créé. La demande restera visible avec le statut « Refusée ».',
      confirmLabel: 'Refuser',
      danger: true,
    })
    if (!refused) return
    setBusyId(prospect.id)
    const { error } = await refuseProspect(prospect.id)
    setBusyId(null)
    if (error) {
      setFeedback({ type: 'error', message: error.message || 'Refus impossible.' })
      return
    }
    setFeedback({ type: 'ok', message: 'Demande refusée.' })
    refresh()
  }

  const handleDelete = async (prospect) => {
    const hasOrg = Boolean(prospect.organization_id)
    const removed = await confirm({
      title: hasOrg ? `Supprimer « ${prospect.school_name} » et son auto-école ?` : `Supprimer la demande « ${prospect.school_name} » ?`,
      description: hasOrg
        ? 'L’auto-école, tous ses comptes utilisateurs et cette demande seront supprimés définitivement.'
        : 'La demande sera supprimée définitivement.',
      confirmLabel: 'Supprimer définitivement',
      danger: true,
      requireText: hasOrg ? prospect.school_name : undefined,
      requireIdentity: hasOrg,
    })
    if (!removed) return

    setBusyId(prospect.id)
    setFeedback(null)

    if (hasOrg) {
      const { error: orgError } = await deleteOrganization(prospect.organization_id)
      if (orgError && !String(orgError.message || '').includes('déjà supprimée')) {
        setBusyId(null)
        setFeedback({ type: 'error', message: orgError.message || 'Suppression de l\'auto-école impossible.' })
        return
      }
    }

    const { error } = await deleteProspectRecord(prospect.id)
    setBusyId(null)
    if (error) {
      setFeedback({ type: 'error', message: error.message || 'Suppression impossible.' })
      return
    }

    setFeedback({
      type: 'ok',
      message: hasOrg
        ? `« ${prospect.school_name} » et son auto-école ont été supprimés.`
        : `Demande « ${prospect.school_name} » supprimée.`,
    })
    refresh()
  }

  const testCount = useMemo(() => prospects.filter(isTestProspect).length, [prospects])
  const visible = useMemo(
    () => (showTest ? prospects : prospects.filter((row) => !isTestProspect(row))),
    [prospects, showTest],
  )
  const pending = visible.filter(
    (row) => !row.organization_id && !TERMINAL_STATUSES.has(row.status),
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        description="Demandes envoyées depuis le formulaire de la page d’accueil. Aucun compte n’est créé tant qu’une demande n’est pas acceptée."
        title="Demandes de démonstration"
      />

      {pilotStatus && (
        <Notice tone={pilotStatus.acceptsNew ? 'info' : 'warning'}>
          Bêta privée : {pilotStatus.used ?? 0} place{(pilotStatus.used ?? 0) > 1 ? 's' : ''} pilote
          {(pilotStatus.used ?? 0) > 1 ? 's' : ''} utilisée{(pilotStatus.used ?? 0) > 1 ? 's' : ''} sur{' '}
          {pilotStatus.limit ?? BETA_PILOT_ORG_LIMIT}
          {typeof pilotStatus.remaining === 'number' && (
            <>
              , {pilotStatus.remaining} restante{pilotStatus.remaining > 1 ? 's' : ''}
            </>
          )}
          .
        </Notice>
      )}

      {loadError && <Notice tone="danger">{loadError}</Notice>}

      {feedback && (
        <Notice tone={feedback.type === 'ok' ? 'success' : 'danger'}>
          <p className="whitespace-pre-wrap">{feedback.message}</p>
          {feedback.debug && (
            <details className="mt-2 text-xs text-slate-700">
              <summary className="cursor-pointer font-medium">Détails techniques de l’envoi</summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-white/70 p-3">
                {JSON.stringify(feedback.debug, null, 2)}
              </pre>
            </details>
          )}
          {feedback.type === 'error' && feedback.steps && (
            <pre className="mt-2 overflow-x-auto rounded-md bg-white/70 p-3 text-xs text-slate-700">{feedback.steps}</pre>
          )}
        </Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <span className="font-medium text-slate-900">
            {pending.length} demande{pending.length > 1 ? 's' : ''} à traiter
          </span>{' '}
          sur {visible.length} au total
        </p>
        {testCount > 0 && <TestDataToggle checked={showTest} count={testCount} onChange={setShowTest} />}
      </div>

      <div className={ui.tableWrap}>
        <table className={`${ui.table} min-w-[1080px]`}>
          <thead>
            <tr>
              <th className={ui.th}>Auto-école</th>
              <th className={ui.th}>Contact</th>
              <th className={ui.th}>Offre</th>
              <th className={ui.th}>Reçue le</th>
              <th className={ui.th}>Statut</th>
              <th className={`${ui.th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className={ui.tdEmpty} colSpan={6}>
                  Chargement…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td className={ui.tdEmpty} colSpan={6}>
                  {loadError ? 'Les demandes n’ont pas pu être lues.' : 'Aucune demande pour le moment.'}
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const status = row.status || 'Nouvelle demande'
                const canAct = !row.organization_id && !TERMINAL_STATUSES.has(status)
                const isBusy = busyId === row.id
                return (
                  <tr className={ui.tr} key={row.id}>
                    <td className={`${ui.tdStrong} min-w-[12rem]`}>
                      {row.school_name}
                      {isTestProspect(row) && (
                        <span className="ml-2 align-middle">
                          <StatusBadge>Test</StatusBadge>
                        </span>
                      )}
                    </td>
                    <td className={ui.td}>
                      <p className="text-slate-900">{row.contact_name}</p>
                      <p className="text-xs text-slate-500">
                        <a className="text-[#1769FF] hover:underline" href={`mailto:${row.email}`}>
                          {row.email}
                        </a>
                        {row.phone ? <> · {row.phone}</> : null}
                      </p>
                    </td>
                    <td className={ui.td}>{chosenOffer(row.message) || '—'}</td>
                    <td className={`${ui.tdMuted} whitespace-nowrap tabular-nums`}>{formatPlatformDateTime(row.created_at)}</td>
                    <td className={ui.td}>
                      <StatusBadge tone={STATUS_TONE[status] || 'neutral'}>{status}</StatusBadge>
                    </td>
                    <td className={ui.td}>
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        {canAct ? (
                          <>
                            <button
                              className={ui.btnSmallPrimary}
                              disabled={isBusy || (pilotStatus && !pilotStatus.acceptsNew)}
                              onClick={() => handleAccept(row)}
                              title={pilotStatus && !pilotStatus.acceptsNew ? 'Limite de la bêta privée atteinte' : undefined}
                              type="button"
                            >
                              Accepter
                            </button>
                            <button className={ui.btnSmall} disabled={isBusy} onClick={() => handleRefuse(row)} type="button">
                              Refuser
                            </button>
                          </>
                        ) : status === 'Acceptée' || status === 'Essai gratuit' ? (
                          <button className={ui.btnSmall} disabled={isBusy} onClick={() => handleResendInvite(row)} type="button">
                            Renvoyer l’invitation
                          </button>
                        ) : null}
                        <button className={ui.btnSmallDanger} disabled={isBusy} onClick={() => handleDelete(row)} type="button">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {confirmDialog}
    </div>
  )
}
