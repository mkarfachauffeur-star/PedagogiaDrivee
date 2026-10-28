import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSecretaryDuties } from '../../hooks/useSecretaryDuties'
import PageHeader from '../../components/ui/PageHeader'
import { ui } from '../../components/ui/styles'
import AppModal from '../../components/ui/AppModal'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { formatDateFr } from '../../lib/staffAccounts'
import {
  computeDurationMinutes,
  formatDurationLabel,
  formatTimeFr,
  getSessionStatusLabel,
  getSupervisorModeLabel,
  SIMULATOR_SESSION_STATUS_BADGE,
  SIMULATOR_SESSION_STATUSES,
  validateSimulatorSessionForm,
} from '../../lib/simulatorSessions'
import { getUserFacingError } from '../../lib/userFacingError'
import {
  cancelSimulatorSession,
  createSimulatorSession,
  deleteSimulatorSession,
  listSimulatorSessions,
  loadSimulatorSessionFormOptions,
  subscribeSimulatorSessions,
  updateSimulatorSession,
} from '../../services/simulatorSessions'

const FORM_ID = 'simulator-session-form'
const inputClass =
  'mt-2 min-h-11 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100'

function emptyForm(profileId = '') {
  return {
    id: '',
    studentId: '',
    simulatorId: '',
    supervisorId: profileId,
    sessionDate: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
    status: SIMULATOR_SESSION_STATUSES.PLANNED,
  }
}

function sessionToForm(session) {
  return {
    id: session.id,
    studentId: session.studentId,
    simulatorId: session.simulatorId,
    supervisorId: session.supervisorId,
    sessionDate: session.sessionDate,
    startTime: formatTimeFr(session.startTime),
    endTime: formatTimeFr(session.endTime),
    notes: session.notes || '',
    status: session.status,
  }
}

function studentLabel(session) {
  return `${session.studentLastName || ''} ${session.studentFirstName || ''}`.trim()
    || session.studentFileNumber
    || 'Élève'
}

