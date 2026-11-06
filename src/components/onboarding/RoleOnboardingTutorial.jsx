import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Car,
  CheckCircle2,
  CreditCard,
  MessagesSquare,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react'
import AppModal, { AppModalFooter } from '../ui/AppModal'
import { useAuth } from '../../context/AuthContext'
import { ROLE_ONBOARDING_STEPS, completeRoleOnboarding, shouldShowRoleOnboarding } from '../../lib/roleOnboarding'

const STEP_ICONS = {
  welcome: Sparkles,
  students: UserPlus,
  planning: CalendarDays,
  payments: CreditCard,
  messages: MessagesSquare,
  lessons: BookOpen,
  aac: Car,
  team: Users,
  done: CheckCircle2,
}

/** Tutoriel de première connexion du secrétariat, des enseignants et des élèves. */
export default function RoleOnboardingTutorial() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const steps = ROLE_ONBOARDING_STEPS[role] || null
  const [dismissed, setDismissed] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [busy, setBusy] = useState(false)

  const open = Boolean(steps) && !dismissed && shouldShowRoleOnboarding(user)

  const finish = useCallback(
    async (nextHref) => {
      setBusy(true)
      try {
        await completeRoleOnboarding()
      } catch (err) {
        console.warn('[RoleOnboardingTutorial] complete failed', err)
      } finally {
        setBusy(false)
        setDismissed(true)
        if (nextHref) navigate(nextHref)
      }
    },
    [navigate],
  )

  if (!open) return null

  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1
  const StepIcon = STEP_ICONS[step.id] || Sparkles
  const next = () => (isLast ? void finish(null) : setStepIndex((index) => Math.min(index + 1, steps.length - 1)))

  return (
    <AppModal
      ariaLabel="Tutoriel de première connexion"
      closeOnBackdrop={false}
      eyebrow="Première connexion"
      footer={
        <AppModalFooter closeLabel="Passer le tutoriel" hideSubmit onClose={() => void finish(null)}>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {!isFirst && (
                <button className="pd-btn-secondary w-full sm:w-auto" disabled={busy} onClick={() => setStepIndex((index) => Math.max(index - 1, 0))} type="button">
                  Précédent
                </button>
              )}
              {step.href ? (
                <button className="pd-btn-primary w-full sm:w-auto" disabled={busy} onClick={() => void finish(step.href)} type="button">
                  {step.cta || 'Ouvrir la page'}
                </button>
              ) : (
                <button className="pd-btn-primary w-full sm:w-auto" disabled={busy} onClick={next} type="button">
                  {isLast ? 'Commencer' : 'Suivant'}
                </button>
              )}
            </div>
            {!isLast && step.href && (
              <button className="text-sm font-semibold text-blue-700 hover:text-blue-900" disabled={busy} onClick={next} type="button">
                Continuer sans ouvrir
              </button>
            )}
          </div>
        </AppModalFooter>
      }
      onClose={() => void finish(null)}
      open
      size="lg"
      subtitle={`Étape ${stepIndex + 1} sur ${steps.length}`}
      title={step.title}
    >
      <div className="flex flex-col gap-5">
        <div aria-hidden className="flex items-center gap-1.5">
          {steps.map((item, index) => (
            <span
              className={`h-1.5 flex-1 rounded-full transition-colors ${index <= stepIndex ? 'bg-[#1769FF]' : 'bg-slate-200'}`}
              key={item.id}
            />
          ))}
        </div>
        <div className="flex gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#1769FF]/10 text-[#1769FF]">
            <StepIcon aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="min-w-0 text-[15px] leading-7 text-slate-700">{step.description}</p>
        </div>
      </div>
    </AppModal>
  )
}
