import { useEffect, useState } from 'react'
import { fetchPublicPlans } from '../../services/publicPlans'

function planLabel(code) {
  if (code === 'trial') return 'Essai gratuit'
  if (code === 'starter') return 'Starter'
  if (code === 'premium') return 'Premium'
  return code
}

export default function LegalPlanCatalog() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPublicPlans().then(({ plans: rows, error: fetchError }) => {
      setPlans(rows)
      setError(fetchError)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <p className="text-slate-500">Chargement des tarifs en vigueur…</p>
  }

  if (error || !plans.length) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
        Les tarifs affichés sur la plateforme au moment de la souscription font foi. Contactez-nous pour
        obtenir le détail des offres en cours.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[320px] text-left text-sm">
        <caption className="sr-only">Offres d&apos;abonnement Pedagogia Drive</caption>
        <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
          <tr>
            <th className="p-3" scope="col">
              Offre
            </th>
            <th className="p-3" scope="col">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr className="border-t border-slate-200" key={plan.code}>
              <td className="p-3 font-semibold text-slate-900">{planLabel(plan.code)}</td>
              <td className="p-3 text-slate-600">{plan.description || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