export default function SimulatorSessionsPage({ readOnly = false }) {
  const { profileId, organizationId, role } = useAuth()
  const { canDoSecretaryTasks } = useSecretaryDuties()
  // Planifier les séances relève du secrétariat (ou du gérant s'il n'y a pas de secrétaire).
  const canManage = canDoSecretaryTasks && !readOnly
  const canDelete = canManage

  const [sessions, setSessions] = useState([])
  const [options, setOptions] = useState({
    supervisorMode: 'admin_supervisor',
    simulators: [],
    students: [],
    supervisors: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [actionBusy, setActionBusy] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [formAlert, setFormAlert] = useState(null)
  const formAlertRef = useRef(null)

  useEffect(() => {
    if (formAlert && formAlertRef.current) {
      formAlertRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [formAlert])

  const applyFormOptions = useCallback((formOptions) => {
    if (!formOptions || formOptions.error) return false
    setOptions({
      supervisorMode: formOptions.supervisorMode,
      simulators: formOptions.simulators,
      students: formOptions.students,
      supervisors: formOptions.supervisors,
    })
    return true
  }, [])

  const refresh = useCallback(async () => {
    if (!profileId) {
      setSessions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    const [{ sessions: rows, error }, formOptions] = await Promise.all([
      listSimulatorSessions({ dateFrom, dateTo }),
      canManage ? loadSimulatorSessionFormOptions() : Promise.resolve(null),
    ])
    if (error) setLoadError('Impossible de charger les séances simulateur.')
    setSessions(rows)
    if (formOptions) applyFormOptions(formOptions)
    setLoading(false)
  }, [profileId, dateFrom, dateTo, canManage, applyFormOptions])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!modalOpen || form.supervisorId || !profileId) return
    if (options.supervisors.some((supervisor) => supervisor.id === profileId)) {
      setForm((current) => ({ ...current, supervisorId: profileId }))
    }
  }, [modalOpen, form.supervisorId, profileId, options.supervisors])

  useEffect(() => {
    if (!profileId) return undefined
    return subscribeSimulatorSessions(refresh)
  }, [profileId, refresh])

  const durationPreview = useMemo(
    () => computeDurationMinutes(form.startTime, form.endTime),
    [form.startTime, form.endTime],
  )

  const ensureFormOptions = useCallback(async () => {
    if (!canManage) return
    if (options.students.length && options.simulators.length && options.supervisors.length) return
    const formOptions = await loadSimulatorSessionFormOptions()
    applyFormOptions(formOptions)
  }, [canManage, options.students.length, options.simulators.length, options.supervisors.length, applyFormOptions])

  const openCreate = async () => {
    setForm(emptyForm(canManage && role !== 'teacher' ? profileId : ''))
    setErrors({})
    setFormAlert(null)
    setModalOpen(true)
    await ensureFormOptions()
  }

  const openEdit = async (session) => {
    if (!canManage || session.status === SIMULATOR_SESSION_STATUSES.COMPLETED) return
    setForm(sessionToForm(session))
    setErrors({})
    setFormAlert(null)
    setModalOpen(true)
    await ensureFormOptions()
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: null }))
    setFormAlert(null)
  }

  const saveSession = async (event) => {
    event?.preventDefault()
    if (!canManage) {
      setFormAlert('Vous n’avez pas les droits pour enregistrer une séance simulateur.')
      return
    }
    if (!organizationId) {
      setFormAlert('Organisation introuvable. Reconnectez-vous puis réessayez.')
      return
    }

    const nextErrors = validateSimulatorSessionForm(form, options.supervisorMode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setFormAlert(Object.values(nextErrors).join(' · '))
      return
    }

    setFormAlert(null)
    setSaving(true)
    setFeedback(null)

    const action = form.id
      ? updateSimulatorSession(form.id, form)
      : createSimulatorSession({
        organizationId,
        profileId,
        payload: form,
        supervisorMode: options.supervisorMode,
      })

    const { error } = await action
    setSaving(false)

    if (error) {
      setFormAlert(getUserFacingError(error, 'save'))
      return
    }

    setModalOpen(false)
    setFeedback({ type: 'ok', text: form.id ? 'Séance mise à jour.' : 'Séance simulateur enregistrée.' })
    refresh()
  }

  const runCancel = async (session) => {
    if (!canManage) return
    if (!window.confirm('Annuler cette séance simulateur ?')) return
    setActionBusy(`${session.id}-cancel`)
    const { error } = await cancelSimulatorSession(session.id)
    setActionBusy(null)
    if (error) setFeedback({ type: 'error', text: getUserFacingError(error, 'save') })
    else {
      setFeedback({ type: 'ok', text: 'Séance annulée.' })
      refresh()
    }
  }

  const runDelete = async (session) => {
    if (!canDelete) return
    if (!window.confirm('Supprimer définitivement cette séance ?')) return
    setActionBusy(`${session.id}-delete`)
    const { error } = await deleteSimulatorSession(session.id)
    setActionBusy(null)
    if (error) setFeedback({ type: 'error', text: getUserFacingError(error, 'permission') })
    else {
      setFeedback({ type: 'ok', text: 'Séance supprimée.' })
      refresh()
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHeader
        actions={
          canManage ? (
            <button className={ui.btnPrimary} onClick={openCreate} type="button">
              Nouvelle séance
            </button>
          ) : null
        }
        description={
          readOnly
            ? 'Les séances sur simulateur : élève, poste, encadrant, horaires et durée.'
            : `Planification et suivi des séances — mode ${getSupervisorModeLabel(options.supervisorMode).toLowerCase()}.`
        }
        title="Séances simulateur"
      />

      {feedback && (
        <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${feedback.type === 'ok' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}>
          {feedback.text}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Du
              <input className={inputClass} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Au
              <input className={inputClass} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
          </div>
          {!readOnly && (
            <p className="text-sm font-medium text-slate-500">
              Encadrement : <span className="font-semibold text-slate-800">{getSupervisorModeLabel(options.supervisorMode)}</span>
            </p>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {!profileId ? (
          <div className="p-5"><EmptyState title="Connexion requise" message="Connectez-vous pour accéder aux séances simulateur." icon="🖥️" /></div>
        ) : loading ? (
          <p className="p-5 text-sm font-medium text-slate-500">Chargement des séances…</p>
        ) : loadError ? (
          <div className="p-5"><EmptyState title="Erreur de chargement" message={loadError} icon="⚠️" /></div>
        ) : sessions.length === 0 ? (
          <div className="p-5"><EmptyState title="Aucune séance" message="Aucune séance simulateur sur la période sélectionnée." icon="🖥️" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Horaires</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Simulateur</th>
                  <th className="px-4 py-3">N° autorisation</th>
                  <th className="px-4 py-3">Encadrant</th>
                  <th className="px-4 py-3">Statut</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const busy = actionBusy === session.id
                    || actionBusy === `${session.id}-cancel`
                    || actionBusy === `${session.id}-delete`
                  const editable = canManage
                    && session.status !== SIMULATOR_SESSION_STATUSES.COMPLETED
                    && session.status !== SIMULATOR_SESSION_STATUSES.CANCELLED

                  return (
                    <tr key={session.id} className="border-b border-slate-200 last:border-0">
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatDateFr(session.sessionDate)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatTimeFr(session.startTime)} – {formatTimeFr(session.endTime)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDurationLabel(session.durationMinutes)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{studentLabel(session)}</td>
                      <td className="px-4 py-3 text-slate-600">{session.simulatorName || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{session.simulatorAuthorizationNumber || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{session.supervisorName || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${SIMULATOR_SESSION_STATUS_BADGE[session.status] || SIMULATOR_SESSION_STATUS_BADGE.planned}`}>
                          {getSessionStatusLabel(session.status)}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {editable && <ActionBtn label="Modifier" onClick={() => openEdit(session)} disabled={busy} />}
                            {editable && (
                              <ActionBtn label="Annuler" tone="amber" onClick={() => runCancel(session)} disabled={busy} />
                            )}
                            {canDelete && (
                              <ActionBtn label="Supprimer" tone="rose" onClick={() => runDelete(session)} disabled={busy} />
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AppModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        disableClose={saving}
        eyebrow="Séance simulateur"
        title={form.id ? 'Modifier la séance' : 'Nouvelle séance simulateur'}
        size="lg"
      >
        <form id={FORM_ID} className="space-y-5" onSubmit={saveSession}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Élève</span>
              <select className={inputClass} value={form.studentId} onChange={(e) => updateField('studentId', e.target.value)}>
                <option value="">Sélectionner…</option>
                {options.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.label}{student.file_number ? ` — ${student.file_number}` : ''}
                  </option>
                ))}
              </select>
              {errors.studentId && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.studentId}</p>}
              {!options.students.length && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Aucun élève disponible. Créez d&apos;abord un dossier élève depuis Inscriptions.
                </p>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Simulateur</span>
              <select className={inputClass} value={form.simulatorId} onChange={(e) => updateField('simulatorId', e.target.value)}>
                <option value="">Sélectionner…</option>
                {options.simulators.map((simulator) => (
                  <option key={simulator.id} value={simulator.id}>
                    {simulator.label}{simulator.authorization_number ? ` — ${simulator.authorization_number}` : ''}
                  </option>
                ))}
              </select>
              {errors.simulatorId && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.simulatorId}</p>}
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Encadrant</span>
            <select className={inputClass} value={form.supervisorId} onChange={(e) => updateField('supervisorId', e.target.value)}>
              <option value="">Sélectionner…</option>
              {options.supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>{supervisor.label}</option>
              ))}
            </select>
            {errors.supervisorId && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.supervisorId}</p>}
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Date</span>
              <input className={inputClass} type="date" value={form.sessionDate} onChange={(e) => updateField('sessionDate', e.target.value)} />
              {errors.sessionDate && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.sessionDate}</p>}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Heure début</span>
              <input className={inputClass} type="time" value={form.startTime} onChange={(e) => updateField('startTime', e.target.value)} />
              {errors.startTime && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.startTime}</p>}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Heure fin</span>
              <input className={inputClass} type="time" value={form.endTime} onChange={(e) => updateField('endTime', e.target.value)} />
              {errors.endTime && <p className="mt-1 text-xs font-semibold text-rose-600">{errors.endTime}</p>}
            </label>
          </div>

          <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
            Durée calculée : {formatDurationLabel(durationPreview) || '—'}
          </p>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Notes (optionnel)</span>
            <textarea
              className={`${inputClass} min-h-24 resize-y`}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </label>

          {formAlert && (
            <p
              ref={formAlertRef}
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
            >
              {formAlert}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => setModalOpen(false)}
              className="pd-btn-secondary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="pd-btn-primary w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : form.id ? 'Enregistrer' : 'Valider la séance'}
            </button>
          </div>
        </form>
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
      className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${tones[tone]}`}
    >
      {label}
    </button>
  )
}
