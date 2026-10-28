import LoadingSpinner from './ui/LoadingSpinner'
import PageShell from './ui/PageShell'
import EmptyState from './ui/EmptyState'
import { useStudentAccount } from '../hooks/useStudentAccount'

function ErrorDetail({ label, value }) {
  if (!value) return null
  return (
    <p className="text-xs text-rose-800">
      <span className="font-semibold">{label} :</span>{' '}
      {typeof value === 'string' ? value : JSON.stringify(value)}
    </p>
  )
}

export default function StudentAccountGate({ children }) {
  const {
    userEmail,
    profileId,
    profile,
    student,
    loading,
    issue,
    profileError,
    studentError,
  } = useStudentAccount()

  if (loading) {
    return <LoadingSpinner label="Chargement de votre espace élève…" />
  }

  if (issue) {
    console.error('[StudentAccountGate] Compte incomplet ou erreur', {
      issue,
      profileId,
      userEmail,
      profile,
      student,
      profileError,
      studentError,
    })

    return (
      <PageShell>
        <EmptyState
          icon="⚠️"
          title="Espace élève indisponible"
          message={issue.message}
          className="border-rose-200 bg-rose-50/80"
        />
        <div className="rounded-2xl border border-rose-200 bg-white p-4 text-left shadow-sm">
          <p className="text-sm font-semibold text-rose-900">Détails techniques</p>
          <div className="mt-3 space-y-1 font-mono text-xs text-rose-800">
            <ErrorDetail label="Code" value={issue.code} />
            <ErrorDetail label="User ID" value={profileId} />
            <ErrorDetail label="E-mail" value={userEmail} />
            <ErrorDetail label="Profil trouvé" value={profile ? 'oui' : 'non'} />
            <ErrorDetail label="Dossier élève trouvé" value={student ? 'oui' : 'non'} />
            {issue.detail && typeof issue.detail === 'string' && (
              <ErrorDetail label="Info" value={issue.detail} />
            )}
            {profileError && (
              <>
                <ErrorDetail label="Erreur profiles" value={profileError.message} />
                <ErrorDetail label="Code Supabase (profiles)" value={profileError.code} />
              </>
            )}
            {studentError && (
              <>
                <ErrorDetail label="Erreur students" value={studentError.message} />
                <ErrorDetail label="Code Supabase (students)" value={studentError.code} />
              </>
            )}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Ces informations sont visibles pour faciliter le diagnostic. Transmettez-les au secrétariat ou au support si besoin.
          </p>
        </div>
      </PageShell>
    )
  }

  return children
}
