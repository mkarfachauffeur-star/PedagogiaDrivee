import { useCallback, useEffect, useState } from 'react'
import PageHero from '../../components/ui/PageHero'
import {
  createOrganization,
  deleteOrganization,
  listAllOrganizations,
  updateOrganizationStatus,
} from '../../services/platform'

const STATUS_LABELS = {
  trial: 'Essai',
  active: 'Active',
  suspended: 'Suspendue',
  cancelled: 'Annulée',
}

export default function PlatformOrganizationsPage() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { organizations: rows } = await listAllOrganizations()
    setOrganizations(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const setStatus = async (orgId, status) => {
    await updateOrganizationStatus(orgId, status)
    refresh()
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    setFeedback(null)
    const { organizationId, error } = await createOrganization(form)
    setCreating(false)
    if (error) {
      setFeedback({ type: 'error', message: error.message || 'Création impossible.' })
      return
    }
    setFeedback({ type: 'ok', message: `Auto-école créée (${organizationId}).` })
    setForm({ name: '', email: '', phone: '' })
    refresh()
  }

  const handleDelete = async (org) => {
    if (!window.confirm(`Supprimer définitivement « ${org.name} » et tous ses comptes ?`)) return
    const { error } = await deleteOrganization(org.id)
    if (error) {
      window.alert(error.message || 'Suppression impossible.')
      return
    }
    refresh()
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHero
        eyebrow="Super Admin"
        title="Auto-écoles"
        subtitle="Créer, suspendre ou supprimer des établissements. Aucune auto-école rattachée à votre compte."
      />

      <section className="rounded-2xl border-2 border-slate-300 bg-white p-5">
        <h2 className="text-lg font-extrabold text-slate-950">Créer une auto-école</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" onSubmit={handleCreate}>
          <input
            className="rounded-xl border-2 border-slate-300 px-3 py-2 text-sm"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nom de l'auto-école *"
            required
            value={form.name}
          />
          <input
            className="rounded-xl border-2 border-slate-300 px-3 py-2 text-sm"
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="E-mail"
            type="email"
            value={form.email}
          />
          <input
            className="rounded-xl border-2 border-slate-300 px-3 py-2 text-sm"
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Téléphone"
            value={form.phone}
          />
          <button
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-black text-white sm:col-span-3 sm:w-fit"
            disabled={creating}
            type="submit"
          >
            {creating ? 'Création…' : 'Créer l\'auto-école (essai 30 j)'}
          </button>
        </form>
        {feedback && (
          <p className={`mt-3 text-sm font-semibold ${feedback.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
            {feedback.message}
          </p>
        )}
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border-2 border-slate-300 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs font-black uppercase text-slate-400">
                <th className="p-4">Nom</th>
                <th className="p-4">E-mail</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Abonnement</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-b-2 border-slate-200">
                  <td className="p-4 font-bold">{org.name}</td>
                  <td className="p-4 text-slate-600">{org.email || '—'}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black">
                      {STATUS_LABELS[org.status] || org.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">
                    {(() => {
                      const sub = Array.isArray(org.subscriptions) ? org.subscriptions[0] : org.subscriptions
                      return (
                        <>
                          {sub?.plan?.name || '—'}
                          {sub?.trial_ends_at && (
                            <span className="block text-xs">
                              Fin essai : {new Date(sub.trial_ends_at).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </>
                      )
                    })()}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {org.status !== 'active' && org.status !== 'trial' && (
                        <button className="text-xs font-bold text-emerald-600" onClick={() => setStatus(org.id, 'active')} type="button">
                          Activer
                        </button>
                      )}
                      {org.status !== 'suspended' && (
                        <button className="text-xs font-bold text-amber-600" onClick={() => setStatus(org.id, 'suspended')} type="button">
                          Suspendre
                        </button>
                      )}
                      {org.status !== 'cancelled' && (
                        <button className="text-xs font-bold text-rose-600" onClick={() => setStatus(org.id, 'cancelled')} type="button">
                          Annuler
                        </button>
                      )}
                      <button className="text-xs font-bold text-slate-700 underline" onClick={() => handleDelete(org)} type="button">
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
