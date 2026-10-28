import { useMemo } from 'react'
import AacPanel from '../../components/aac/AacPanel'
import EmptyState from '../../components/ui/EmptyState'
import PageHeader from '../../components/ui/PageHeader'
import PageShell from '../../components/ui/PageShell'
import { useAuth } from '../../context/AuthContext'
import { useStudentAccount } from '../../hooks/useStudentAccount'
import { formatPersonName } from '../../lib/staffAccounts'
import { isAacFormation } from '../../lib/studentTrack'

function isAccompaniedFormation(formationType = '') {
  return (
    formationType.includes('AAC')
    || formationType.toLowerCase().includes('accompagn')
    || formationType.toLowerCase().includes('supervis')
  )
}

export default function StudentAccompaniedDrivingPage() {
  const { student: studentRecord, loading: accountLoading } = useStudentAccount()
  const { organizationId, user, profile } = useAuth()

  const student = useMemo(() => {
    if (!studentRecord) return null
    return {
      id: studentRecord.id,
      firstName: studentRecord.first_name,
      lastName: studentRecord.last_name,
      formationType: studentRecord.package_name || studentRecord.formation_type || 'Permis B traditionnel',
      birthDate: studentRecord.birth_date,
      organizationId: studentRecord.organization_id || organizationId,
    }
  }, [studentRecord, organizationId])

  const isAac = isAacFormation(studentRecord) || isAccompaniedFormation(student?.formationType || '')

  if (accountLoading) {
    return (
      <PageShell>
        <p className="text-sm font-semibold text-slate-500">Chargement du suivi…</p>
      </PageShell>
    )
  }

  if (!student) {
    return (
      <PageShell>
        <EmptyState
          title="Aucune donnée disponible"
          message="Le suivi s’activera dès l’ajout de votre dossier de conduite accompagnée."
        />
      </PageShell>
    )
  }

  if (!isAac) {
    return (
      <PageShell>
        <PageHeader description="Cet espace est réservé aux élèves en conduite accompagnée." title="Conduite accompagnée" />
        <section className="pd-section-card pd-section-card-body">
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Contactez le secrétariat si vous souhaitez basculer sur cette formule.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Formule actuelle : <span className="font-semibold text-slate-800">{student.formationType}</span>
          </p>
        </section>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader description="Vos kilomètres, vos trajets et vos rendez-vous pédagogiques." title="Conduite accompagnée" />
      <AacPanel
        birthDate={student.birthDate}
        mode="student"
        organizationId={student.organizationId}
        senderName={formatPersonName(profile || student)}
        studentId={student.id}
        userId={user?.id}
      />
    </PageShell>
  )
}
