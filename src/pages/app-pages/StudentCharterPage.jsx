import { useEffect, useState } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import PageShell from '../../components/ui/PageShell'
import CharterContentView from '../../components/students/CharterContentView'
import { useStudentAccount } from '../../hooks/useStudentAccount'
import {
  fetchStudentCharterStatus,
  formatCharterAcceptedAt,
} from '../../services/studentCharter'

export default function StudentCharterPage() {
  const { student, loading: accountLoading } = useStudentAccount()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (accountLoading || !student?.id) return undefined

    let cancelled = false
    fetchStudentCharterStatus().then(({ status: nextStatus }) => {
      if (cancelled) return
      setStatus(nextStatus)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [accountLoading, student?.id])

  if (accountLoading || (student?.id && loading)) {
    return (
      <PageShell>
        <p className="text-sm font-semibold text-slate-500">Chargement de la charte…</p>
      </PageShell>
    )
  }

  return (
    <PageShell className="pb-[max(3rem,calc(env(safe-area-inset-bottom,0px)+2.5rem))]">
      <PageHeader description="Les engagements de votre formation, consultables à tout moment." title="Charte d’engagement" />

      {status?.acceptance?.acceptedAt && (
        <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Acceptée le {formatCharterAcceptedAt(status.acceptance.acceptedAt)}
          {status.charter?.versionNumber ? ` · version ${status.charter.versionNumber}` : ''}
        </p>
      )}

      {status?.needsAcceptance && (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Une nouvelle version de la charte nécessite votre acceptation avant d&apos;utiliser la plateforme.
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
        {status?.charter?.content ? (
          <CharterContentView content={status.charter.content} />
        ) : (
          <p className="text-sm font-semibold text-slate-500">
            Aucune charte n&apos;est disponible pour le moment.
          </p>
        )}
      </section>
    </PageShell>
  )
}
