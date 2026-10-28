import { useEffect, useState } from 'react'
import { fetchStudentCharterAcceptance, formatCharterAcceptedAt } from '../../services/studentCharter'

export default function StudentCharterStatusBadge({ studentId }) {
  const [acceptance, setAcceptance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setAcceptance(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    fetchStudentCharterAcceptance(studentId).then(({ acceptance: row }) => {
      if (cancelled) return
      setAcceptance(row)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loading) return null
  if (!acceptance) return null

  if (acceptance.accepted) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        Charte acceptée · {formatCharterAcceptedAt(acceptance.acceptedAt)}
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
      Charte en attente (v{acceptance.charterVersionNumber || '?'})
    </span>
  )
}
