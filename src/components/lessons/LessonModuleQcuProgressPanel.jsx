import { useEffect, useState } from 'react'
import {
  fetchLatestPassedQcu,
  formatQcuValidatedAt,
  QCU_PASS_PERCENTAGE,
} from '../../services/lessonModuleProgress'

export default function LessonModuleQcuProgressPanel({ studentId }) {
  const [latest, setLatest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setLatest(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    fetchLatestPassedQcu(studentId).then(({ latest: row }) => {
      if (cancelled) return
      setLatest(row)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement du dernier QCU…</p>
  }

  if (!latest) {
    return (
      <p className="text-sm text-slate-500">
        Aucun QCU validé pour le moment (seuil {QCU_PASS_PERCENTAGE} %, minimum 8/10).
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
      <p className="text-xs font-semibold text-emerald-700">
        Dernier QCU travaillé et réussi
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {latest.moduleTitle || latest.moduleId || 'Module'}
          </p>
          {latest.moduleTitle && latest.moduleId && (
            <p className="mt-0.5 text-sm font-semibold text-slate-500">{latest.moduleId}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-400">Score</p>
            <p className="mt-1 font-semibold text-slate-900">
              {latest.score}/{latest.total ?? '—'} ({latest.percentage ?? '—'} %)
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Validé le</p>
            <p className="mt-1 font-semibold text-emerald-800">
              {formatQcuValidatedAt(latest.qcuValidatedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
